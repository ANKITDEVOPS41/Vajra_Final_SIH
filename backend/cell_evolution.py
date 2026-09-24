"""
ConvectNow — Milestone 3: Cell Evolution & Convective Intelligence Engine
Tracks individual storm cells over time to determine:
1. Is Cell A17 strengthening, weakening, or staying stable?
2. Temporal rates of change (dZ/dt, dArea/dt, dLightning/dt, dTb/dt)
3. Cell Evolution State & Probability Distribution:
   - DEVELOPING, INTENSIFYING, MATURE, WEAKENING
4. Dynamic footprint expansion scaling for downstream hazard nowcasts
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Tuple
import numpy as np


class EvolutionState(str, Enum):
    DEVELOPING = "DEVELOPING"
    INTENSIFYING = "INTENSIFYING"
    MATURE = "MATURE"
    WEAKENING = "WEAKENING"


@dataclass
class CellObservation:
    timestamp_utc: str
    minute_offset: float          # e.g. 0, 10, 20 min
    centroid_x: float
    centroid_y: float
    peak_dbz: float
    mean_dbz: float
    area_km2: float
    lightning_rate_per_min: float
    cloud_top_temp_k: Optional[float] = None


@dataclass
class CellEvolutionRecord:
    cell_id: str
    current_state: EvolutionState
    state_probabilities: Dict[str, float]
    trend_summary: str
    rate_dbz_per_10min: float
    rate_area_percent_per_10min: float
    rate_lightning_per_10min: float
    cooling_rate_k_per_10min: float
    footprint_expansion_factor: float   # > 1.0 means growing footprint
    history: List[Dict] = field(default_factory=list)


class CellEvolutionTracker:
    """
    Maintains persistent historical observations for tracked storm cells.
    Computes physical growth trends and maps them to probabilistic evolution states.
    """

    def __init__(self, max_history_scans: int = 12):
        self.max_history_scans = max_history_scans
        self.cell_histories: Dict[str, List[CellObservation]] = {}

    def record_observation(
        self,
        cell_id: str,
        centroid_x: float,
        centroid_y: float,
        peak_dbz: float,
        mean_dbz: float,
        area_km2: float,
        lightning_rate_per_min: float = 0.0,
        cloud_top_temp_k: Optional[float] = None,
        timestamp_utc: Optional[str] = None,
        minute_offset: float = 0.0,
    ) -> CellEvolutionRecord:
        """
        Appends a new radar/satellite/lightning observation to the cell's history
        and returns the updated evolution assessment.
        """
        if timestamp_utc is None:
            timestamp_utc = datetime.now(timezone.utc).isoformat()

        obs = CellObservation(
            timestamp_utc=timestamp_utc,
            minute_offset=minute_offset,
            centroid_x=centroid_x,
            centroid_y=centroid_y,
            peak_dbz=peak_dbz,
            mean_dbz=mean_dbz,
            area_km2=area_km2,
            lightning_rate_per_min=lightning_rate_per_min,
            cloud_top_temp_k=cloud_top_temp_k,
        )

        if cell_id not in self.cell_histories:
            self.cell_histories[cell_id] = []

        history = self.cell_histories[cell_id]
        history.append(obs)
        if len(history) > self.max_history_scans:
            history.pop(0)

        return self.compute_evolution(cell_id)

    def compute_evolution(self, cell_id: str) -> CellEvolutionRecord:
        """
        Computes rates of change and classifies evolution status for a cell.
        """
        history = self.cell_histories.get(cell_id, [])
        if not history:
            return CellEvolutionRecord(
                cell_id=cell_id,
                current_state=EvolutionState.DEVELOPING,
                state_probabilities={"DEVELOPING": 0.70, "INTENSIFYING": 0.20, "MATURE": 0.05, "WEAKENING": 0.05},
                trend_summary="Initial detection — insufficient history for rate estimation.",
                rate_dbz_per_10min=0.0,
                rate_area_percent_per_10min=0.0,
                rate_lightning_per_10min=0.0,
                cooling_rate_k_per_10min=0.0,
                footprint_expansion_factor=1.0,
                history=[],
            )

        curr = history[-1]
        history_dicts = [
            {
                "timestamp": o.timestamp_utc,
                "minute_offset": o.minute_offset,
                "peak_dbz": round(o.peak_dbz, 1),
                "area_km2": round(o.area_km2, 1),
                "lightning_rate": round(o.lightning_rate_per_min, 1),
                "cloud_top_temp_k": round(o.cloud_top_temp_k, 1) if o.cloud_top_temp_k else None,
            }
            for o in history
        ]

        if len(history) == 1:
            # Single scan fallback
            is_strong = curr.peak_dbz >= 45.0
            p_dev = 0.40 if is_strong else 0.75
            p_int = 0.45 if is_strong else 0.15
            p_mat = 0.10 if is_strong else 0.05
            p_weak = 0.05
            state = EvolutionState.INTENSIFYING if is_strong else EvolutionState.DEVELOPING
            return CellEvolutionRecord(
                cell_id=cell_id,
                current_state=state,
                state_probabilities={"DEVELOPING": p_dev, "INTENSIFYING": p_int, "MATURE": p_mat, "WEAKENING": p_weak},
                trend_summary=f"First scan recorded at {curr.peak_dbz:.1f} dBZ, {curr.area_km2:.0f} km².",
                rate_dbz_per_10min=0.0,
                rate_area_percent_per_10min=0.0,
                rate_lightning_per_10min=0.0,
                cooling_rate_k_per_10min=0.0,
                footprint_expansion_factor=1.0,
                history=history_dicts,
            )

        # Multi-scan rate of change calculation over the last 2 to 3 scans
        prev = history[-2]
        dt_min = max(1.0, curr.minute_offset - prev.minute_offset)
        scale_10m = 10.0 / dt_min

        # 1. Delta Reflectivity
        d_dbz = (curr.peak_dbz - prev.peak_dbz) * scale_10m

        # 2. Delta Area (% growth)
        if prev.area_km2 > 0:
            d_area_pct = ((curr.area_km2 - prev.area_km2) / prev.area_km2) * 100.0 * scale_10m
        else:
            d_area_pct = 0.0

        # 3. Delta Lightning
        d_lght = (curr.lightning_rate_per_min - prev.lightning_rate_per_min) * scale_10m

        # 4. Satellite Cloud-Top Cooling Rate (-dTb/dt in K/10min)
        # Updrafts punch through troposphere -> cloud tops get colder
        cooling_rate = 0.0
        if curr.cloud_top_temp_k and prev.cloud_top_temp_k:
            cooling_rate = (prev.cloud_top_temp_k - curr.cloud_top_temp_k) * scale_10m

        # ── Physically grounded score weighting ─────────────────────────
        # Convective intensification signal:
        # Reflectivity increasing (> +2.0 dBZ/10m)
        # Area expanding (> +10%/10m)
        # Lightning ramping up (> +3 strikes/min/10m)
        # Cloud top cooling (> +2.0 K/10m)
        score_intensify = 0.0
        score_weaken = 0.0
        score_mature = 0.0
        score_develop = 0.0

        # Reflectivity contributions
        if d_dbz >= 4.0:
            score_intensify += 0.40
        elif d_dbz >= 1.5:
            score_intensify += 0.25
        elif d_dbz <= -3.0:
            score_weaken += 0.45
        elif -1.5 <= d_dbz <= 1.5:
            score_mature += 0.30

        # Area contributions
        if d_area_pct >= 20.0:
            score_intensify += 0.30
        elif d_area_pct >= 5.0:
            score_intensify += 0.15
        elif d_area_pct <= -15.0:
            score_weaken += 0.35
        else:
            score_mature += 0.20

        # Lightning contributions
        if d_lght >= 5.0 or curr.lightning_rate_per_min >= 20.0:
            score_intensify += 0.30
        elif d_lght <= -4.0:
            score_weaken += 0.20
        elif curr.lightning_rate_per_min > 0:
            score_mature += 0.20

        # Satellite cooling contribution
        if cooling_rate >= 3.0:
            score_intensify += 0.25
        elif cooling_rate <= -2.0:
            score_weaken += 0.20

        # Baseline developing check (low peak dBZ < 40, small area)
        if curr.peak_dbz < 38.0 and curr.area_km2 < 60.0:
            score_develop += 0.50

        # Base prior weights
        raw_scores = np.array([
            max(0.05, score_develop + 0.10),
            max(0.05, score_intensify + 0.15),
            max(0.05, score_mature + 0.15),
            max(0.05, score_weaken + 0.10),
        ])
        probs = raw_scores / np.sum(raw_scores)
        state_probs = {
            "DEVELOPING": round(float(probs[0]), 3),
            "INTENSIFYING": round(float(probs[1]), 3),
            "MATURE": round(float(probs[2]), 3),
            "WEAKENING": round(float(probs[3]), 3),
        }

        # Select state with maximum probability
        states = [EvolutionState.DEVELOPING, EvolutionState.INTENSIFYING, EvolutionState.MATURE, EvolutionState.WEAKENING]
        best_state = states[int(np.argmax(probs))]

        # Footprint expansion factor for forward nowcasting
        if best_state == EvolutionState.INTENSIFYING:
            # Expands up to 35% larger over 60 min
            footprint_factor = 1.0 + min(0.35, max(0.05, (d_area_pct / 100.0) * 0.5))
        elif best_state == EvolutionState.WEAKENING:
            # Shrinks over lead time
            footprint_factor = 0.85
        else:
            footprint_factor = 1.0

        # Trend human-readable summary
        trend_parts = []
        if d_dbz > 1.0:
            trend_parts.append(f"Reflectivity ↑ (+{d_dbz:.1f} dBZ/10m)")
        elif d_dbz < -1.0:
            trend_parts.append(f"Reflectivity ↓ ({d_dbz:.1f} dBZ/10m)")
        else:
            trend_parts.append("Reflectivity stable")

        if d_area_pct > 5.0:
            trend_parts.append(f"Area expanding (+{d_area_pct:.0f}%/10m)")
        elif d_area_pct < -5.0:
            trend_parts.append(f"Area contracting ({d_area_pct:.0f}%/10m)")

        if curr.lightning_rate_per_min > 0:
            trend_parts.append(f"Lightning: {curr.lightning_rate_per_min:.0f}/min (trend: {'↑' if d_lght > 0 else '↓'})")

        summary = f"{best_state.value}: " + ", ".join(trend_parts)

        return CellEvolutionRecord(
            cell_id=cell_id,
            current_state=best_state,
            state_probabilities=state_probs,
            trend_summary=summary,
            rate_dbz_per_10min=round(d_dbz, 2),
            rate_area_percent_per_10min=round(d_area_pct, 1),
            rate_lightning_per_10min=round(d_lght, 2),
            cooling_rate_k_per_10min=round(cooling_rate, 2),
            footprint_expansion_factor=round(footprint_factor, 2),
            history=history_dicts,
        )

    def reset(self):
        """Clears all tracked cell histories."""
        self.cell_histories.clear()
