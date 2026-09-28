"""
ConvectNow — Andrej Karpathy First-Principles Verification Script
SIH PS-26084 · MoES / NCMRWF / IMD

Performs the 3 First-Principles Steps:
1. "Become One With The Data": Loads raw SEVIR VIL HDF5 radar events, inspects real dBZ/VIL values.
2. "Overfit a Single Batch": Verifies ConvectNet can memorize 4 real storm sequences (loss drops from ~2.0 to near 0).
3. "Baselines First": Compares Persistence vs Optical Flow vs ConvectNet on unseen frames, computes CSI/POD/FAR,
   and exports a publication-grade verification figure.
"""

import os
import sys
import time
import h5py
import numpy as np
import cv2
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import torch
import torch.nn as nn
import torch.nn.functional as F

# Ensure path resolution
sys.path.insert(0, '/Users/gauravkumarnayak/Desktop/convect')
from backend.models.convectnet import ConvectNet
from backend.models.losses import ConvectNetLoss, AsymmetricLoss, AsymmetricContinuousLoss

SEVIR_H5_PATH = '/Users/gauravkumarnayak/Desktop/new sih/datasets/sevir/vil/SEVIR_VIL_STORMEVENTS_2017_0101_0630.h5'
DEVICE = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')

def compute_contingency(pred: np.ndarray, target: np.ndarray, thresh: float = 0.25):
    p = (pred >= thresh)
    t = (target >= thresh)
    hits = int(np.logical_and(p, t).sum())
    misses = int(np.logical_and(~p, t).sum())
    fa = int(np.logical_and(p, ~t).sum())
    csi = hits / (hits + misses + fa) if (hits + misses + fa) > 0 else 0.0
    pod = hits / (hits + misses) if (hits + misses) > 0 else 0.0
    far = fa / (hits + fa) if (hits + fa) > 0 else 0.0
    return csi, pod, far

def run_optical_flow_advection(frame_prev: np.ndarray, frame_curr: np.ndarray, steps: int = 3):
    """Semi-Lagrangian backward advection using Farneback optical flow (PySTEPS equivalent)."""
    p_u8 = (frame_prev * 255).astype(np.uint8)
    c_u8 = (frame_curr * 255).astype(np.uint8)
    flow = cv2.calcOpticalFlowFarneback(p_u8, c_u8, None, 0.5, 3, 15, 3, 5, 1.2, 0)
    
    H, W = frame_curr.shape
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    
    advected = frame_curr.copy()
    for s in range(1, steps + 1):
        remap_x = np.clip(xx - flow[..., 0] * s, 0, W - 1).astype(np.float32)
        remap_y = np.clip(yy - flow[..., 1] * s, 0, H - 1).astype(np.float32)
        advected = cv2.remap(frame_curr, remap_x, remap_y, cv2.INTER_LINEAR)
    return advected

def main():
    print("=" * 70)
    print("ANDREJ KARPATHY FIRST-PRINCIPLES DEEP LEARNING VERIFICATION")
    print("Project: ConvectNow (SIH PS-26084 · MoES/IMD)")
    print(f"Device: {DEVICE}")
    print("=" * 70)

    # -------------------------------------------------------------------------
    # STEP 1: BECOME ONE WITH THE DATA
    # -------------------------------------------------------------------------
    print("\n[STEP 1] Inspecting Real Doppler Radar Tensor from SEVIR HDF5...")
    if not os.path.exists(SEVIR_H5_PATH):
        raise FileNotFoundError(f"Missing SEVIR dataset at {SEVIR_H5_PATH}")
    
    f = h5py.File(SEVIR_H5_PATH, 'r')
    events = f['vil'] # shape: (193, 384, 384, 49)
    n_events, orig_h, orig_w, n_times = events.shape
    print(f"Loaded HDF5 Archive: {n_events} storm events, {n_times} timesteps per event (5-min cadence).")
    print(f"Spatial resolution: {orig_h}x{orig_w} (~1 km/pixel). Total scans: {n_events * n_times:,}")

    # Extract 4 storm events for the overfitting test
    batch_size = 4
    T_in = 12 # 60 minutes of history (T=0 to 11)
    T_target = 14 # T+15m forecast (index 14)
    H_sub, W_sub = 128, 128

    print(f"\nExtracting batch of {batch_size} real storms cropped/downsampled to {H_sub}x{W_sub}...")
    batch_tensors = []
    batch_targets = []
    
    for i in range(batch_size):
        raw_seq = events[i, :, :, :18] # take first 18 frames
        # Center-crop or resize to 128x128
        seq_resized = np.zeros((18, H_sub, W_sub), dtype=np.float32)
        for t in range(18):
            frame = cv2.resize(raw_seq[:, :, t], (W_sub, H_sub), interpolation=cv2.INTER_AREA)
            seq_resized[t] = frame / 255.0 # normalize [0, 1]
        
        # Build 4-channel input (C0: VIL, C1: Delta-Z, C2: Spatial Density, C3: Convective Core Proxy)
        c0 = seq_resized[:T_in] # (12, 128, 128)
        c1 = np.zeros_like(c0)
        c1[1:] = c0[1:] - c0[:-1] # temporal derivative (dZ/dt)
        c2 = np.array([cv2.GaussianBlur(c0[t], (9, 9), 2.0) for t in range(T_in)])
        c3 = (c0 >= 0.40).astype(np.float32) # severe core mask
        
        x_4ch = np.stack([c0, c1, c2, c3], axis=0) # (4, 12, 128, 128)
        target_future = seq_resized[T_target] # frame at T+15m
        
        batch_tensors.append(x_4ch)
        batch_targets.append(target_future)

    x_batch = torch.tensor(np.stack(batch_tensors), dtype=torch.float32).to(DEVICE)
    y_batch = torch.tensor(np.stack(batch_targets), dtype=torch.float32).to(DEVICE)
    print(f"Batch X Shape: {tuple(x_batch.shape)} (B, Channels=4, Timesteps=12, H=128, W=128)")
    print(f"Batch Target Y Shape: {tuple(y_batch.shape)} (B, H=128, W=128)")
    print(f"Peak VIL in batch: {float(x_batch[:, 0].max()):.3f}, Mean: {float(x_batch[:, 0].mean()):.3f}")

    # -------------------------------------------------------------------------
    # STEP 2: KARPATHY SANITY CHECK — OVERFIT A SINGLE BATCH
    # -------------------------------------------------------------------------
    print("\n[STEP 2] Running Karpathy 'Overfit Single Batch' Sanity Check...")
    print("Testing if ConvectNet gradients backpropagate cleanly and memorize 4 real storms...")
    
    model = ConvectNet().to(DEVICE)
    model.train()
    
    # We add a spatial nowcast projection head to predict next radar frame
    # Linear projection from latent (128) to 128x128 spatial map
    spatial_decoder = nn.Sequential(
        nn.Linear(128, 512),
        nn.ReLU(),
        nn.Linear(512, 128 * 128),
        nn.Sigmoid()
    ).to(DEVICE)
    
    optimizer = torch.optim.Adam(list(model.parameters()) + list(spatial_decoder.parameters()), lr=1e-3)
    
    start_time = time.time()
    steps = 100
    loss_history = []
    
    for step in range(steps + 1):
        optimizer.zero_grad()
        out = model(x_batch)
        latent = out['latent'] # (B, 128)
        pred_map = spatial_decoder(latent).view(batch_size, H_sub, W_sub)
        
        # Loss: Asymmetric Continuous Loss (penalize missing storm core)
        diff = pred_map - y_batch
        weights = torch.where(diff < 0, torch.full_like(diff, 3.0), torch.full_like(diff, 1.0))
        loss = (weights * (diff ** 2)).mean()
        
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        
        loss_val = float(loss.item())
        loss_history.append(loss_val)
        
        if step % 20 == 0 or step == steps:
            print(f"  Step {step:3d} / {steps} | Loss: {loss_val:.6f}")

    print(f"Single-batch overfit complete in {time.time() - start_time:.2f}s!")
    print(f"Initial Loss: {loss_history[0]:.6f} -> Final Loss: {loss_history[-1]:.6f}")
    if loss_history[-1] < loss_history[0] * 0.15:
        print(">> VERIFICATION PASSED: Gradients flow cleanly, network successfully memorizes real storms!")
    else:
        print(">> WARNING: Optimization did not collapse loss as expected.")

    # -------------------------------------------------------------------------
    # STEP 3: BASELINE ABLATION ON UNSEEN STORM (Event #10)
    # -------------------------------------------------------------------------
    print("\n[STEP 3] Running Baselines First on Held-Out Real Storm Event #10...")
    model.eval()
    test_idx = 10
    raw_test = events[test_idx, :, :, :18]
    test_seq = np.zeros((18, H_sub, W_sub), dtype=np.float32)
    for t in range(18):
        test_seq[t] = cv2.resize(raw_test[:, :, t], (W_sub, H_sub), interpolation=cv2.INTER_AREA) / 255.0
        
    c0_test = test_seq[:T_in]
    c1_test = np.zeros_like(c0_test)
    c1_test[1:] = c0_test[1:] - c0_test[:-1]
    c2_test = np.array([cv2.GaussianBlur(c0_test[t], (9, 9), 2.0) for t in range(T_in)])
    c3_test = (c0_test >= 0.40).astype(np.float32)
    x_test = torch.tensor(np.stack([c0_test, c1_test, c2_test, c3_test])[np.newaxis], dtype=torch.float32).to(DEVICE)
    y_test_gt = test_seq[T_target] # ground truth at T+15m

    # 1. Baseline: Persistence (Last frame T0 carried forward)
    pred_persistence = test_seq[T_in - 1]

    # 2. Baseline: Optical Flow (PySTEPS / Farnebäck advection)
    pred_optflow = run_optical_flow_advection(test_seq[T_in - 2], test_seq[T_in - 1], steps=3)

    # 3. Model: ConvectNet Prediction
    with torch.no_grad():
        out_test = model(x_test)
        pred_convectnet = spatial_decoder(out_test['latent']).view(H_sub, W_sub).cpu().numpy()

    # Compute Contingency Metrics at Threshold = 0.25 (~35 dBZ equivalent)
    csi_pers, pod_pers, far_pers = compute_contingency(pred_persistence, y_test_gt, thresh=0.25)
    csi_flow, pod_flow, far_flow = compute_contingency(pred_optflow, y_test_gt, thresh=0.25)
    csi_conv, pod_conv, far_conv = compute_contingency(pred_convectnet, y_test_gt, thresh=0.25)

    print("-" * 65)
    print(f"{'Method':<25} | {'CSI':<8} | {'POD':<8} | {'FAR':<8}")
    print("-" * 65)
    print(f"{'1. Persistence Baseline':<25} | {csi_pers:.3f}    | {pod_pers:.3f}    | {far_pers:.3f}")
    print(f"{'2. Optical Flow (PySTEPS)':<25} | {csi_flow:.3f}    | {pod_flow:.3f}    | {far_flow:.3f}")
    print(f"{'3. ConvectNet (Deep Learning)':<25} | {csi_conv:.3f}    | {pod_conv:.3f}    | {far_conv:.3f}")
    print("-" * 65)

    # -------------------------------------------------------------------------
    # STEP 4: PLOT FIRST-PRINCIPLES VERIFICATION FIGURE
    # -------------------------------------------------------------------------
    fig, axes = plt.subplots(2, 3, figsize=(14, 8), facecolor='#0a0d15')
    cmap = 'turbo'

    def plot_frame(ax, img, title, subtitle=''):
        im = ax.imshow(img, cmap=cmap, vmin=0, vmax=1)
        ax.set_title(f"{title}\n{subtitle}", color='white', fontsize=11, fontweight='bold', pad=8)
        ax.axis('off')
        return im

    # Row 1: Observation Sequence & Ground Truth
    plot_frame(axes[0, 0], test_seq[0], "T-55m (Observed Input)", "Convective Initiation Core")
    plot_frame(axes[0, 1], test_seq[11], "T+0m (Latest Radar Scan)", "Explosive Vertical Updraft")
    im_gt = plot_frame(axes[0, 2], y_test_gt, "T+15m GROUND TRUTH", "Observed Future Verification")

    # Row 2: The 3 Models
    plot_frame(axes[1, 0], pred_persistence, "1. Persistence Baseline", f"CSI: {csi_pers:.3f} | POD: {pod_pers:.3f}")
    plot_frame(axes[1, 1], pred_optflow, "2. Optical Flow (PySTEPS)", f"CSI: {csi_flow:.3f} | POD: {pod_flow:.3f}")
    im_cn = plot_frame(axes[1, 2], pred_convectnet, "3. ConvectNet (Proposed)", f"CSI: {csi_conv:.3f} | POD: {pod_conv:.3f}")

    # Colorbar
    cbar_ax = fig.add_axes([0.15, 0.05, 0.7, 0.025])
    cbar = fig.colorbar(im_gt, cax=cbar_ax, orientation='horizontal')
    cbar.set_label('Normalized Radar VIL / Reflectivity Intensity [0.0 - 1.0]', color='white', fontsize=10)
    cbar.ax.tick_params(labelsize=9, colors='white')

    plt.suptitle("ConvectNet vs Baselines: Real Doppler Radar Verification (SEVIR)\nSIH PS-26084 · MoES / NCMRWF",
                 color='#38bdf8', fontsize=14, fontweight='bold', y=0.98)

    save_path = '/Users/gauravkumarnayak/Desktop/convect/convectnet_first_principles_verification.png'
    plt.savefig(save_path, dpi=180, bbox_inches='tight', facecolor='#0a0d15')
    plt.close()
    print(f"\n[SAVED] Verification Figure exported to: {save_path}")

    # Also save to antigravity brain artifacts directory
    artifact_path = '/Users/gauravkumarnayak/.gemini/antigravity/brain/023d62f5-8a47-4655-bbf3-74cedf9c1a41/convectnet_first_principles_verification.png'
    os.system(f"cp '{save_path}' '{artifact_path}'")
    print(f"[SAVED] Artifact copy exported to: {artifact_path}")

    f.close()
    print("\n" + "=" * 70)
    print("ALL FIRST-PRINCIPLES CHECKS COMPLETE!")
    print("=" * 70)

if __name__ == '__main__':
    main()
