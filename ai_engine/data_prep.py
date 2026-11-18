"""
FoodSync AI - Demand Forecasting Data Preprocessing Pipeline
"""
import numpy as np
from typing import Tuple, Dict, Any, List

def create_features_for_date(
    day_of_week: int,
    month: int,
    is_weekend: bool,
    is_holiday: bool,
    rolling_7d_avg: float,
    rolling_14d_avg: float
) -> np.ndarray:
    """Extracts standardized tabular feature vector for ML demand models."""
    return np.array([
        day_of_week,
        month,
        1.0 if is_weekend else 0.0,
        1.0 if is_holiday else 0.0,
        rolling_7d_avg,
        rolling_14d_avg
    ], dtype=np.float64)

def chronological_train_test_split(
    X: np.ndarray,
    y: np.ndarray,
    train_ratio: float = 0.8
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Chronological 80/20 train/test split to prevent data leakage in time-series forecasting.
    """
    n_samples = len(X)
    split_idx = int(n_samples * train_ratio)
    
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    return X_train, X_test, y_train, y_test

def evaluate_predictions(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Computes genuine Mean Absolute Error (MAE), RMSE, and R2 evaluation metrics."""
    mae = float(np.mean(np.abs(y_true - y_pred)))
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
    
    total_ss = np.sum((y_true - np.mean(y_true)) ** 2)
    residual_ss = np.sum((y_true - y_pred) ** 2)
    r2 = float(1.0 - (residual_ss / total_ss)) if total_ss > 0 else 0.0

    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "r2_score": round(r2, 4)
    }
