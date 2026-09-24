"""
ConvectNet — Multi-Task Spatiotemporal Nowcasting Model
SIH PS-26084 · MoES/NCMRWF · DEBUG THUGS

Architecture:
  3D-CNN Encoder → SpatioTemporalConvLSTM → AdaptiveAvgPool2D (MPS-safe) → 4 Hazard Heads

Input:  (B, 4, T=12, H=128, W=128)
        C0=VIL, C1=ΔZ, C2=IR-Tb cooling, C3=Lightning

Output: {
  'hail':       (B, 3)   # [SHI-proxy, POSH-proxy, MESH-proxy]
  'cloudburst': (B, 2)   # [binary-logit, rain_rate-raw]
  'downburst':  (B, 1)   # [gust-raw]
  'ci':         (B, 1)   # [ci-logit]
  'latent':     (B, 128) # shared embedding for Shapley attribution
}

CRITICAL: NO AdaptiveAvgPool3d — Apple MPS lacks aten::_adaptive_avg_pool3d.
          Uses AdaptiveAvgPool2d on the spatial dims after ConvLSTM.
"""
import torch
import torch.nn as nn
from typing import Dict


class SpatioTemporalConvLSTMCell(nn.Module):
    """Single ConvLSTM cell operating on 2D spatial feature maps."""

    def __init__(self, in_channels: int, hidden_channels: int, kernel_size: int = 3):
        super().__init__()
        self.hidden_channels = hidden_channels
        padding = kernel_size // 2
        # Gates: i, f, g, o combined
        self.conv = nn.Conv2d(
            in_channels + hidden_channels,
            4 * hidden_channels,
            kernel_size,
            padding=padding,
        )

    def forward(
        self,
        x: torch.Tensor,
        h: torch.Tensor,
        c: torch.Tensor,
    ):
        combined = torch.cat([x, h], dim=1)          # (B, C_in+C_h, H, W)
        gates = self.conv(combined)                   # (B, 4*C_h, H, W)
        i, f, g, o = gates.chunk(4, dim=1)
        c_next = torch.sigmoid(f) * c + torch.sigmoid(i) * torch.tanh(g)
        h_next = torch.sigmoid(o) * torch.tanh(c_next)
        return h_next, c_next


class SpatioTemporalConvLSTM(nn.Module):
    """
    Stacked ConvLSTM encoder over a (B, C, T, H, W) sequence.
    Returns the final hidden state of the last layer: (B, hidden_channels, H, W).
    """

    def __init__(self, in_channels: int, hidden_channels: int = 128, num_layers: int = 2):
        super().__init__()
        self.hidden_channels = hidden_channels
        self.num_layers = num_layers
        cells = []
        for i in range(num_layers):
            c_in = in_channels if i == 0 else hidden_channels
            cells.append(SpatioTemporalConvLSTMCell(c_in, hidden_channels))
        self.cells = nn.ModuleList(cells)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, C, T, H, W = x.shape
        # Initialise hidden/cell states
        h = [torch.zeros(B, self.hidden_channels, H, W, device=x.device, dtype=x.dtype)
             for _ in range(self.num_layers)]
        c = [torch.zeros(B, self.hidden_channels, H, W, device=x.device, dtype=x.dtype)
             for _ in range(self.num_layers)]
        for t in range(T):
            inp = x[:, :, t, :, :]           # (B, C, H, W)
            for idx, cell in enumerate(self.cells):
                h[idx], c[idx] = cell(inp, h[idx], c[idx])
                inp = h[idx]
        return h[-1]                          # (B, hidden_channels, H, W)


class ConvectNet(nn.Module):
    """
    ConvectNet: 3D-CNN + ConvLSTM multi-task nowcasting backbone.
    MPS-compatible (Apple Silicon).
    """

    def __init__(self):
        super().__init__()

        # ── 3D-CNN Encoder ──────────────────────────────────────────────
        self.enc1 = nn.Sequential(
            nn.Conv3d(4, 32, kernel_size=(3, 3, 3), padding=1),
            nn.BatchNorm3d(32),
            nn.LeakyReLU(0.1, inplace=True),
        )
        self.enc2 = nn.Sequential(
            nn.Conv3d(32, 64, kernel_size=(3, 3, 3), padding=1),
            nn.BatchNorm3d(64),
            nn.LeakyReLU(0.1, inplace=True),
            nn.MaxPool3d((1, 2, 2)),          # spatial /2, time preserved
        )
        self.enc3 = nn.Sequential(
            nn.Conv3d(64, 128, kernel_size=(3, 3, 3), padding=1),
            nn.BatchNorm3d(128),
            nn.LeakyReLU(0.1, inplace=True),
            nn.MaxPool3d((1, 2, 2)),          # spatial /4 total
        )

        # ── Temporal fusion ─────────────────────────────────────────────
        self.convlstm = SpatioTemporalConvLSTM(
            in_channels=128, hidden_channels=128, num_layers=2
        )

        # ── MPS-SAFE 2D spatial pool (NO AdaptiveAvgPool3d!) ────────────
        self.spatial_pool = nn.AdaptiveAvgPool2d((1, 1))  # → (B, 128, 1, 1)

        # ── Shared FC ───────────────────────────────────────────────────
        self.shared_fc = nn.Sequential(
            nn.Linear(128, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
        )

        # ── Task heads ──────────────────────────────────────────────────
        self.hail_head = nn.Sequential(
            nn.Linear(128, 64), nn.ReLU(inplace=True), nn.Linear(64, 3)
        )
        self.cloudburst_head = nn.Sequential(
            nn.Linear(128, 64), nn.ReLU(inplace=True), nn.Linear(64, 2)
        )
        self.downburst_head = nn.Sequential(
            nn.Linear(128, 32), nn.ReLU(inplace=True), nn.Linear(32, 1)
        )
        self.ci_head = nn.Sequential(
            nn.Linear(128, 32), nn.ReLU(inplace=True), nn.Linear(32, 1)
        )

    def forward(self, x: torch.Tensor) -> Dict[str, torch.Tensor]:
        """
        Args:
            x: (B, 4, T, H, W) — 4 channels, T=12 timesteps, H=W=128
        Returns:
            dict with keys: hail, cloudburst, downburst, ci, latent
        """
        # 3D encode
        x = self.enc1(x)           # (B, 32,  T,   H,   W  )
        x = self.enc2(x)           # (B, 64,  T,   H/2, W/2)
        x = self.enc3(x)           # (B, 128, T,   H/4, W/4)

        # Temporal fusion → (B, 128, H/4, W/4)
        x = self.convlstm(x)

        # MPS-safe pool → (B, 128)
        x = self.spatial_pool(x)   # (B, 128, 1, 1)
        x = x.flatten(1)           # (B, 128)

        latent = self.shared_fc(x) # (B, 128)

        return {
            'hail':       self.hail_head(latent),
            'cloudburst': self.cloudburst_head(latent),
            'downburst':  self.downburst_head(latent),
            'ci':         self.ci_head(latent),
            'latent':     latent,
        }
