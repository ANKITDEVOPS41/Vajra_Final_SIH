import numpy as np
import cv2
from typing import Dict, List, Tuple, Optional

# Attempt to import evaluator if available in the same backend folder
try:
    from evaluator import Evaluator
except ImportError:
    pass

class PyStepsBaseline:
    """
    Runs pysteps-style optical flow nowcasting as the baseline competitor.
    Since pysteps may not be installed, we implement the core algorithm ourselves:
    - Lucas-Kanade / Farneback optical flow (from OpenCV)
    - Semi-Lagrangian advection extrapolation
    - Same verification metrics as ConvectNet
    
    This lets us compare ConvectNet vs Optical Flow at every lead time.
    """
    
    def __init__(self, grid_res_km: float = 1.0, timestep_min: float = 5.0):
        self.grid_res_km = grid_res_km
        self.timestep_min = timestep_min
    
    def _compute_optical_flow(self, prev_frame: np.ndarray, curr_frame: np.ndarray) -> np.ndarray:
        """
        Computes dense optical flow using Farneback's algorithm.
        Returns flow field (H, W, 2) representing motion vectors in pixels/timestep.
        """
        # Normalize to 0-255 uint8 for OpenCV (assuming input in dBZ e.g., 0-70)
        norm_min, norm_max = 0, np.max([curr_frame, prev_frame])
        if norm_max == 0:
            norm_max = 1
        
        prev_norm = np.clip((prev_frame - norm_min) / (norm_max - norm_min) * 255, 0, 255).astype(np.uint8)
        curr_norm = np.clip((curr_frame - norm_min) / (norm_max - norm_min) * 255, 0, 255).astype(np.uint8)
        
        flow = cv2.calcOpticalFlowFarneback(
            prev_norm, curr_norm, None,
            pyr_scale=0.5, levels=3, winsize=15,
            iterations=3, poly_n=5, poly_sigma=1.2, flags=0
        )
        return flow
        
    def _semi_lagrangian_advection(self, current_frame: np.ndarray, flow: np.ndarray, n_leadtimes: int) -> np.ndarray:
        """
        Extrapolates using constant velocity assumption via backward semi-Lagrangian advection.
        """
        h, w = current_frame.shape
        forecasts = np.zeros((n_leadtimes, h, w), dtype=np.float32)
        
        # Grid of coordinates
        y, x = np.meshgrid(np.arange(h), np.arange(w), indexing='ij')
        
        for t in range(1, n_leadtimes + 1):
            # Backward displacement
            new_x = np.clip(x - flow[..., 0] * t, 0, w - 1).astype(np.float32)
            new_y = np.clip(y - flow[..., 1] * t, 0, h - 1).astype(np.float32)
            
            # Remap using bilinear interpolation
            extrapolated = cv2.remap(current_frame, new_x, new_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
            forecasts[t-1] = extrapolated
            
        return forecasts
    
    def run_baseline_forecast(self, radar_sequence: np.ndarray, n_leadtimes: int = 12) -> np.ndarray:
        """
        Given a sequence of observed radar frames (T_obs, H, W),
        use the last 2 frames to estimate motion and extrapolate forward.
        Returns: (n_leadtimes, H, W) forecast frames.
        """
        if radar_sequence.ndim != 3 or radar_sequence.shape[0] < 2:
            raise ValueError("Need at least 2 frames for optical flow. Sequence should be shape (T, H, W).")
            
        prev_frame = radar_sequence[-2]
        curr_frame = radar_sequence[-1]
        
        flow = self._compute_optical_flow(prev_frame, curr_frame)
        forecast = self._semi_lagrangian_advection(curr_frame, flow, n_leadtimes)
        
        return forecast
    
    def compare_against_model(self, obs_sequence: np.ndarray, model_forecast: np.ndarray, future_obs: np.ndarray, n_leadtimes: int = 12, threshold: float = 35.0) -> Dict:
        """
        Runs the baseline on the same observed data, then computes metrics for both.
        Returns: {
            'baseline': {'csi_by_leadtime': [...], 'pod_by_leadtime': [...], ...},
            'model': {'csi_by_leadtime': [...], 'pod_by_leadtime': [...], ...},
            'improvement': {'csi_gain': [...], 'pod_gain': [...], ...},
            'summary': 'ConvectNet beats optical flow by X% CSI at T+60'
        }
        """
        # Run baseline
        baseline_forecast = self.run_baseline_forecast(obs_sequence, n_leadtimes)
        
        baseline_csi, baseline_pod = [], []
        model_csi, model_pod = [], []
        
        # Calculate hits, misses, etc. per lead time for the specified threshold
        for t in range(min(n_leadtimes, future_obs.shape[0])):
            # Predictions
            b_pred = (baseline_forecast[t] >= threshold)
            m_pred = (model_forecast[t] >= threshold)
            # Truth
            truth = (future_obs[t] >= threshold)
            
            def compute_metrics(pred: np.ndarray, true: np.ndarray) -> Tuple[float, float]:
                hits = np.sum((pred & true))
                misses = np.sum((~pred & true))
                fa = np.sum((pred & ~true))
                
                csi = hits / (hits + misses + fa + 1e-7)
                pod = hits / (hits + misses + 1e-7)
                return float(csi), float(pod)
                
            b_csi, b_pod = compute_metrics(b_pred, truth)
            m_csi, m_pod = compute_metrics(m_pred, truth)
            
            baseline_csi.append(b_csi)
            baseline_pod.append(b_pod)
            model_csi.append(m_csi)
            model_pod.append(m_pod)
            
        # CSI gain at T+60 (assuming 5min timesteps, T+60 is index 11)
        t60_idx = min(11, len(baseline_csi) - 1)
        if t60_idx >= 0:
            csi_gain_t60 = ((model_csi[t60_idx] - baseline_csi[t60_idx]) / (baseline_csi[t60_idx] + 1e-7)) * 100
            t60_time = (t60_idx + 1) * int(self.timestep_min)
            summary = f"ConvectNet beats optical flow by {csi_gain_t60:.1f}% CSI at T+{t60_time}min"
        else:
            summary = "Insufficient lead times for T+60 summary."
        
        improvement = {
            'csi_gain': [m - b for m, b in zip(model_csi, baseline_csi)],
            'pod_gain': [m - b for m, b in zip(model_pod, baseline_pod)]
        }
        
        return {
            'baseline': {'csi_by_leadtime': baseline_csi, 'pod_by_leadtime': baseline_pod},
            'model': {'csi_by_leadtime': model_csi, 'pod_by_leadtime': model_pod},
            'improvement': improvement,
            'summary': summary
        }
