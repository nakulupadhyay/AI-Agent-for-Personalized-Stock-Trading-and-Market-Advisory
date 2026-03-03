"""
Data preprocessing utilities for ML models.
Handles scaling, sequence creation, and data cleaning.
"""
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler, StandardScaler
from typing import Tuple, List


def clean_ohlcv_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean raw OHLCV data.
    - Forward-fill missing prices
    - Drop remaining NaN rows
    - Remove zero-volume days
    """
    result = df.copy()
    result.fillna(method="ffill", inplace=True)
    result.dropna(inplace=True)

    # Remove rows with zero close price
    result = result[result["Close"] > 0]

    return result


def scale_features(
    data: np.ndarray,
    scaler=None,
    method: str = "minmax"
) -> Tuple[np.ndarray, object]:
    """
    Scale feature data.
    Returns: (scaled_data, fitted_scaler)
    """
    if scaler is None:
        if method == "minmax":
            scaler = MinMaxScaler(feature_range=(0, 1))
        else:
            scaler = StandardScaler()
        scaled = scaler.fit_transform(data)
    else:
        scaled = scaler.transform(data)

    return scaled, scaler


def create_sequences(
    data: np.ndarray,
    target_col_idx: int,
    lookback: int = 60
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Create LSTM-compatible sequences from scaled data.

    Args:
        data: Scaled feature array of shape (n_samples, n_features)
        target_col_idx: Index of the target column (e.g., Close price)
        lookback: Number of past timesteps per sequence

    Returns:
        X: shape (n_sequences, lookback, n_features)
        y: shape (n_sequences,)
    """
    X, y = [], []
    for i in range(lookback, len(data)):
        X.append(data[i - lookback:i])
        y.append(data[i, target_col_idx])

    return np.array(X), np.array(y)


def chronological_split(
    X: np.ndarray,
    y: np.ndarray,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15
) -> dict:
    """
    Split data chronologically (NO shuffle) for time-series.

    Returns dict with keys: X_train, y_train, X_val, y_val, X_test, y_test
    """
    n = len(X)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))

    return {
        "X_train": X[:train_end],
        "y_train": y[:train_end],
        "X_val": X[train_end:val_end],
        "y_val": y[train_end:val_end],
        "X_test": X[val_end:],
        "y_test": y[val_end:],
    }


def compute_direction_labels(prices: pd.Series) -> pd.Series:
    """
    Compute next-day direction labels.
    Returns: Series of 'Up', 'Down', 'Sideways' labels
    """
    pct_change = prices.pct_change().shift(-1)  # Next-day change
    labels = pd.cut(
        pct_change,
        bins=[-np.inf, -0.005, 0.005, np.inf],
        labels=["Down", "Sideways", "Up"],
    )
    return labels
