"""
ConvectNow — Spatio-Temporal Nowcasting Engine (0–6h)
Features:
1. Farnebäck / Lucas-Kanade Optical Flow Motion Estimation
2. Semi-Lagrangian Advection for 0–2h Near-Cast
3. Multi-Member Ensemble Perturbation (Mean + Uncertainty Spread)
4. Storm Cell Identification & Tracking (Persistent Cell Digital Twin)
5. Hyper-Local Location Arrival Time (ETA) Estimation
"""

import cv2
import numpy as np
from scipy.ndimage import map_coordinates, label, center_of_mass
from typing import Dict, List, Tuple, Optional

class ConvectiveNowcaster:
    def __init__(self, grid_res_km: float = 1.0, timestep_min: float = 5.0):
        self.grid_res_km = grid_res_km
        self.timestep_min = timestep_min

    def compute_optical_flow(self, prev_frame: np.ndarray, curr_frame: np.ndarray) -> np.ndarray:
        """
        Computes dense optical flow motion field (u, v) between two consecutive radar scans.
        Inputs:
            prev_frame, curr_frame: np.ndarray (H, W) in dBZ
        Returns:
            flow: np.ndarray (H, W, 2) where flow[:,:,0] is u (horizontal px/timestep)
                                          flow[:,:,1] is v (vertical px/timestep)
        """
        # Normalize dBZ (0 - 75) to uint8 (0 - 255) for Farnebäck
        p_u8 = np.clip((prev_frame / 75.0) * 255.0, 0, 255).astype(np.uint8)
        c_u8 = np.clip((curr_frame / 75.0) * 255.0, 0, 255).astype(np.uint8)

        # OpenCV Farnebäck dense optical flow
        flow = cv2.calcOpticalFlowFarneback(
            p_u8, c_u8, None,
            pyr_scale=0.5,
            levels=4,
            winsize=19,
            iterations=4,
            poly_n=5,
            poly_sigma=1.2,
            flags=0
        )
        return flow

    def extrapolate_semi_lagrangian(self, frame: np.ndarray, flow: np.ndarray, steps: int = 12) -> np.ndarray:
        """
        Semi-Lagrangian backward advection nowcasting.
        Extrapolates radar reflectivity field forward by `steps` timesteps (e.g. 12 steps * 5min = 60 min).
        Returns:
            forecasts: np.ndarray (steps, H, W)
        """
        H, W = frame.shape
        Y, X = np.mgrid[0:H, 0:W].astype(np.float32)

        forecasts = []
        u = flow[:, :, 0]
        v = flow[:, :, 1]

        for step in range(1, steps + 1):
            # Direct Lagrangian trajectory displacement from t0
            src_x = np.clip(X - (step * u), 0, W - 1)
            src_y = np.clip(Y - (step * v), 0, H - 1)

            # Bilinear interpolation advection
            advected = map_coordinates(frame, [src_y, src_x], order=1, mode='nearest')
            
            # Subtle lead-time smoothing (atmospheric dissipation)
            decay_factor = max(0.85, 1.0 - (0.005 * step))
            forecast = np.clip(advected * decay_factor, 0, 75.0)
            forecasts.append(forecast)

        return np.array(forecasts)

    def generate_probabilistic_ensemble(self, frame: np.ndarray, flow: np.ndarray, steps: int = 12, n_members: int = 10) -> Dict[str, np.ndarray]:
        """
        Generates a stochastic ensemble of nowcasts by perturbing the optical flow field.
        Returns:
            - ensemble_mean: (steps, H, W)
            - ensemble_std: (steps, H, W) [uncertainty spread]
            - members: (n_members, steps, H, W)
        """
        all_members = []
        H, W = frame.shape

        for m in range(n_members):
            if m == 0:
                # Deterministic baseline member
                perturbed_flow = flow.copy()
            else:
                # Perturb motion field with spatially coherent Gaussian noise
                noise_scale = 0.15 * (m / n_members)
                noise_u = cv2.GaussianBlur(np.random.randn(H, W).astype(np.float32), (31, 31), 5.0) * noise_scale * 3.0
                noise_v = cv2.GaussianBlur(np.random.randn(H, W).astype(np.float32), (31, 31), 5.0) * noise_scale * 3.0
                perturbed_flow = flow + np.stack([noise_u, noise_v], axis=-1)

            forecast = self.extrapolate_semi_lagrangian(frame, perturbed_flow, steps=steps)
            all_members.append(forecast)

        all_members = np.array(all_members) # (n_members, steps, H, W)
        ens_mean = np.mean(all_members, axis=0)
        ens_std = np.std(all_members, axis=0)

        return {
            "mean": ens_mean,
            "std": ens_std,
            "members": all_members
        }

    def detect_storm_cells(self, dbz_frame: np.ndarray, min_dbz: float = 35.0, min_area_px: int = 25) -> List[Dict]:
        """
        Identifies coherent convective storm cells (connected regions with dBZ >= 35).
        Returns list of cell records with centroid, peak dBZ, area, and bounding box.
        """
        mask = (dbz_frame >= min_dbz).astype(np.uint8)
        labeled_mask, num_features = label(mask)

        cells = []
        for feat_id in range(1, num_features + 1):
            cell_pixels = (labeled_mask == feat_id)
            area_px = int(np.sum(cell_pixels))
            if area_px < min_area_px:
                continue

            # Centroid
            cy, cx = center_of_mass(cell_pixels)
            peak_dbz = float(np.max(dbz_frame[cell_pixels]))
            mean_dbz = float(np.mean(dbz_frame[cell_pixels]))

            # Bounding box
            y_indices, x_indices = np.where(cell_pixels)
            min_y, max_y = int(np.min(y_indices)), int(np.max(y_indices))
            min_x, max_x = int(np.min(x_indices)), int(np.max(x_indices))

            cells.append({
                "cell_id": f"CELL-{feat_id:02d}",
                "centroid_x": float(cx),
                "centroid_y": float(cy),
                "area_km2": float(area_px * (self.grid_res_km ** 2)),
                "peak_dbz": peak_dbz,
                "mean_dbz": mean_dbz,
                "bbox": [min_x, min_y, max_x, max_y]
            })

        # Sort by peak intensity
        cells.sort(key=lambda c: c["peak_dbz"], reverse=True)
        return cells

    def track_cells_and_compute_eta(self, cells: List[Dict], flow: np.ndarray, target_locations: List[Dict]) -> List[Dict]:
        """
        Tracks storm cells, estimates forward motion velocity vectors, and calculates
        arrival countdowns (ETA ± uncertainty) for critical target assets/cities.
        """
        results = []
        H, W = flow.shape[:2]

        for cell in cells:
            cx = int(np.clip(cell["centroid_x"], 0, W - 1))
            cy = int(np.clip(cell["centroid_y"], 0, H - 1))

            # Sample motion vector at cell centroid
            u_px = float(flow[cy, cx, 0])
            v_px = float(flow[cy, cx, 1])

            # Convert to km/h (1 px = 1 km, 1 step = 5 min -> factor = 12 km/h per px/step)
            u_kmh = u_px * (60.0 / self.timestep_min) * self.grid_res_km
            v_kmh = v_px * (60.0 / self.timestep_min) * self.grid_res_km
            speed_kmh = float(np.sqrt(u_kmh**2 + v_kmh**2))
            heading_deg = float(np.degrees(np.arctan2(u_kmh, -v_kmh)) % 360) # 0 = North, 90 = East

            # Trajectory projection (next 12 steps)
            trajectory = []
            for t in range(1, 13):
                proj_x = cell["centroid_x"] + (u_px * t)
                proj_y = cell["centroid_y"] + (v_px * t)
                trajectory.append({
                    "lead_time_min": t * 5,
                    "x": float(proj_x),
                    "y": float(proj_y)
                })

            # Check target ETA
            etas = []
            for target in target_locations:
                tx, ty = target["x"], target["y"]
                dx = tx - cell["centroid_x"]
                dy = ty - cell["centroid_y"]
                distance_km = float(np.sqrt(dx**2 + dy**2)) * self.grid_res_km

                if speed_kmh > 3.0:
                    # Projection along approach vector
                    dot = (dx * u_kmh + dy * v_kmh) / (speed_kmh * np.sqrt(dx**2 + dy**2) + 1e-6)
                    if dot > 0.65: # Storm moving toward target
                        eta_min = (distance_km / speed_kmh) * 60.0
                        uncertainty_min = max(5.0, eta_min * 0.22)
                        etas.append({
                            "target_name": target["name"],
                            "distance_km": round(distance_km, 1),
                            "eta_minutes": round(eta_min, 1),
                            "eta_window_min": f"{max(0, int(eta_min - uncertainty_min))}–{int(eta_min + uncertainty_min)} min",
                            "threat_level": "WARNING" if eta_min <= 60 else "WATCH"
                        })

            results.append({
                **cell,
                "velocity_kmh": round(speed_kmh, 1),
                "u_kmh": round(u_kmh, 1),
                "v_kmh": round(v_kmh, 1),
                "heading_deg": round(heading_deg, 1),
                "trajectory": trajectory,
                "target_etas": etas
            })

        return results
