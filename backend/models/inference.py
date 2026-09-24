"""
ConvectNet Inference Wrapper — SIH PS-26084
Device: MPS (Apple Silicon) > CUDA > CPU
SLA: < 50ms mean inference latency
"""
import os
import time
import numpy as np
import torch
import torch.nn.functional as F

from .convectnet import ConvectNet


class ConvectNetInference:
    """
    Production inference wrapper for ConvectNet.

    Usage:
        engine = ConvectNetInference()
        result = engine.predict(np.random.randn(4, 12, 128, 128).astype(np.float32))
        stats  = engine.benchmark()
    """

    def __init__(self, checkpoint_path: str = None):
        # Auto device selection
        if torch.backends.mps.is_available():
            self.device = torch.device('mps')
        elif torch.cuda.is_available():
            self.device = torch.device('cuda')
        else:
            self.device = torch.device('cpu')

        self.model = ConvectNet().to(self.device)
        self.model.eval()

        if checkpoint_path and os.path.exists(checkpoint_path):
            state = torch.load(checkpoint_path, map_location=self.device, weights_only=True)
            self.model.load_state_dict(state)

    def predict(self, x: np.ndarray) -> dict:
        """
        Args:
            x: float32 numpy array of shape (4, T, H, W) or (B, 4, T, H, W)
        Returns:
            dict with keys:
              posh           float [0, 1]
              mesh_mm        float [0, 100]
              cloudburst_flag bool
              rain_rate_mmh  float [0, 300]
              gust_kmh       float [0, 200]
              ci_prob        float [0, 1]
              latent_embedding list[float] len=128
        """
        if x.ndim == 4:
            x = x[np.newaxis]                         # (1, 4, T, H, W)
        t = torch.from_numpy(x.astype(np.float32)).to(self.device)

        with torch.no_grad():
            out = self.model(t)

        posh         = float(torch.sigmoid(out['hail'][0, 1]).cpu())
        mesh_mm      = float(torch.clamp(F.softplus(out['hail'][0, 2]) * 10.0, 0.0, 100.0).cpu())
        cb_logit     = out['cloudburst'][0, 0]
        cb_flag      = bool((torch.sigmoid(cb_logit) > 0.5).cpu().item())
        rain_rate    = float(torch.clamp(F.softplus(out['cloudburst'][0, 1]) * 30.0, 0.0, 300.0).cpu())
        gust_kmh     = float(torch.clamp(F.softplus(out['downburst'][0, 0]) * 20.0, 0.0, 200.0).cpu())
        ci_prob      = float(torch.sigmoid(out['ci'][0, 0]).cpu())
        latent       = out['latent'][0].cpu().numpy().tolist()

        return {
            'posh':             posh,
            'mesh_mm':          mesh_mm,
            'cloudburst_flag':  cb_flag,
            'rain_rate_mmh':    rain_rate,
            'gust_kmh':         gust_kmh,
            'ci_prob':          ci_prob,
            'latent_embedding': latent,
        }

    def benchmark(self, n_warmup: int = 10, n_runs: int = 100) -> dict:
        """
        Measures mean and p95 inference latency on dummy input.
        SLA = 50ms mean.

        Returns:
            {'mean_ms': float, 'p95_ms': float, 'passes_sla': bool}
        """
        dummy = torch.randn(1, 4, 12, 128, 128).to(self.device)

        for _ in range(n_warmup):
            with torch.no_grad():
                self.model(dummy)

        latencies = []
        for _ in range(n_runs):
            t0 = time.perf_counter()
            with torch.no_grad():
                self.model(dummy)
            latencies.append((time.perf_counter() - t0) * 1000.0)

        mean_ms = float(np.mean(latencies))
        p95_ms  = float(np.percentile(latencies, 95))
        return {
            'mean_ms':    mean_ms,
            'p95_ms':     p95_ms,
            'passes_sla': mean_ms < 50.0,
        }
