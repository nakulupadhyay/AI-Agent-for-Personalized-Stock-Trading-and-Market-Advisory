"""
ml_service/utils/helpers.py
────────────────────────────
Shared utility functions: formatting, validation, date helpers.
"""

import re
from datetime import datetime, timedelta
import pandas as pd
import numpy as np


# ── Validation ──────────────────────────────────────────────

def validate_ticker(ticker: str) -> str:
    """
    Normalise and validate a stock ticker symbol.
    Supports: NYSE/NASDAQ (AAPL), Indian (RELIANCE.NS),
              Crypto (BTC-USD), Indices (^GSPC).
    """
    t = ticker.strip().upper()
    if not t:
        raise ValueError("Ticker cannot be empty.")
    if not re.match(r"^[A-Z0-9.\-\^]{1,15}$", t):
        raise ValueError(
            f"'{t}' is not a valid ticker. Examples: AAPL, RELIANCE.NS, BTC-USD, ^GSPC"
        )
    return t


def validate_risk_level(risk: str) -> str:
    r = risk.strip().lower()
    if r not in ("low", "medium", "high"):
        raise ValueError(f"risk_level must be 'low', 'medium', or 'high'. Got: '{risk}'")
    return r


# ── Formatting ──────────────────────────────────────────────

def fmt_currency(value, decimals: int = 2) -> str:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return "N/A"
    return f"${float(value):,.{decimals}f}"


def fmt_large_number(value) -> str:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return "N/A"
    v = float(value)
    if v >= 1e12: return f"{v/1e12:.2f}T"
    if v >= 1e9:  return f"{v/1e9:.2f}B"
    if v >= 1e6:  return f"{v/1e6:.2f}M"
    if v >= 1e3:  return f"{v/1e3:.2f}K"
    return f"{v:.2f}"


def fmt_pct(value) -> str:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return "N/A"
    v = float(value)
    return f"{'+' if v >= 0 else ''}{v:.2f}%"


def safe_float(value, default=None):
    """Safely convert a value to float, return default on failure."""
    try:
        f = float(value)
        return None if np.isnan(f) else round(f, 6)
    except (TypeError, ValueError):
        return default


def safe_int(value, default=None):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


# ── Date Helpers ────────────────────────────────────────────

def period_to_start_date(period: str) -> str:
    """Convert yfinance-style period string to ISO start date."""
    mapping = {
        "1mo": 30, "3mo": 90, "6mo": 180,
        "1y": 365, "2y": 730,
    }
    days = mapping.get(period, 180)
    start = datetime.now() - timedelta(days=days)
    return start.strftime("%Y-%m-%d")


def now_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


# ── DataFrame Cleaning ───────────────────────────────────────

def clean_df_for_json(df: pd.DataFrame) -> list:
    """
    Convert a DataFrame to a list of dicts, replacing NaN/Inf
    with None so FastAPI can serialise it to JSON.
    """
    df = df.copy()
    # Replace inf
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    # Round floats
    df = df.round(4)
    records = df.to_dict(orient="records")
    # Replace remaining NaN
    cleaned = []
    for row in records:
        cleaned.append({
            k: (None if (isinstance(v, float) and np.isnan(v)) else v)
            for k, v in row.items()
        })
    return cleaned
