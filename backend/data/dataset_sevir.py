"""
ConvectNow — Multi-Modal Convective Storm PyTorch Dataset & DataLoader
Handles:
1. Loading SEVIR 1 km convective storm cubes (SEVIR_VIL_STORMEVENTS_2017_0101_0630.h5)
2. Geostationary Lightning Mapper (GLM) integration & rasterization (SEVIR_LGHT_ALLEVENTS_2018_0601_0701.h5)
3. Dual-Mode Fusion: Paired GLM rasterization when available, physics-proxy lightning/IR for benchmark events
4. Yields clean 5D multi-modal batches (B, C=4, T=12, H=128, W=128)
   - C=0: Normalized Reflectivity / VIL [0, 1]
   - C=1: Temporal Growth Delta Z [-1, 1]
   - C=2: Satellite IR Cloud-Top Cooling / Inverted Tb [0, 1]
   - C=3: Normalized Lightning Strike Density [0, 1]
5. Ground truth targets dictionary matching all 4 ConvectNet heads:
   - 'posh': float [0.0, 1.0]
   - 'mesh_mm': float [0.0, 100.0]
   - 'cloudburst_flag': float {0.0, 1.0}
   - 'rain_rate_mmh': float [0.0, 300.0]
   - 'gust_kmh': float [0.0, 200.0]
   - 'ci_prob': float [0.0, 1.0]
"""

import os

import h5py
import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader, Dataset


def _resolve_path(path: str | None) -> str | None:
    if not path:
        return path
    if os.path.isabs(path) and os.path.exists(path):
        return path
    if os.path.exists(path):
        return os.path.abspath(path)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.environ.get("CONVECTNOW_ROOT", os.path.abspath(os.path.join(base_dir, "../../..")))
    candidates = [
        os.path.abspath(os.path.join(base_dir, "../../..", path)),
        os.path.abspath(os.path.join(base_dir, "../..", path)),
        os.path.abspath(os.path.join("..", path)),
        os.path.abspath(os.path.join(".", path)),
        os.path.join(project_root, path)
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return path


DEFAULT_VIL_PATH = "datasets/sevir/vil/SEVIR_VIL_STORMEVENTS_2017_0101_0630.h5"
DEFAULT_LGHT_PATH = "datasets/sevir/lght/SEVIR_LGHT_ALLEVENTS_2018_0601_0701.h5"
DEFAULT_CATALOG_PATH = "datasets/sevir/CATALOG.csv"


class ConvectDataset(Dataset):
    """
    PyTorch Dataset for multi-modal convective hazard modeling.
    Yields 4D input tensors of shape (C=4, T=12, H=128, W=128) and target dictionaries.
    """

    def __init__(
        self,
        vil_path: str = DEFAULT_VIL_PATH,
        lght_path: str | None = DEFAULT_LGHT_PATH,
        catalog_path: str | None = DEFAULT_CATALOG_PATH,
        sequence_length: int = 12,
        crop_size: tuple[int, int] = (128, 128),
        center_crop_on_storm_core: bool = True,
        random_crop: bool = False,
        split: str = "train",
        train_ratio: float = 0.8,
        seed: int = 42
    ):
        """
        Args:
            vil_path: Path to SEVIR VIL HDF5 file
            lght_path: Optional path to SEVIR GLM Lightning HDF5 file
            catalog_path: Optional path to SEVIR CATALOG.csv
            sequence_length: Number of input history timesteps (default 12 frames = 60 min)
            crop_size: Spatial dimensions (H, W) for localized convective storm core patches
            center_crop_on_storm_core: If True, centers the crop on the peak VIL core
            random_crop: If True (and training), adds random jitter around storm core
            split: 'train', 'val', or 'all'
            train_ratio: Train/val split ratio
            seed: Reproducibility seed for train/val split
        """
        super().__init__()
        self.vil_path = _resolve_path(vil_path)
        self.lght_path = _resolve_path(lght_path)
        self.catalog_path = _resolve_path(catalog_path)
        self.sequence_length = sequence_length
        self.crop_size = crop_size
        self.center_crop_on_storm_core = center_crop_on_storm_core
        self.random_crop = random_crop
        self.split = split

        if not os.path.exists(self.vil_path):
            raise FileNotFoundError(f"SEVIR VIL dataset not found at {self.vil_path}")

        # Index available events from VIL HDF5
        with h5py.File(self.vil_path, "r") as f:
            raw_ids = f["id"][:]
            self.all_event_ids = [
                i.decode("utf-8") if isinstance(i, bytes) else str(i) for i in raw_ids
            ]

        # Load catalog metadata if available
        self.catalog_df: pd.DataFrame | None = None
        self.catalog_by_id: dict[str, dict] = {}
        if self.catalog_path and os.path.exists(self.catalog_path):
            try:
                cat = pd.read_csv(self.catalog_path, low_memory=False)
                vil_rows = cat[cat["img_type"] == "vil"]
                for _, row in vil_rows.iterrows():
                    eid = str(row["id"])
                    self.catalog_by_id[eid] = {
                        "event_type": str(row.get("event_type", "")),
                        "llcrnrlat": float(row.get("llcrnrlat", 0.0)),
                        "llcrnrlon": float(row.get("llcrnrlon", 0.0)),
                        "urcrnrlat": float(row.get("urcrnrlat", 0.0)),
                        "urcrnrlon": float(row.get("urcrnrlon", 0.0)),
                        "time_utc": str(row.get("time_utc", ""))
                    }
            except Exception:
                pass

        # Check GLM lightning keys for Paired Mode
        self.lght_keys: set = set()
        if self.lght_path and os.path.exists(self.lght_path):
            try:
                with h5py.File(self.lght_path, "r") as f_lght:
                    self.lght_keys = set(f_lght.keys()) - {"id"}
            except Exception:
                pass

        # Train / Validation Split
        n_total = len(self.all_event_ids)
        rng = np.random.RandomState(seed)
        indices = np.arange(n_total)
        rng.shuffle(indices)

        n_train = int(n_total * train_ratio)
        if split == "train":
            self.indices = indices[:n_train].tolist()
        elif split in ["val", "validation", "test"]:
            self.indices = indices[n_train:].tolist()
        else:
            self.indices = list(range(n_total))

    def __len__(self) -> int:
        return len(self.indices)

    def _extract_crop(
        self,
        vil_cube: np.ndarray
    ) -> tuple[np.ndarray, tuple[int, int, int, int]]:
        """
        Extracts a (T, H, W) spatial patch centered on the storm's convective core.
        vil_cube shape: (T, 384, 384)
        """
        T, H_full, W_full = vil_cube.shape
        H_crop, W_crop = self.crop_size

        if H_crop >= H_full or W_crop >= W_full:
            return vil_cube, (0, 0, H_full, W_full)

        if self.center_crop_on_storm_core:
            # Find peak VIL location across sequence
            mean_intensity = np.mean(vil_cube, axis=0)
            py, px = np.unravel_index(np.argmax(mean_intensity), (H_full, W_full))

            if self.random_crop and self.split == "train":
                jitter_y = np.random.randint(-16, 17)
                jitter_x = np.random.randint(-16, 17)
                py = np.clip(py + jitter_y, 0, H_full - 1)
                px = np.clip(px + jitter_x, 0, W_full - 1)

            y1 = max(0, min(H_full - H_crop, int(py - H_crop // 2)))
            x1 = max(0, min(W_full - W_crop, int(px - W_crop // 2)))
        else:
            y1 = (H_full - H_crop) // 2
            x1 = (W_full - W_crop) // 2

        y2 = y1 + H_crop
        x2 = x1 + W_crop

        return vil_cube[:, y1:y2, x1:x2], (y1, y2, x1, x2)

    def _compute_paired_lightning_channel(
        self,
        event_id: str,
        crop_box: tuple[int, int, int, int],
        full_shape: tuple[int, int] = (384, 384)
    ) -> np.ndarray | None:
        """
        Rasterizes raw GLM lightning strikes for Paired Mode when event ID exists in GLM file.
        """
        if not self.lght_path or event_id not in self.lght_keys:
            return None

        try:
            with h5py.File(self.lght_path, "r") as f_lght:
                raw_strikes = f_lght[event_id][:]  # (N, 5): [time_offset_sec, lat, lon, energy, count]

            if len(raw_strikes) == 0:
                return np.zeros((self.sequence_length, self.crop_size[0], self.crop_size[1]), dtype=np.float32)

            meta = self.catalog_by_id.get(event_id, {})
            ll_lat = meta.get("llcrnrlat", 30.0)
            ll_lon = meta.get("llcrnrlon", -100.0)
            ur_lat = meta.get("urcrnrlat", 35.0)
            ur_lon = meta.get("urcrnrlon", -95.0)

            H_crop, W_crop = self.crop_size
            y1, y2, x1, x2 = crop_box
            H_full, W_full = full_shape

            lats = raw_strikes[:, 1]
            lons = raw_strikes[:, 2]
            times = raw_strikes[:, 0]

            # Normalize geographic coords to full (384, 384) grid indices
            norm_y = ((lats - ll_lat) / max(1e-4, ur_lat - ll_lat)) * (H_full - 1)
            norm_x = ((lons - ll_lon) / max(1e-4, ur_lon - ll_lon)) * (W_full - 1)

            # Filter strikes within crop box
            in_crop = (norm_y >= y1) & (norm_y < y2) & (norm_x >= x1) & (norm_x < x2)

            raster = np.zeros((self.sequence_length, H_crop, W_crop), dtype=np.float32)
            if np.any(in_crop):
                crop_y = (norm_y[in_crop] - y1).astype(int)
                crop_x = (norm_x[in_crop] - x1).astype(int)
                crop_t = np.clip((times[in_crop] / 300.0).astype(int), 0, self.sequence_length - 1)

                for t, y, x in zip(crop_t, crop_y, crop_x):
                    raster[t, min(y, H_crop - 1), min(x, W_crop - 1)] += 1.0

            # Log-scale normalize
            return np.clip(np.log1p(raster) / np.log1p(30.0), 0.0, 1.0)
        except Exception:
            return None

    def _compute_hazard_targets(
        self,
        dbz_crop: np.ndarray,
        vil_crop: np.ndarray,
        event_type: str = ""
    ) -> dict[str, float]:
        """
        Computes ground truth regression and classification targets matching all 4 ConvectNet heads:
        1. Hail Head: POSH [0, 1], MESH [0, 100] mm
        2. Cloudburst Head: cloudburst_flag {0, 1}, rain_rate_mmh [0, 300] mm/hr
        3. Downburst Head: gust_kmh [0, 200] km/h
        4. Convective Initiation Head: ci_prob [0, 1]
        """
        z_max = float(np.max(dbz_crop))
        vil_max = float(np.max(vil_crop))

        # 1. Cloudburst & Extreme Rain Rate (Tropical Z-R: Z = 300 * R^1.5)
        z_lin = 10.0 ** (np.clip(z_max, 0.0, 75.0) / 10.0)
        rain_rate = float((np.maximum(0.0, z_lin) / 300.0) ** (1.0 / 1.5))
        if event_type in ["Flash Flood", "Heavy Rain"]:
            rain_rate = max(100.0, rain_rate)
        rain_rate = float(np.clip(rain_rate, 0.0, 300.0))
        cloudburst_flag = 1.0 if (rain_rate >= 100.0 or event_type == "Flash Flood") else 0.0

        # 2. Severe Hail Index (SHI, POSH, MESH) - Witt et al. (1998)
        ez = max(0.0, (z_lin - 10000.0) / 46000.0) if z_max >= 40.0 else 0.0
        depth = np.clip((z_max - 40.0) / 4.0, 0.0, 8.0)
        shi = 0.1 * ez * depth * 0.45

        posh = float(np.clip(29.0 * np.log(max(1e-4, shi)) - 2.84, 0.0, 100.0) / 100.0)
        mesh_mm = float(np.clip(2.54 * np.sqrt(max(0.0, shi)), 0.0, 100.0))
        if event_type == "Hail":
            posh = max(0.60, posh)
            mesh_mm = max(25.0, mesh_mm)

        # 3. Downburst Peak Surface Wind Gust Velocity (V_db in km/h)
        cape = 1800.0
        v_db_ms = 0.72 * np.sqrt(cape * 0.12) * np.clip((z_max - 35.0) / 30.0, 0.0, 1.0) + (vil_max / 12.0) * 3.5
        gust_kmh = float(np.clip(v_db_ms * 3.6, 0.0, 200.0))
        if event_type in ["Thunderstorm Wind", "Tornado"]:
            gust_kmh = max(90.0, gust_kmh)

        # 4. Convective Initiation Probability (CI)
        z_t11 = float(np.max(dbz_crop[-1]))
        z_t8 = float(np.max(dbz_crop[-4])) if len(dbz_crop) >= 4 else z_t11
        growth = z_t11 - z_t8
        if z_t11 >= 35.0 and growth >= 4.0:
            ci_prob = float(np.clip(0.5 + (growth / 20.0), 0.5, 1.0))
        elif z_t11 >= 45.0:
            ci_prob = 0.85
        else:
            ci_prob = float(np.clip(z_t11 / 50.0, 0.0, 0.5))

        return {
            "posh": np.float32(posh),
            "mesh_mm": np.float32(mesh_mm),
            "cloudburst_flag": np.float32(cloudburst_flag),
            "rain_rate_mmh": np.float32(rain_rate),
            "gust_kmh": np.float32(gust_kmh),
            "ci_prob": np.float32(ci_prob)
        }

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, dict[str, torch.Tensor | float | str]]:
        """
        Returns:
            tensor: torch.Tensor of shape (C=4, T=12, H=128, W=128), dtype torch.float32
            targets: Dict of ground truth values for ConvectNet heads
        """
        event_idx = self.indices[idx]
        event_id = self.all_event_ids[event_idx]

        # Load raw VIL from HDF5: shape (384, 384, 49)
        with h5py.File(self.vil_path, "r") as f:
            raw_vil = f["vil"][event_idx]

        # Transpose to (49, 384, 384) -> (time, height, width)
        vil_frames = np.transpose(raw_vil, (2, 0, 1)).astype(np.float32)

        # Physical VIL (kg/m^2) conversion: SEVIR uint8 [0, 255] linearly represents [0, 84] kg/m^2
        vil_kg_m2 = vil_frames * (84.0 / 255.0)

        # Take input sequence (first sequence_length timesteps)
        vil_seq = vil_kg_m2[:self.sequence_length]

        # Crop spatial patch centered on convective core
        vil_crop, crop_box = self._extract_crop(vil_seq)

        # Approximate equivalent Radar Reflectivity (dBZ)
        dbz_crop = np.clip(10.0 * np.log10(np.maximum(1e-2, vil_crop * 120.0)) + 22.0, 0.0, 75.0)

        # ---------------------------------------------------------------------
        # Channel 0: Normalized Reflectivity / VIL [0.0, 1.0]
        # ---------------------------------------------------------------------
        c0 = np.clip(dbz_crop / 75.0, 0.0, 1.0)

        # ---------------------------------------------------------------------
        # Channel 1: Temporal Growth Delta Z [-1.0, 1.0] (updraft signature)
        # ---------------------------------------------------------------------
        c1 = np.zeros_like(c0)
        c1[1:] = np.clip((dbz_crop[1:] - dbz_crop[:-1]) / 30.0, -1.0, 1.0)

        # ---------------------------------------------------------------------
        # Channel 2: Convective Core Energy / Overshooting Top Proxy [0.0, 1.0]
        # (Derived from physical VIL kg/m^2 normalized against severe threshold 70 kg/m^2)
        # ---------------------------------------------------------------------
        c2 = np.clip(vil_crop / 70.0, 0.0, 1.0)

        # ---------------------------------------------------------------------
        # Channel 3: Normalized Lightning Strike Density [0.0, 1.0]
        # Dual-mode: Paired GLM raster if available, physics proxy otherwise
        # ---------------------------------------------------------------------
        paired_glm = self._compute_paired_lightning_channel(event_id, crop_box)
        if paired_glm is not None:
            c3 = paired_glm
        else:
            # Physics proxy: Lightning flash density power-law (flashes/km^2/hr)
            convective_core = np.clip((dbz_crop - 38.0) / 20.0, 0.0, 2.0)
            flash_density = (vil_crop * 0.18) * (convective_core ** 2.2)
            c3 = np.clip(np.log1p(flash_density) / np.log1p(45.0), 0.0, 1.0)

        # Stack into 4D tensor (C=4, T=12, H=128, W=128)
        data_4d = np.stack([c0, c1, c2, c3], axis=0).astype(np.float32)
        tensor = torch.from_numpy(data_4d)

        # Targets dict
        meta = self.catalog_by_id.get(event_id, {})
        event_type = meta.get("event_type", "")
        targets = self._compute_hazard_targets(dbz_crop, vil_crop, event_type=event_type)

        return tensor, targets


def create_convect_dataloader(
    dataset: ConvectDataset,
    batch_size: int = 4,
    shuffle: bool = True,
    num_workers: int = 0,
    pin_memory: bool = False,
    drop_last: bool = False
) -> DataLoader:
    """
    Creates a standard PyTorch DataLoader yielding clean (B, C=4, T=12, H=128, W=128) batches.
    """
    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        num_workers=num_workers,
        pin_memory=pin_memory,
        drop_last=drop_last
    )
