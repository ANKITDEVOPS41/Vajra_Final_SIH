"""
ConvectNow — Data Ingestion & Preprocessing Engine
Handles multi-source ingestion:
1. SEVIR Doppler Radar VIL (Vertically Integrated Liquid)
2. SEVIR Geostationary Lightning Mapper (GLM)
3. Operational IMD Doppler Weather Radar (DWR)
4. Standardized 1 km EPSG:4326 spatiotemporal analysis cube
"""

import os
import h5py
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional

class ConvectNowIngester:
    def __init__(self, base_dir: str = "."):
        self.base_dir = base_dir
        self.sevir_vil_path = os.path.join(base_dir, "datasets/sevir/vil/SEVIR_VIL_STORMEVENTS_2017_0101_0630.h5")
        self.sevir_lght_path = os.path.join(base_dir, "datasets/sevir/lght/SEVIR_LGHT_ALLEVENTS_2018_0601_0701.h5")
        self.sevir_catalog_path = os.path.join(base_dir, "datasets/sevir/CATALOG.csv")
        self.imd_radar_dir = os.path.join(base_dir, "datasets/imd_radar")

    def list_available_storms(self) -> List[Dict]:
        """Lists available storm events from the downloaded SEVIR dataset."""
        storms = []
        if not os.path.exists(self.sevir_vil_path):
            return storms

        with h5py.File(self.sevir_vil_path, 'r') as f:
            ids = [i.decode('utf-8') if isinstance(i, bytes) else str(i) for i in f['id'][:]]
            for idx, storm_id in enumerate(ids[:25]):
                storms.append({
                    "index": idx,
                    "storm_id": storm_id,
                    "frames": 49,
                    "resolution_km": 1.0,
                    "timestep_min": 5
                })
        return storms

    def load_storm_event(self, event_idx: int = 0) -> Dict:
        """
        Loads a complete 4-hour (49-frame) convective storm sequence at 1 km resolution.
        Returns:
            Dict containing:
                - storm_id: str
                - vil_frames: np.ndarray (49, 384, 384) in kg/m^2 (or scaled dBZ)
                - timestamps: List[int] relative minutes [0, 5, 10, ... 240]
                - grid_res_km: float = 1.0
        """
        if not os.path.exists(self.sevir_vil_path):
            raise FileNotFoundError(f"VIL dataset not found at {self.sevir_vil_path}")

        with h5py.File(self.sevir_vil_path, 'r') as f:
            storm_id = f['id'][event_idx]
            if isinstance(storm_id, bytes):
                storm_id = storm_id.decode('utf-8')
            
            # vil shape: (193, 384, 384, 49)
            raw_vil = f['vil'][event_idx]  # (384, 384, 49)
            # Transpose to (49, 384, 384) -> (time, height, width)
            vil_frames = np.transpose(raw_vil, (2, 0, 1)).astype(np.float32)

        # Scale VIL values from uint8 (0-254) to physical VIL kg/m^2
        # SEVIR linear conversion: VIL (kg/m^2) ≈ vil_raw / 3.5
        vil_kg_m2 = vil_frames / 3.5
        
        # Approximate equivalent Radar Reflectivity (dBZ) from VIL
        # Operational approximation: dBZ ≈ 10 * log10(max(1, VIL * 1000)) + 15
        dbz_frames = np.clip(10.0 * np.log10(np.maximum(1e-2, vil_kg_m2 * 120.0)) + 22.0, 0, 75.0)

        timestamps = [t * 5 for t in range(len(vil_frames))]

        return {
            "storm_id": storm_id,
            "vil": vil_kg_m2,
            "dbz": dbz_frames,
            "timestamps_min": timestamps,
            "grid_shape": (384, 384),
            "resolution_km": 1.0
        }

    def load_lightning_stream(self, max_records: int = 5000) -> List[Dict]:
        """Loads geostationary lightning strikes from SEVIR GLM."""
        strikes = []
        if not os.path.exists(self.sevir_lght_path):
            return strikes

        with h5py.File(self.sevir_lght_path, 'r') as f:
            keys = [k for k in f.keys() if k != 'id']
            if not keys:
                return strikes
            
            sample_key = keys[0]
            raw = f[sample_key][:max_records]
            for row in raw:
                strikes.append({
                    "time_offset_sec": float(row[0]),
                    "lat": float(row[1]),
                    "lon": float(row[2]),
                    "energy": float(row[3]),
                    "count": int(row[4])
                })
        return strikes

    def get_imd_radar_metadata(self) -> Dict:
        """Inspects downloaded operational IMD Doppler Radar products."""
        products = {}
        if not os.path.exists(self.imd_radar_dir):
            return products

        for fname in os.listdir(self.imd_radar_dir):
            if fname.endswith(".gif"):
                path = os.path.join(self.imd_radar_dir, fname)
                products[fname] = {
                    "size_bytes": os.path.getsize(path),
                    "modified": os.path.getmtime(path),
                    "status": "OPERATIONAL_DWR_COMPOSITE"
                }
        return products
