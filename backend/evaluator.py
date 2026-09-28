"""
ConvectNow — Scientific Evaluation & Validation Framework
Implements standard WMO / NCMRWF verification metrics:
1. Critical Success Index (CSI / Threat Score)
2. Probability of Detection (POD) & False Alarm Ratio (FAR)
3. Fractions Skill Score (FSS) at multiple spatial radii (Roberts & Lean 2008)
4. ETA Mean Absolute Error (MAE)
"""


import numpy as np
from scipy.ndimage import uniform_filter


class ConvectiveEvaluator:
    @staticmethod
    def compute_contingency_table(obs: np.ndarray, pred: np.ndarray, threshold: float = 35.0) -> dict[str, float]:
        """
        Computes binary contingency table metrics for convection threshold exceedance (e.g. 35 dBZ).
        Hits (TP), False Alarms (FP), Misses (FN), Correct Negatives (TN).
        """
        obs_b = (obs >= threshold).astype(bool)
        pred_b = (pred >= threshold).astype(bool)

        hits = float(np.sum(obs_b & pred_b))
        false_alarms = float(np.sum(~obs_b & pred_b))
        misses = float(np.sum(obs_b & ~pred_b))
        correct_negatives = float(np.sum(~obs_b & ~pred_b))

        # Critical Success Index (CSI)
        denom_csi = hits + false_alarms + misses
        csi = hits / denom_csi if denom_csi > 0 else 0.0

        # Probability of Detection (POD)
        denom_pod = hits + misses
        pod = hits / denom_pod if denom_pod > 0 else 0.0

        # False Alarm Ratio (FAR)
        denom_far = hits + false_alarms
        far = false_alarms / denom_far if denom_far > 0 else 0.0

        # Heidke Skill Score (HSS)
        total = hits + false_alarms + misses + correct_negatives
        expected_correct = ((hits + misses) * (hits + false_alarms) + (correct_negatives + misses) * (correct_negatives + false_alarms)) / total
        hss_denom = total - expected_correct
        hss = (hits + correct_negatives - expected_correct) / hss_denom if hss_denom > 0 else 0.0

        return {
            "CSI": round(csi, 4),
            "POD": round(pod, 4),
            "FAR": round(far, 4),
            "HSS": round(hss, 4),
            "hits": int(hits),
            "false_alarms": int(false_alarms),
            "misses": int(misses)
        }

    @staticmethod
    def compute_fractions_skill_score(obs: np.ndarray, pred: np.ndarray, threshold: float = 35.0, neighborhood_px: int = 15) -> float:
        """
        Computes Fractions Skill Score (FSS) (Roberts & Lean 2008).
        Allows spatial displacement tolerance across a neighborhood radius.
        FSS = 1 - (MSE / MSE_ref)
        """
        obs_b = (obs >= threshold).astype(np.float32)
        pred_b = (pred >= threshold).astype(np.float32)

        # Window average
        obs_fraction = uniform_filter(obs_b, size=neighborhood_px, mode='constant')
        pred_fraction = uniform_filter(pred_b, size=neighborhood_px, mode='constant')

        mse = np.mean((obs_fraction - pred_fraction) ** 2)
        mse_ref = np.mean(obs_fraction ** 2) + np.mean(pred_fraction ** 2)

        if mse_ref == 0:
            return 1.0 if mse == 0 else 0.0

        fss = 1.0 - (mse / mse_ref)
        return float(round(np.clip(fss, 0.0, 1.0), 4))

    @classmethod
    def evaluate_lead_time_decay(cls, ground_truth_seq: np.ndarray, forecast_seq: np.ndarray) -> list[dict]:
        """
        Evaluates forecast decay over lead times (T+15, T+30, T+60, T+90 min).
        """
        results = []
        lead_times_steps = min(len(ground_truth_seq), len(forecast_seq))

        for step in range(lead_times_steps):
            lead_min = (step + 1) * 5
            obs = ground_truth_seq[step]
            pred = forecast_seq[step]

            scores_35 = cls.compute_contingency_table(obs, pred, threshold=35.0)
            fss_10km = cls.compute_fractions_skill_score(obs, pred, threshold=35.0, neighborhood_px=11)
            fss_30km = cls.compute_fractions_skill_score(obs, pred, threshold=35.0, neighborhood_px=31)

            results.append({
                "lead_time_min": lead_min,
                "CSI_35dBZ": scores_35["CSI"],
                "POD": scores_35["POD"],
                "FAR": scores_35["FAR"],
                "HSS": scores_35["HSS"],
                "FSS_10km": fss_10km,
                "FSS_30km": fss_30km
            })

        return results
