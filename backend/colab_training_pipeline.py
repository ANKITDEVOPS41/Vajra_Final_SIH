"""
ConvectNet MLOps Training Pipeline (Phase 1 & Phase 2 Freezing)
-------------------------------------------------------------------
INSTRUCTIONS FOR GOOGLE COLAB / AWS:

1. THE DATA SITUATION (Transfer Learning):
   - We train on SEVIR (US Storms). Physics of a cumulonimbus cloud is universal.
   - 50GB Hackathon Subset on a Colab T4 GPU takes ~6 hours.
   - 50GB Hackathon Subset on a Colab A100 GPU takes ~1.5 hours.

2. THE 2-PHASE TRAINING STRATEGY:
   - PHASE 1 (Representation Learning): We train the "Shared Body" to understand basic storm 
     physics and Convective Initiation.
   - PHASE 2 (Head Fine-Tuning): We FREEZE the body so it can't change. We then focus 100% of the 
     AI's compute on training the rare hazard heads (Hail, Downburst) on specialized, balanced datasets.
"""

import logging
import os

import torch
from convectnow.backend.models.convectnet import ConvectNet
from torch import nn, optim
from torch.cuda.amp import GradScaler, autocast
from torch.utils.data import DataLoader, Dataset

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

# ==========================================
# 1. SPECIALIZED LOSS FUNCTIONS
# ==========================================
class FocalLoss(nn.Module):
    def __init__(self, alpha=0.25, gamma=2.0):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.bce = nn.BCEWithLogitsLoss(reduction='none')

    def forward(self, inputs, targets):
        bce_loss = self.bce(inputs, targets)
        pt = torch.exp(-bce_loss)
        return (self.alpha * (1 - pt) ** self.gamma * bce_loss).mean()

# ==========================================
# 2. DATASET SIMULATORS
# ==========================================
class GeneralStormDataset(Dataset):
    """ Used for Phase 1: General storm physics and Convective Initiation """
    def __len__(self): return 1000
    def __getitem__(self, idx):
        return torch.randn(4, 12, 128, 128), torch.randint(0, 2, (1,)).float() # Only CI target

class BalancedHailDataset(Dataset):
    """ Used for Phase 2: 50% Hail storms, 50% Non-Hail storms (Perfectly balanced) """
    def __len__(self): return 500
    def __getitem__(self, idx):
        return torch.randn(4, 12, 128, 128), torch.randint(0, 2, (3,)).float() # Only Hail target

# ==========================================
# 3. PHASE 1: TRAIN THE SHARED BODY
# ==========================================
def train_phase1_shared_body(model, device, scaler):
    logger.info("🚀 STARTING PHASE 1: Training Shared Body (General Storm Physics)")
    
    # Enable gradients for the whole model
    for param in model.parameters():
        param.requires_grad = True

    train_loader = DataLoader(GeneralStormDataset(), batch_size=8, shuffle=True)
    optimizer = optim.AdamW(model.parameters(), lr=3e-4)
    criterion = nn.BCEWithLogitsLoss()

    model.train()
    for epoch in range(3): # Short pre-training for hackathon
        epoch_loss = 0.0
        for x, y_ci in train_loader:
            x, y_ci = x.to(device), y_ci.to(device)
            optimizer.zero_grad()
            
            with autocast():
                _, _, _, out_ci, _ = model(x)
                loss = criterion(out_ci, y_ci)
                
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            epoch_loss += loss.item()
            
        logger.info(f"Phase 1 - Epoch {epoch+1} | CI Loss: {epoch_loss/len(train_loader):.4f}")
    
    return model

# ==========================================
# 4. PHASE 2: FREEZE BODY & TRAIN HEADS
# ==========================================
def train_phase2_specialized_heads(model, device, scaler):
    logger.info("❄️ STARTING PHASE 2: Freezing Shared Body & Fine-Tuning Hail Head")
    
    # 1. FREEZE THE ENCODER (Shared Body)
    # This prevents the core physics engine from forgetting what it learned in Phase 1
    for param in model.encoder.parameters():
        param.requires_grad = False
    
    # 2. Only give the Optimizer the parameters for the HAIL HEAD
    # This saves massive VRAM and forces the AI to only learn hail features
    optimizer = optim.AdamW(model.hail_head.parameters(), lr=1e-4)
    
    # Use Focal Loss to handle the rarity of severe hail
    criterion = FocalLoss()
    
    # Use the specialized, perfectly balanced Hail Dataset
    hail_loader = DataLoader(BalancedHailDataset(), batch_size=8, shuffle=True)

    model.train()
    for epoch in range(5):
        epoch_loss = 0.0
        for x, y_hail in hail_loader:
            x, y_hail = x.to(device), y_hail.to(device)
            optimizer.zero_grad()
            
            with autocast():
                out_hail, _, _, _, _ = model(x)
                loss = criterion(out_hail, y_hail)
                
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            epoch_loss += loss.item()
            
        logger.info(f"Phase 2 - Epoch {epoch+1} | Hail Focal Loss: {epoch_loss/len(hail_loader):.4f}")

# ==========================================
# EXECUTION
# ==========================================
if __name__ == "__main__":
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = ConvectNet(in_channels=4, hidden_dim=128).to(device)
    scaler = GradScaler()
    
    # Run the 2-Phase Pipeline
    model = train_phase1_shared_body(model, device, scaler)
    train_phase2_specialized_heads(model, device, scaler)
    
    # Save Final Production Weights
    os.makedirs("models/weights", exist_ok=True)
    torch.save(model.state_dict(), "models/weights/convectnet_production.pth")
    logger.info("✅ Pipeline Complete. Saved convectnet_production.pth")
