"""
M2 Test Suite — ConvectNet Models
Run: PYTHONPATH=.. pytest tests/test_convectnet.py -v
"""
import sys
import os
import inspect

import numpy as np
import pytest
import torch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from convectnow.backend.models.convectnet import ConvectNet, SpatioTemporalConvLSTM
from convectnow.backend.models.losses import (
    AsymmetricLoss, AsymmetricContinuousLoss, ConvectNetLoss
)
from convectnow.backend.models.inference import ConvectNetInference


# ── helpers ──────────────────────────────────────────────────────────────────

def _dummy_targets(B: int) -> dict:
    return {
        'posh':            torch.rand(B),
        'mesh_mm':         torch.rand(B) * 50.0,
        'cloudburst_flag': torch.randint(0, 2, (B,)).float(),
        'rain_rate_mmh':   torch.rand(B) * 150.0,
        'gust_kmh':        torch.rand(B) * 100.0,
        'ci_prob':         torch.rand(B),
    }


# ── tests ─────────────────────────────────────────────────────────────────────

def test_convectnet_output_shapes():
    """All output keys present and shapes correct."""
    model = ConvectNet()
    model.eval()
    x = torch.randn(2, 4, 12, 64, 64)   # smaller H/W for speed
    with torch.no_grad():
        out = model(x)
    assert set(out.keys()) == {'hail', 'cloudburst', 'downburst', 'ci', 'latent'}
    assert out['hail'].shape       == (2, 3)
    assert out['cloudburst'].shape == (2, 2)
    assert out['downburst'].shape  == (2, 1)
    assert out['ci'].shape         == (2, 1)
    assert out['latent'].shape     == (2, 128)


def test_no_adaptive_pool3d():
    """MPS compatibility: ConvectNet must not instantiate AdaptiveAvgPool3d anywhere."""
    model = ConvectNet()
    for name, module in model.named_modules():
        assert not isinstance(module, torch.nn.AdaptiveAvgPool3d), (
            f'AdaptiveAvgPool3d found at {name} — breaks Apple MPS!'
        )


def test_device_forward():
    """Model forward pass completes on the best available device."""
    device = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')
    model = ConvectNet().to(device).eval()
    x = torch.randn(1, 4, 12, 64, 64).to(device)
    with torch.no_grad():
        out = model(x)
    assert out['latent'].shape == (1, 128)
    assert not torch.isnan(out['latent']).any()


def test_asl_gradients():
    """ASL produces non-NaN gradients."""
    asl    = AsymmetricLoss()
    logits = torch.randn(8, requires_grad=True)
    targets = torch.randint(0, 2, (8,)).float()
    loss   = asl(logits, targets)
    loss.backward()
    assert logits.grad is not None
    assert not torch.isnan(logits.grad).any()


def test_acl_asymmetry():
    """Under-prediction must cost strictly more than over-prediction."""
    acl    = AsymmetricContinuousLoss(alpha_under=3.0, alpha_over=1.0)
    target = torch.tensor([0.5])
    loss_under = acl(torch.tensor([0.2]), target)  # pred < target
    loss_over  = acl(torch.tensor([0.8]), target)  # pred > target
    assert loss_under.item() > loss_over.item(), (
        f'Under-prediction loss {loss_under.item():.4f} should exceed '
        f'over-prediction loss {loss_over.item():.4f}'
    )


def test_multitask_loss_backprop():
    """Full multi-task loss backpropagates without NaN."""
    model     = ConvectNet()
    criterion = ConvectNetLoss()
    x         = torch.randn(2, 4, 12, 64, 64)
    preds     = model(x)
    targets   = _dummy_targets(2)
    loss_dict = criterion(preds, targets)

    assert 'total' in loss_dict
    assert not torch.isnan(loss_dict['total']), 'Total loss is NaN'

    loss_dict['total'].backward()
    # Check at least one parameter received a gradient
    for p in model.parameters():
        if p.grad is not None:
            assert not torch.isnan(p.grad).any()
            break


def test_inference_predict_ranges():
    """All output values within valid physical ranges."""
    engine = ConvectNetInference()
    x      = np.random.randn(4, 12, 128, 128).astype(np.float32)
    r      = engine.predict(x)

    assert 0.0 <= r['posh']           <= 1.0,   f"posh={r['posh']}"
    assert 0.0 <= r['mesh_mm']        <= 100.0, f"mesh_mm={r['mesh_mm']}"
    assert isinstance(r['cloudburst_flag'], bool)
    assert 0.0 <= r['rain_rate_mmh']  <= 300.0, f"rain_rate={r['rain_rate_mmh']}"
    assert 0.0 <= r['gust_kmh']       <= 200.0, f"gust={r['gust_kmh']}"
    assert 0.0 <= r['ci_prob']        <= 1.0,   f"ci_prob={r['ci_prob']}"
    assert len(r['latent_embedding']) == 128


def test_inference_benchmark():
    """Benchmark returns valid structure; SLA key is bool."""
    engine = ConvectNetInference()
    stats  = engine.benchmark(n_warmup=2, n_runs=10)
    assert 'mean_ms'    in stats
    assert 'p95_ms'     in stats
    assert 'passes_sla' in stats
    assert isinstance(stats['passes_sla'], bool)
    print(
        f"\nBenchmark: mean={stats['mean_ms']:.2f}ms  "
        f"p95={stats['p95_ms']:.2f}ms  "
        f"SLA={'PASS' if stats['passes_sla'] else 'FAIL'}"
    )
