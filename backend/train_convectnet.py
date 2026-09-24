"""
ConvectNet Training Script — SIH PS-26084
Usage: PYTHONPATH=.. python backend/train_convectnet.py [--epochs N] [--batch-size N]
Falls back to SyntheticConvectDataset when SEVIR HDF5 not present.
"""
import argparse
import os
import sys

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

# Allow running as: PYTHONPATH=.. python backend/train_convectnet.py
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from convectnow.backend.models.convectnet import ConvectNet
from convectnow.backend.models.losses import ConvectNetLoss
from convectnow.backend.models.inference import ConvectNetInference


# ── Synthetic Dataset ────────────────────────────────────────────────────────

class SyntheticConvectDataset(Dataset):
    """
    Physics-motivated synthetic storm dataset.
    1000 events · (4, 12, 128, 128) per sample.

    C0 VIL:       log-normal spatial, growing over time
    C1 delta-Z:   Gaussian temporal growth
    C2 IR Tb:     inverted Gaussian cold-core signal
    C3 Lightning: Poisson-distributed near VIL peak
    """

    def __init__(self, n_samples: int = 200, seed: int = 42):
        super().__init__()
        self.n = n_samples
        rng = np.random.default_rng(seed)
        T, H, W = 12, 128, 128
        self.data: list = []
        self.targets: list = []

        for _ in range(n_samples):
            # Random storm centre
            cy, cx = rng.integers(32, 96, size=2)
            yy, xx = np.meshgrid(np.arange(H), np.arange(W), indexing='ij')
            r = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2).astype(np.float32)

            # VIL: log-normal, intensifies over time
            vil = np.stack([
                np.clip(rng.lognormal(3.5 - r / 60.0, 1.2) * (1.0 + 0.05 * t), 0, 1)
                for t in range(T)
            ], axis=0).astype(np.float32)

            # Delta-Z: temporal growth noise
            dz = np.clip(rng.normal(0.05, 0.3, (T, H, W)), -1.0, 1.0).astype(np.float32)

            # IR Tb: cold core (inverted Gaussian from storm centre)
            ir_frame = np.clip(1.0 - np.exp(-r ** 2 / 2000.0), 0, 1).astype(np.float32)
            ir = np.stack([ir_frame] * T, axis=0)

            # Lightning: Poisson near core
            lght = rng.poisson(np.exp(-r / 20.0).astype(np.float64), (T, H, W)).astype(np.float32)
            lght_max = lght.max()
            if lght_max > 0:
                lght /= lght_max

            x = np.stack([vil, dz, ir, lght], axis=0)  # (4, T, H, W)

            self.data.append(torch.from_numpy(x))
            self.targets.append({
                'posh':            torch.tensor(float(rng.uniform(0, 1)),   dtype=torch.float32),
                'mesh_mm':         torch.tensor(float(rng.uniform(0, 80)),  dtype=torch.float32),
                'cloudburst_flag': torch.tensor(float(rng.integers(0, 2)), dtype=torch.float32),
                'rain_rate_mmh':   torch.tensor(float(rng.uniform(0, 200)), dtype=torch.float32),
                'gust_kmh':        torch.tensor(float(rng.uniform(0, 150)), dtype=torch.float32),
                'ci_prob':         torch.tensor(float(rng.uniform(0, 1)),   dtype=torch.float32),
            })

    def __len__(self) -> int:
        return self.n

    def __getitem__(self, idx):
        return self.data[idx], self.targets[idx]


def collate_fn(batch):
    xs, ts = zip(*batch)
    x = torch.stack(xs)
    keys = ts[0].keys()
    t = {k: torch.stack([s[k] for s in ts]) for k in keys}
    return x, t


# ── Training ─────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Train ConvectNet')
    parser.add_argument('--epochs',     type=int,   default=5)
    parser.add_argument('--batch-size', type=int,   default=4)
    parser.add_argument('--lr',         type=float, default=1e-3)
    parser.add_argument('--device',     default='auto')
    args = parser.parse_args()

    # Device
    if args.device == 'auto':
        if torch.backends.mps.is_available():
            device = torch.device('mps')
        elif torch.cuda.is_available():
            device = torch.device('cuda')
        else:
            device = torch.device('cpu')
    else:
        device = torch.device(args.device)
    print(f'[ConvectNet] Device: {device}')

    # Dataset
    try:
        from convectnow.backend.data.dataset_sevir import ConvectDataset
        ds = ConvectDataset(split='train')
        print(f'[ConvectNet] SEVIR dataset: {len(ds)} events')
        loader_collate = None
    except Exception as e:
        print(f'[ConvectNet] SEVIR unavailable ({e}) — using SyntheticConvectDataset')
        ds = SyntheticConvectDataset(n_samples=200)
        loader_collate = collate_fn

    dl = DataLoader(
        ds,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=0,
        collate_fn=loader_collate,
    )

    model     = ConvectNet().to(device)
    criterion = ConvectNetLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='min', patience=3, factor=0.5, verbose=True
    )

    out_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(out_dir, exist_ok=True)
    ckpt_path = os.path.join(out_dir, 'best_convectnet.pt')

    best_loss       = float('inf')
    patience_counter = 0

    for epoch in range(args.epochs):
        model.train()
        running_loss = 0.0
        last_dict: dict = {}

        for batch_x, batch_t in dl:
            batch_x = batch_x.to(device)
            batch_t = {k: v.to(device) for k, v in batch_t.items()}

            preds     = model(batch_x)
            loss_dict = criterion(preds, batch_t)

            optimizer.zero_grad()
            loss_dict['total'].backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            running_loss += loss_dict['total'].item()
            last_dict = loss_dict

        avg = running_loss / len(dl)
        scheduler.step(avg)
        print(
            f'Epoch {epoch+1:3d}/{args.epochs} | loss={avg:.4f} | '
            f'hail={last_dict.get("hail",0):.4f} cb={last_dict.get("cloudburst",0):.4f} '
            f'db={last_dict.get("downburst",0):.4f} ci={last_dict.get("ci",0):.4f}'
        )

        if avg < best_loss:
            best_loss = avg
            torch.save(model.state_dict(), ckpt_path)
            print(f'  ✓ Saved best checkpoint (loss={best_loss:.4f})')
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= 5:
                print('Early stopping triggered.')
                break

    print(f'\n[ConvectNet] Training complete. Best loss: {best_loss:.4f}')
    print(f'[ConvectNet] Checkpoint: {ckpt_path}')

    # Inference benchmark
    print('\n[ConvectNet] Running inference benchmark...')
    engine = ConvectNetInference(checkpoint_path=ckpt_path)
    stats  = engine.benchmark(n_warmup=5, n_runs=50)
    sla    = 'PASS ✓' if stats['passes_sla'] else 'FAIL ✗'
    print(f'  Latency: mean={stats["mean_ms"]:.2f}ms  p95={stats["p95_ms"]:.2f}ms  SLA={sla}')


if __name__ == '__main__':
    main()
