"""
Synthetic portfolio data generator for training the risk classifier.
Generates labeled portfolios with realistic financial metric ranges.
"""
import numpy as np
import pandas as pd


def generate_synthetic_portfolios(n_samples: int = 5000, seed: int = 42) -> pd.DataFrame:
    """
    Generate synthetic portfolio data with risk labels.

    Features generated:
        - volatility (0.03 - 0.80)
        - sharpe_ratio (-1.0 - 3.5)
        - max_drawdown (0.01 - 0.60)
        - beta (0.1 - 2.5)
        - var_daily (0.005 - 0.10)
        - diversification_ratio (0.1 - 1.0)
        - sector_concentration (0.05 - 0.90)
        - holding_count (1 - 30)

    Labels: Low, Medium, High
    """
    rng = np.random.RandomState(seed)
    records = []

    for _ in range(n_samples):
        # Randomly choose a risk profile to generate realistic combos
        risk_type = rng.choice(["Low", "Medium", "High"], p=[0.33, 0.34, 0.33])

        if risk_type == "Low":
            volatility = rng.uniform(0.03, 0.20)
            sharpe = rng.uniform(1.0, 3.5)
            max_dd = rng.uniform(0.01, 0.10)
            beta = rng.uniform(0.1, 0.8)
            var_daily = rng.uniform(0.005, 0.025)
            div_ratio = rng.uniform(0.60, 1.0)
            sector_conc = rng.uniform(0.05, 0.30)
            holdings = rng.randint(8, 30)
        elif risk_type == "Medium":
            volatility = rng.uniform(0.15, 0.40)
            sharpe = rng.uniform(0.3, 1.8)
            max_dd = rng.uniform(0.08, 0.25)
            beta = rng.uniform(0.7, 1.4)
            var_daily = rng.uniform(0.020, 0.055)
            div_ratio = rng.uniform(0.35, 0.70)
            sector_conc = rng.uniform(0.25, 0.55)
            holdings = rng.randint(4, 15)
        else:  # High
            volatility = rng.uniform(0.30, 0.80)
            sharpe = rng.uniform(-1.0, 0.8)
            max_dd = rng.uniform(0.20, 0.60)
            beta = rng.uniform(1.2, 2.5)
            var_daily = rng.uniform(0.045, 0.10)
            div_ratio = rng.uniform(0.10, 0.40)
            sector_conc = rng.uniform(0.50, 0.90)
            holdings = rng.randint(1, 6)

        # Add noise to make boundaries fuzzy
        volatility += rng.normal(0, 0.02)
        sharpe += rng.normal(0, 0.15)
        max_dd += rng.normal(0, 0.02)
        beta += rng.normal(0, 0.1)

        records.append({
            "volatility": max(0.01, volatility),
            "sharpe_ratio": sharpe,
            "max_drawdown": max(0.005, min(0.95, max_dd)),
            "beta": max(0.05, beta),
            "var_daily": max(0.003, min(0.15, var_daily)),
            "diversification_ratio": max(0.05, min(1.0, div_ratio)),
            "sector_concentration": max(0.03, min(0.95, sector_conc)),
            "holding_count": max(1, holdings),
            "label": risk_type,
        })

    return pd.DataFrame(records)
