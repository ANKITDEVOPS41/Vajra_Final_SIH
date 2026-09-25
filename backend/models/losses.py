"""
ConvectNet Loss Functions — SIH PS-26084
ASL: Asymmetric Loss for binary classification heads
ACL: Asymmetric Continuous Loss for regression heads (under-prediction 3x penalty)
ConvectNetLoss: Multi-task combined loss
"""
import torch
import torch.nn.functional as F
from torch import nn


class AsymmetricLoss(nn.Module):
    """
    Ridnik et al. 2021 ASL adapted for convective hazard binary classification.
    gamma_pos=1, gamma_neg=4 — false negatives cost 4x more than false positives.
    margin=0.05 — shifts negative probabilities to reduce easy-negative dominance.
    """
    def __init__(self, gamma_pos: float = 1.0, gamma_neg: float = 4.0,
                 margin: float = 0.05, eps: float = 1e-6):
        super().__init__()
        self.gamma_pos = gamma_pos
        self.gamma_neg = gamma_neg
        self.margin = margin
        self.eps = eps

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        p = torch.sigmoid(logits)
        p = torch.clamp(p, self.eps, 1.0 - self.eps)
        # Shift negative probs by margin
        p_neg = torch.clamp(p - self.margin, min=0.0)
        # Focal weights
        loss_pos = targets * (1.0 - p) ** self.gamma_pos * torch.log(p)
        loss_neg = (1.0 - targets) * p_neg ** self.gamma_neg * torch.log(1.0 - p_neg + self.eps)
        return -(loss_pos + loss_neg).mean()


class AsymmetricContinuousLoss(nn.Module):
    """
    Asymmetric MSE for regression heads.
    Under-prediction (pred < target) penalized alpha_under x over-prediction.
    Default: alpha_under=3.0 — missing a severe weather event is 3x worse than a false alarm.
    """
    def __init__(self, alpha_under: float = 3.0, alpha_over: float = 1.0):
        super().__init__()
        self.alpha_under = alpha_under
        self.alpha_over = alpha_over

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        diff = pred - target
        weights = torch.where(
            diff < 0,
            torch.full_like(diff, self.alpha_under),
            torch.full_like(diff, self.alpha_over)
        )
        return (weights * diff ** 2).mean()


class ConvectNetLoss(nn.Module):
    """
    Multi-task loss combining all 4 ConvectNet heads.

    Task weights:
      hail=0.30, cloudburst=0.35, downburst=0.20, ci=0.15

    Hail head (B,3): [SHI-proxy, POSH-proxy, MESH-proxy]
      → ACL on POSH (normalized), ACL on MESH (normalized /100)
    Cloudburst head (B,2): [flag-logit, rain_rate-raw]
      → 0.5*ASL(flag) + 0.5*ACL(rain_rate /300)
    Downburst head (B,1): [gust-raw]
      → ACL(gust /200)
    CI head (B,1): [ci-logit]
      → ASL(ci_prob)

    Returns dict: {'total': Tensor, 'hail': float, 'cloudburst': float,
                   'downburst': float, 'ci': float}
    """
    def __init__(self):
        super().__init__()
        self.asl = AsymmetricLoss()
        self.acl = AsymmetricContinuousLoss()
        self.w = {'hail': 0.30, 'cloudburst': 0.35, 'downburst': 0.20, 'ci': 0.15}

    def forward(self, preds: dict, targets: dict) -> dict:
        h = preds['hail']       # (B, 3)
        c = preds['cloudburst'] # (B, 2)
        d = preds['downburst']  # (B, 1)
        ci = preds['ci']        # (B, 1)

        # Hail: POSH on channels 0&1, MESH on channel 2
        hail_loss = (
            self.acl(torch.sigmoid(h[:, 0]), targets['posh']) +
            self.acl(torch.sigmoid(h[:, 1]), targets['posh']) +
            self.acl(
                torch.clamp(F.softplus(h[:, 2]) / 100.0, 0.0, 1.0),
                targets['mesh_mm'] / 100.0
            )
        ) / 3.0

        # Cloudburst
        cb_loss = (
            0.5 * self.asl(c[:, 0], targets['cloudburst_flag']) +
            0.5 * self.acl(
                torch.clamp(F.softplus(c[:, 1]) / 300.0, 0.0, 1.0),
                targets['rain_rate_mmh'] / 300.0
            )
        )

        # Downburst
        db_loss = self.acl(
            torch.clamp(F.softplus(d[:, 0]) / 200.0, 0.0, 1.0),
            targets['gust_kmh'] / 200.0
        )

        # CI
        ci_loss = self.asl(ci[:, 0], targets['ci_prob'])

        # Spatial Nowcast (echo extrapolation loss if target available)
        spatial_loss = torch.tensor(0.0, device=h.device)
        if 'spatial_nowcast' in preds and 'future_vil' in targets:
            spatial_loss = F.mse_loss(preds['spatial_nowcast'], targets['future_vil'])

        total = (
            self.w['hail'] * hail_loss +
            self.w['cloudburst'] * cb_loss +
            self.w['downburst'] * db_loss +
            self.w['ci'] * ci_loss +
            0.40 * spatial_loss
        )

        return {
            'total':      total,
            'hail':       hail_loss.item(),
            'cloudburst': cb_loss.item(),
            'downburst':  db_loss.item(),
            'ci':         ci_loss.item(),
            'spatial':    spatial_loss.item(),
        }
