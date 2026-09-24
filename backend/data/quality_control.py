"""
ConvectNow — Automated Radar & Multi-Sensor Quality Control (QC) Pipeline
Implements:
1. Ground Clutter Rejection via Texture of Reflectivity (TDBZ > 18 dB)
2. Satellite Anomalous Propagation (AP) Ducting Gating (cross-sensor thermal check Tb > 280 K)
3. Farnebäck Bi-Directional Optical-Flow Missing Frame Imputation
4. Partial Beam Blockage & Radial Gap Inpainting
"""

import numpy as np
import scipy.ndimage
from scipy.ndimage import map_coordinates, uniform_filter, binary_opening
import cv2
from typing import Dict, Tuple, Optional, Union


class QualityControlFilter:
    """
    Automated meteorological quality control filter for Doppler Weather Radar (DWR)
    and satellite multispectral composites.
    """

    def __init__(
        self,
        tdbz_threshold_db: float = 18.0,
        tdbz_window_size: int = 3,
        ap_tb_threshold_k: float = 280.0,
        ap_dbz_threshold: float = 20.0,
        min_meteorological_dbz: float = 5.0,
        max_valid_dbz: float = 75.0
    ):
        """
        Args:
            tdbz_threshold_db: Standard deviation threshold in dB to flag ground clutter (default 18.0 dB)
            tdbz_window_size: Local spatial kernel size for texture calculation (default 3x3)
            ap_tb_threshold_k: Satellite brightness temperature threshold (K) above which radar echoes are flagged as AP
            ap_dbz_threshold: Radar reflectivity threshold (dBZ) for AP gating check
            min_meteorological_dbz: Minimum credible echo
            max_valid_dbz: Physical maximum meteorological reflectivity ceiling
        """
        self.tdbz_threshold_db = tdbz_threshold_db
        self.tdbz_window_size = tdbz_window_size
        self.ap_tb_threshold_k = ap_tb_threshold_k
        self.ap_dbz_threshold = ap_dbz_threshold
        self.min_meteorological_dbz = min_meteorological_dbz
        self.max_valid_dbz = max_valid_dbz

    def compute_tdbz_texture(self, dbz: np.ndarray) -> np.ndarray:
        """
        Computes the Texture of Reflectivity (TDBZ) combining RMS neighbor difference
        and local spatial sample standard deviation.

        Meteorological precipitation exhibits smooth, coherent spatial gradients (TDBZ < 10-15 dB),
        whereas anomalous non-meteorological ground clutter (terrain, towers, point targets) exhibits
        erratic high-frequency variance (TDBZ > 18 dB).
        """
        clean_dbz = np.nan_to_num(dbz, nan=0.0, posinf=self.max_valid_dbz, neginf=0.0)
        size = self.tdbz_window_size
        N = float(size * size)

        # 1. RMS difference from local spatial neighbors
        kernel = np.ones((size, size), dtype=np.float32)
        center = size // 2
        kernel[center, center] = 0.0
        kernel /= np.sum(kernel)

        mean_nbr = scipy.ndimage.convolve(clean_dbz, kernel, mode='reflect')
        mean_sq_nbr = scipy.ndimage.convolve(clean_dbz**2, kernel, mode='reflect')
        rms_diff = np.sqrt(np.maximum(0.0, clean_dbz**2 - 2.0 * clean_dbz * mean_nbr + mean_sq_nbr))

        # 2. Local sample standard deviation with Bessel's correction factor N / (N - 1)
        u1 = uniform_filter(clean_dbz, size=size, mode='reflect')
        u2 = uniform_filter(clean_dbz**2, size=size, mode='reflect')
        var = (N / (N - 1.0)) * np.maximum(0.0, u2 - u1**2)
        std = np.sqrt(var)

        # Texture metric is the maximum of RMS neighbor variation and local sample std
        tdbz = np.maximum(rms_diff, std)
        return tdbz

    def filter_ground_clutter(
        self,
        dbz: np.ndarray,
        replace_with_median: bool = False
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Detects and rejects ground clutter returns using the TDBZ metric.

        Args:
            dbz: 2D reflectivity grid (dBZ)
            replace_with_median: If True, replaces clutter with local 3x3 median. If False, zeros it.

        Returns:
            (filtered_dbz, clutter_mask)
        """
        clean_dbz = np.clip(np.nan_to_num(dbz, nan=0.0), 0.0, self.max_valid_dbz)
        tdbz = self.compute_tdbz_texture(clean_dbz)

        # Flag pixels exceeding TDBZ threshold with substantial reflectivity
        clutter_mask = (tdbz > self.tdbz_threshold_db) & (clean_dbz > self.min_meteorological_dbz)

        # Despeckle isolated 1-pixel noise
        opened_mask = binary_opening(clutter_mask, structure=np.ones((2, 2)))
        final_clutter_mask = clutter_mask | opened_mask

        filtered = clean_dbz.copy()
        if replace_with_median:
            local_median = scipy.ndimage.median_filter(clean_dbz, size=self.tdbz_window_size)
            filtered[final_clutter_mask] = local_median[final_clutter_mask]
        else:
            filtered[final_clutter_mask] = 0.0

        return filtered, final_clutter_mask

    def filter_ap_ducting(
        self,
        dbz: np.ndarray,
        satellite_tb_k: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Cross-sensor Anomalous Propagation (AP) ducting gate.

        Atmospheric physics rationale:
        True precipitating deep convection requires vertical cloud depth, resulting in cold
        cloud-top temperatures (Tb < 260 K, typically < 230 K for severe storms).
        When atmospheric temperature inversions duct the radar beam to hit the ground far away,
        false high-reflectivity echoes (> 20 dBZ) appear under clear skies or warm stratus
        where satellite Tb > 280 K (> 6.85 °C). This physically cannot be convective rain.

        Args:
            dbz: 2D radar reflectivity array (H, W)
            satellite_tb_k: 2D satellite brightness temperature array (H, W) in Kelvin

        Returns:
            (filtered_dbz, ap_mask)
        """
        if dbz.shape != satellite_tb_k.shape:
            raise ValueError(
                f"Shape mismatch between radar dbz {dbz.shape} and satellite Tb {satellite_tb_k.shape}"
            )

        clean_dbz = np.clip(np.nan_to_num(dbz, nan=0.0), 0.0, self.max_valid_dbz)
        clean_tb = np.nan_to_num(satellite_tb_k, nan=300.0)

        # AP Mask: High radar echo under warm cloud tops
        ap_mask = (clean_dbz >= self.ap_dbz_threshold) & (clean_tb >= self.ap_tb_threshold_k)

        filtered = clean_dbz.copy()
        filtered[ap_mask] = 0.0

        return filtered, ap_mask

    def impute_missing_frame_optical_flow(
        self,
        prev_frame: np.ndarray,
        next_frame: np.ndarray,
        alpha: float = 0.5
    ) -> np.ndarray:
        """
        Synthesizes a missing or corrupted radar frame using Farnebäck bi-directional
        optical-flow advection interpolation between t-1 and t+1.

        Args:
            prev_frame: 2D array at time t-1 (dBZ)
            next_frame: 2D array at time t+1 (dBZ)
            alpha: Temporal interpolation point in (0, 1), default 0.5 for mid-step

        Returns:
            imputed_frame: 2D array at time t
        """
        H, W = prev_frame.shape

        # Normalize to uint8 for Farnebäck
        p_u8 = np.clip((prev_frame / self.max_valid_dbz) * 255.0, 0, 255).astype(np.uint8)
        n_u8 = np.clip((next_frame / self.max_valid_dbz) * 255.0, 0, 255).astype(np.uint8)

        # Dense optical flow forward (t-1 -> t+1) and backward (t+1 -> t-1)
        flow_fwd = cv2.calcOpticalFlowFarneback(
            p_u8, n_u8, None,
            pyr_scale=0.5, levels=4, winsize=19, iterations=4, poly_n=5, poly_sigma=1.2, flags=0
        )
        flow_bwd = cv2.calcOpticalFlowFarneback(
            n_u8, p_u8, None,
            pyr_scale=0.5, levels=4, winsize=19, iterations=4, poly_n=5, poly_sigma=1.2, flags=0
        )

        Y, X = np.mgrid[0:H, 0:W].astype(np.float32)

        # Semi-Lagrangian backward trajectory advection:
        # Parcel at intermediate time t came from position displaced by velocity
        src_x_prev = np.clip(X - alpha * flow_fwd[..., 0], 0, W - 1)
        src_y_prev = np.clip(Y - alpha * flow_fwd[..., 1], 0, H - 1)
        advected_fwd = map_coordinates(prev_frame, [src_y_prev, src_x_prev], order=1, mode='nearest')

        src_x_next = np.clip(X - (1.0 - alpha) * flow_bwd[..., 0], 0, W - 1)
        src_y_next = np.clip(Y - (1.0 - alpha) * flow_bwd[..., 1], 0, H - 1)
        advected_bwd = map_coordinates(next_frame, [src_y_next, src_x_next], order=1, mode='nearest')

        # Blended reconstructed frame
        imputed = (1.0 - alpha) * advected_fwd + alpha * advected_bwd
        return np.clip(imputed, 0.0, self.max_valid_dbz)

    def inpaint_beam_blockage(
        self,
        dbz: np.ndarray,
        blockage_mask: np.ndarray,
        inpaint_radius: int = 3
    ) -> np.ndarray:
        """
        Fills missing or partially blocked radar sectors using Navier-Stokes inpainting.

        Args:
            dbz: 2D reflectivity grid (dBZ)
            blockage_mask: Boolean or uint8 array where 1 indicates blocked/missing data
            inpaint_radius: Inpainting neighborhood radius in pixels

        Returns:
            inpainted_dbz: 2D array
        """
        mask_u8 = (blockage_mask > 0).astype(np.uint8) * 255
        # Scale to uint8 for cv2.inpaint
        dbz_u8 = np.clip((dbz / self.max_valid_dbz) * 255.0, 0, 255).astype(np.uint8)

        inpainted_u8 = cv2.inpaint(dbz_u8, mask_u8, inpaint_radius, cv2.INPAINT_NS)
        inpainted_dbz = (inpainted_u8.astype(np.float32) / 255.0) * self.max_valid_dbz
        return inpainted_dbz

    def apply_full_qc(
        self,
        dbz: np.ndarray,
        satellite_tb_k: Optional[np.ndarray] = None,
        prev_dbz: Optional[np.ndarray] = None,
        next_dbz: Optional[np.ndarray] = None,
        is_missing: bool = False
    ) -> Dict[str, Union[np.ndarray, bool, Dict]]:
        """
        Executes the complete operational Quality Control pipeline:
        1. Missing frame detection & optical-flow imputation (if dropped)
        2. TDBZ ground clutter rejection
        3. Cross-sensor satellite AP ducting gating (if satellite Tb provided)

        Returns:
            Dict containing:
                - 'clean_dbz': np.ndarray (H, W)
                - 'clutter_mask': np.ndarray (H, W) bool
                - 'ap_mask': np.ndarray (H, W) bool
                - 'was_imputed': bool
                - 'qc_stats': Dict with metrics
        """
        was_imputed = False
        work_dbz = dbz.copy()

        # Check if frame is missing or corrupted
        if is_missing or np.isnan(work_dbz).all() or (work_dbz == 0).all():
            if prev_dbz is not None and next_dbz is not None:
                work_dbz = self.impute_missing_frame_optical_flow(prev_dbz, next_dbz)
                was_imputed = True

        # 1. Ground clutter rejection
        filtered_dbz, clutter_mask = self.filter_ground_clutter(work_dbz)

        # 2. Satellite AP gating
        ap_mask = np.zeros_like(clutter_mask)
        if satellite_tb_k is not None:
            filtered_dbz, ap_mask = self.filter_ap_ducting(filtered_dbz, satellite_tb_k)

        qc_stats = {
            "clutter_pixels_removed": int(clutter_mask.sum()),
            "ap_pixels_removed": int(ap_mask.sum()),
            "peak_dbz_raw": float(np.nanmax(dbz)) if not was_imputed else float(np.nanmax(work_dbz)),
            "peak_dbz_clean": float(np.max(filtered_dbz)),
            "was_imputed": was_imputed
        }

        return {
            "clean_dbz": filtered_dbz,
            "clutter_mask": clutter_mask,
            "ap_mask": ap_mask,
            "was_imputed": was_imputed,
            "qc_stats": qc_stats
        }
