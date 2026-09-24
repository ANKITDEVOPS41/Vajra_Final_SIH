import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import numpy as np
import logging
from tqdm import tqdm

# Import our model
from convectnow.backend.models.convectnet import ConvectNet

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SEVIRStormDataset(Dataset):
    """
    PyTorch Dataset for loading historical SEVIR/NEXRAD radar + lightning data.
    Transforms (T, C, H, W) spatio-temporal blocks for ConvectNet training.
    """
    def __init__(self, data_dir: str, split: str = "train"):
        self.data_dir = data_dir
        self.split = split
        # In a real scenario, this loads the SEVIR catalog CSV
        # and memory-maps the massive HDF5/NetCDF files.
        # For this architecture script, we simulate the dataset length.
        self.num_samples = 5000 if split == "train" else 1000
        logger.info(f"Initialized {split} dataset with {self.num_samples} storm events.")

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        # SIMULATED DATA LOADING:
        # 12 frames (2 hours), 4 channels (VIL, IR, Lightning, Environment), 128x128 grid
        x = torch.randn(4, 12, 128, 128)
        
        # Ground truth labels at T+60
        y_hail = torch.rand(3)       # Probabilities for [None, Small, Severe]
        y_cloudburst = torch.rand(2) # Probabilities for [No, Yes]
        y_downburst = torch.rand(1)  # Predicted max wind speed (m/s)
        y_ci = torch.rand(1)         # Convective Initiation probability
        
        return x, y_hail, y_cloudburst, y_downburst, y_ci

def train_model():
    """
    Main training loop for ConvectNet.
    Runs on GPU if available, calculates multi-head loss, and saves weights.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
    logger.info(f"Starting training on device: {device}")

    # 1. Initialize Dataset & DataLoaders
    train_dataset = SEVIRStormDataset("datasets/sevir", split="train")
    val_dataset = SEVIRStormDataset("datasets/sevir", split="val")
    
    train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_dataset, batch_size=16, shuffle=False)

    # 2. Initialize Model & Optimizer
    model = ConvectNet(in_channels=4, hidden_dim=128).to(device)
    optimizer = optim.AdamW(model.parameters(), lr=3e-4, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=3)

    # 3. Loss Functions for the 4 separate prediction heads
    criterion_classification = nn.CrossEntropyLoss() # For Hail, Cloudburst
    criterion_regression = nn.MSELoss()              # For Downburst velocity
    criterion_bce = nn.BCEWithLogitsLoss()           # For Convective Initiation

    epochs = 10
    best_val_loss = float('inf')

    # 4. Training Loop
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        
        progress_bar = tqdm(train_loader, desc=f"Epoch {epoch+1}/{epochs}")
        for batch in progress_bar:
            x, y_hail, y_cloudburst, y_downburst, y_ci = [b.to(device) for b in batch]
            
            optimizer.zero_grad()
            
            # Forward Pass
            out_hail, out_cloudburst, out_downburst, out_ci, _ = model(x)
            
            # Calculate multi-objective loss
            loss_hail = criterion_classification(out_hail, y_hail)
            loss_cb = criterion_classification(out_cloudburst, y_cloudburst)
            loss_db = criterion_regression(out_downburst, y_downburst)
            loss_ci = criterion_bce(out_ci, y_ci)
            
            total_loss = loss_hail + loss_cb + loss_db + loss_ci
            
            # Backward Pass
            total_loss.backward()
            optimizer.step()
            
            train_loss += total_loss.item()
            progress_bar.set_postfix({"loss": total_loss.item()})
            
        avg_train_loss = train_loss / len(train_loader)
        
        # 5. Validation Loop
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for batch in val_loader:
                x, y_hail, y_cloudburst, y_downburst, y_ci = [b.to(device) for b in batch]
                out_hail, out_cloudburst, out_downburst, out_ci, _ = model(x)
                
                v_loss = criterion_classification(out_hail, y_hail) + \
                         criterion_classification(out_cloudburst, y_cloudburst) + \
                         criterion_regression(out_downburst, y_downburst) + \
                         criterion_bce(out_ci, y_ci)
                val_loss += v_loss.item()
                
        avg_val_loss = val_loss / len(val_loader)
        scheduler.step(avg_val_loss)
        
        logger.info(f"Epoch {epoch+1} | Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f}")
        
        # 6. Save Checkpoint
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            os.makedirs("models/weights", exist_ok=True)
            torch.save(model.state_dict(), "models/weights/convectnet_best.pth")
            logger.info("Saved new best model checkpoint.")

if __name__ == "__main__":
    # Execute the training pipeline
    train_model()
