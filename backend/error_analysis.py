import os
import json
import logging
from datetime import datetime
import numpy as np

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ContinuousImprovementEngine:
    """
    Milestone 9: Continuous Improvement (The Domain Adaptation Loop)
    
    Captures forecasts and compares them to ground-truth reality once a storm passes.
    Specifically designed to identify "Domain Gap" errors (e.g., failing on Indian 
    orographics) and export them for Phase 2 ML Fine-Tuning.
    """
    def __init__(self, log_dir="logs/telemetry"):
        self.log_dir = log_dir
        os.makedirs(self.log_dir, exist_ok=True)
        
        # We use JSON Lines (.jsonl) as it is the standard format for ML retraining datasets
        self.error_log_path = os.path.join(self.log_dir, "model_errors.jsonl")
        
        # Temporary memory for active storms waiting for ground truth
        self.active_forecasts = {}

    def register_forecast(self, cell_id: str, target_time: datetime, predictions: dict, context: dict):
        """
        Logs what the AI *thinks* will happen.
        """
        forecast_id = f"{cell_id}_{target_time.isoformat()}"
        self.active_forecasts[forecast_id] = {
            "timestamp_made": datetime.utcnow().isoformat(),
            "target_time": target_time.isoformat(),
            "predictions": predictions, # e.g., {"hail_prob": 0.8, "eta_minutes": 45}
            "context": context          # e.g., {"location": "Western Ghats", "missing_radar": True}
        }
        logger.info(f"Registered forecast for {cell_id} at target time {target_time.isoformat()}")

    def register_ground_truth(self, cell_id: str, target_time: datetime, actuals: dict):
        """
        Logs what *actually* happened when the time arrives.
        Calculates the error and saves it for ML retraining if the error is high.
        """
        forecast_id = f"{cell_id}_{target_time.isoformat()}"
        
        if forecast_id not in self.active_forecasts:
            logger.warning(f"No active forecast found for {forecast_id} to compare against.")
            return

        forecast = self.active_forecasts.pop(forecast_id)
        predictions = forecast["predictions"]
        
        # Calculate Errors
        errors = {}
        is_significant_error = False
        
        # 1. ETA Error (Regression)
        if "eta_minutes" in predictions and "eta_minutes" in actuals:
            eta_error = abs(predictions["eta_minutes"] - actuals["eta_minutes"])
            errors["eta_error_minutes"] = eta_error
            if eta_error > 15: # If we are off by more than 15 mins, flag it
                is_significant_error = True
                
        # 2. Hazard Error (Classification: Brier Score / Log Loss)
        for hazard in ["hail", "cloudburst"]:
            if f"{hazard}_prob" in predictions and f"{hazard}_occurred" in actuals:
                prob = predictions[f"{hazard}_prob"]
                actual = 1.0 if actuals[f"{hazard}_occurred"] else 0.0
                
                # Simple Brier Score (Mean Squared Error for probabilities)
                brier_score = (prob - actual) ** 2
                errors[f"{hazard}_brier_score"] = brier_score
                
                # Flag False Alarms (Predicted High, Didn't happen) or Misses (Predicted Low, Happened)
                if (prob > 0.6 and not actual) or (prob < 0.3 and actual):
                    is_significant_error = True

        # Save to the Retraining Log
        log_entry = {
            "cell_id": cell_id,
            "target_time": forecast["target_time"],
            "context": forecast["context"],
            "predictions": predictions,
            "actuals": actuals,
            "errors": errors,
            "flagged_for_retraining": is_significant_error
        }
        
        with open(self.error_log_path, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
            
        if is_significant_error:
            logger.warning(f"🚨 Significant Domain Gap Error detected for {cell_id}. Logged for Phase 2 Retraining.")
        else:
            logger.info(f"✅ Prediction for {cell_id} was accurate.")

    def export_dataset_for_finetuning(self, output_file: str):
        """
        Extracts all the flagged failures so the ML Engineer can run `colab_training_pipeline.py`
        to fix the Domain Gap using Transfer Learning.
        """
        retraining_cases = []
        if not os.path.exists(self.error_log_path):
            return 0
            
        with open(self.error_log_path, "r") as f:
            for line in f:
                data = json.loads(line)
                if data.get("flagged_for_retraining", False):
                    retraining_cases.append(data)
                    
        with open(output_file, "w") as f:
            json.dump(retraining_cases, f, indent=2)
            
        logger.info(f"Exported {len(retraining_cases)} failed cases to {output_file} for Domain Adaptation fine-tuning.")
        return len(retraining_cases)

if __name__ == "__main__":
    # Simulate a domain gap failure (Model trained on US data fails on Indian Kalbaisakhi)
    engine = ContinuousImprovementEngine()
    
    # AI predicts 80% chance of hail in 30 mins based on US supercell physics
    target = datetime.utcnow()
    engine.register_forecast(
        cell_id="CELL-KALBAISAKHI-01",
        target_time=target,
        predictions={"hail_prob": 0.85, "eta_minutes": 30},
        context={"location": "West Bengal", "storm_type": "Squall Line"}
    )
    
    # Reality: It was just heavy rain, no hail (The US model was wrong)
    engine.register_ground_truth(
        cell_id="CELL-KALBAISAKHI-01",
        target_time=target,
        actuals={"hail_occurred": False, "eta_minutes": 35}
    )
    
    # Export the failure so we can retrain the AI
    engine.export_dataset_for_finetuning("logs/telemetry/domain_adaptation_dataset.json")
