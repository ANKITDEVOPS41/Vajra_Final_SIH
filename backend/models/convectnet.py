"""
ConvectNet — Multi-Task Spatiotemporal Nowcasting Model
SIH PS-26084 · MoES/NCMRWF · DEBUG THUGS

Architecture:
  3D-CNN Encoder (with Residuals and CBAM) → SpatioTemporalConvLSTM → AdaptiveAvgPool2D (MPS-safe) → SE Block → Shared FC → 4 Hazard Heads

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
          CBAM uses 2D operations on reshaped tensors.
"""
from typing import Any

import torch
from torch import nn


class ChannelAttention(nn.Module):
    """Channel attention module for CBAM."""
    def __init__(self, in_planes: int, ratio: int = 16):
        super().__init__()
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.max_pool = nn.AdaptiveMaxPool2d(1)
           
        self.mlp = nn.Sequential(
            nn.Conv2d(in_planes, in_planes // ratio, 1, bias=False),
            nn.ReLU(inplace=True),
            nn.Conv2d(in_planes // ratio, in_planes, 1, bias=False)
        )
        self.sigmoid = nn.Sigmoid()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        avg_out = self.mlp(self.avg_pool(x))
        max_out = self.mlp(self.max_pool(x))
        out = avg_out + max_out
        return self.sigmoid(out)


class SpatialAttention(nn.Module):
    """Spatial attention module for CBAM."""
    def __init__(self, kernel_size: int = 7):
        super().__init__()
        assert kernel_size in (3, 7), 'kernel size must be 3 or 7'
        padding = 3 if kernel_size == 7 else 1

        self.conv1 = nn.Conv2d(2, 1, kernel_size, padding=padding, bias=False)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        avg_out = torch.mean(x, dim=1, keepdim=True)
        max_out, _ = torch.max(x, dim=1, keepdim=True)
        x_cat = torch.cat([avg_out, max_out], dim=1)
        out = self.conv1(x_cat)
        return self.sigmoid(out)


class CBAM2D(nn.Module):
    """CBAM: Convolutional Block Attention Module (Woo et al. 2018)."""
    def __init__(self, in_planes: int, ratio: int = 16, kernel_size: int = 7):
        super().__init__()
        self.ca = ChannelAttention(in_planes, ratio)
        self.sa = SpatialAttention(kernel_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out = x * self.ca(x)
        out = out * self.sa(out)
        return out


class CBAMBlock3DWrapper(nn.Module):
    """Applies 2D CBAM to 3D spatiotemporal tensors by treating time as batch."""
    def __init__(self, in_planes: int, ratio: int = 16, kernel_size: int = 7):
        super().__init__()
        self.cbam = CBAM2D(in_planes, ratio, kernel_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, C, T, H, W = x.shape
        # reshape to (B*T, C, H, W)
        x_2d = x.transpose(1, 2).reshape(B * T, C, H, W)
        out_2d = self.cbam(x_2d)
        # reshape back to (B, C, T, H, W)
        out_3d = out_2d.view(B, T, C, H, W).transpose(1, 2)
        return out_3d


class ResEncoderBlock(nn.Module):
    """3D-CNN Encoder block with Residual connection and CBAM."""
    def __init__(self, in_channels: int, out_channels: int, pool: bool = False):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv3d(in_channels, out_channels, kernel_size=(3, 3, 3), padding=1),
            nn.BatchNorm3d(out_channels),
            nn.LeakyReLU(0.1, inplace=True)
        )
        self.pool = nn.MaxPool3d((1, 2, 2)) if pool else nn.Identity()
        self.cbam = CBAMBlock3DWrapper(out_channels)
        
        if in_channels != out_channels or pool:
            stride = (1, 2, 2) if pool else (1, 1, 1)
            self.skip = nn.Sequential(
                nn.Conv3d(in_channels, out_channels, kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm3d(out_channels)
            )
        else:
            self.skip = nn.Identity()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        identity = self.skip(x)
        out = self.conv(x)
        out = self.pool(out)
        out = self.cbam(out)
        out = out + identity
        return nn.functional.leaky_relu(out, 0.1, inplace=True)


class SEBlock1D(nn.Module):
    """Squeeze-and-Excitation block for 1D latent representations."""
    def __init__(self, channels: int, reduction: int = 16):
        super().__init__()
        self.fc = nn.Sequential(
            nn.Linear(channels, channels // reduction, bias=False),
            nn.ReLU(inplace=True),
            nn.Linear(channels // reduction, channels, bias=False),
            nn.Sigmoid()
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x is (B, C)
        weight = self.fc(x)
        return x * weight


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

        # ── 3D-CNN Encoder with Residuals and CBAM ──────────────────────
        self.enc1 = ResEncoderBlock(4, 32, pool=False)
        self.enc2 = ResEncoderBlock(32, 64, pool=True)     # spatial /2
        self.enc3 = ResEncoderBlock(64, 128, pool=True)    # spatial /4 total

        # ── Temporal fusion ─────────────────────────────────────────────
        self.convlstm = SpatioTemporalConvLSTM(
            in_channels=128, hidden_channels=128, num_layers=2
        )

        # ── MPS-SAFE 2D spatial pool (NO AdaptiveAvgPool3d!) ────────────
        self.spatial_pool = nn.AdaptiveAvgPool2d((1, 1))  # → (B, 128, 1, 1)

        # ── Squeeze-and-Excitation on Latent ────────────────────────────
        self.se_block = SEBlock1D(128)

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

        # ── Spatial Nowcast Reconstruction Decoder (H/4, W/4 -> H, W) ─
        self.spatial_nowcast_head = nn.Sequential(
            nn.ConvTranspose2d(128, 64, kernel_size=2, stride=2),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.ConvTranspose2d(64, 32, kernel_size=2, stride=2),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.Conv2d(32, 1, kernel_size=3, padding=1)
        )

    def forward(self, x: torch.Tensor) -> dict[str, torch.Tensor]:
        """
        Args:
            x: (B, 4, T, H, W) or (B, T, 4, H, W) — 4 channels, T timesteps, H, W
        Returns:
            dict with keys: hail, cloudburst, downburst, ci, latent, spatial_nowcast
        """
        if x.ndim == 4:
            x = x.unsqueeze(0)
        # Handle (B, T, C, H, W) permutation if passed from Kaggle or video loader
        if x.ndim == 5 and x.shape[1] > x.shape[2] and x.shape[2] in (3, 4):
            x = x.permute(0, 2, 1, 3, 4)
        if x.shape[1] == 3:
            c3 = torch.zeros_like(x[:, :1])
            x = torch.cat([x, c3], dim=1)

        # 3D encode
        x = self.enc1(x)           # (B, 32,  T,   H,   W  )
        x = self.enc2(x)           # (B, 64,  T,   H/2, W/2)
        x = self.enc3(x)           # (B, 128, T,   H/4, W/4)

        # Temporal fusion → (B, 128, H/4, W/4)
        feat_2d = self.convlstm(x)

        # Spatial nowcast reconstruction → (B, 1, H, W)
        spatial_nowcast = torch.sigmoid(self.spatial_nowcast_head(feat_2d))

        # MPS-safe pool → (B, 128)
        x_pooled = self.spatial_pool(feat_2d)   # (B, 128, 1, 1)
        x_flat = x_pooled.flatten(1)            # (B, 128)
        
        # Squeeze-and-Excitation on latent
        x_se = self.se_block(x_flat)

        latent = self.shared_fc(x_se) # (B, 128)

        return {
            'hail':            self.hail_head(latent),
            'cloudburst':      self.cloudburst_head(latent),
            'downburst':       self.downburst_head(latent),
            'ci':              self.ci_head(latent),
            'latent':          latent,
            'spatial_nowcast': spatial_nowcast,
        }

    def predict_with_uncertainty(self, x: torch.Tensor, n_samples: int = 10) -> dict[str, Any]:
        """
        Runs the model n_samples times with dropout enabled to estimate epistemic uncertainty.
        Returns mean predictions + std (uncertainty) for each head.
        """
        self.eval()
        # Keep dropout ON
        for m in self.modules():
            if m.__class__.__name__.startswith('Dropout'):
                m.train()
                
        preds = {k: [] for k in ['hail', 'cloudburst', 'downburst', 'ci', 'latent', 'spatial_nowcast']}
        
        with torch.no_grad():
            for _ in range(n_samples):
                out = self.forward(x)
                for k, v in out.items():
                    preds[k].append(v)
                    
        res = {}
        uncertainty = {}
        for k, v_list in preds.items():
            stacked = torch.stack(v_list, dim=0) # (n_samples, B, ...)
            res[k] = stacked.mean(dim=0)
            uncertainty[k] = stacked.std(dim=0)
            
        res['uncertainty'] = uncertainty
        return res
