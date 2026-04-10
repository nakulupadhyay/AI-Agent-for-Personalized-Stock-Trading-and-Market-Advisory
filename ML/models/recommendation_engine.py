"""
ml_service/models/recommendation_engine.py
────────────────────────────────────────────
Rule-based recommendation engine.

Combines:
  1. Price signal  — from Linear Regression model (predicted % change)
  2. Sentiment signal — from VADER+TextBlob aggregate analysis
  3. User risk level — configures weights and decision thresholds

Decision matrix
───────────────
  compositeScore = w_price * priceSignal + w_sent * sentimentSignal

  Risk   | price_w | sent_w | BUY >  | SELL <
  ──────────────────────────────────────────────
  low    |   35%   |  65%   | +0.28  | −0.22   (conservative)
  medium |   55%   |  45%   | +0.14  | −0.14   (balanced)
  high   |   72%   |  28%   | +0.05  | −0.05   (aggressive)

Output: BUY 🟢 | HOLD 🟡 | SELL 🔴
"""

from utils.config import settings
from models.sentiment_model import sentiment_to_signal


# ─────────────────────────────────────────────
# Signal Conversion
# ─────────────────────────────────────────────

def _price_change_to_signal(change_pct: float) -> float:
    """
    Map a predicted % price change to a normalised [-1, +1] signal.

    Scaling: each 1% change contributes ~0.15 signal units.
    Capped at ±1.0 to prevent runaway values.

    Examples:
      +3.0%  →  +0.45
      -2.0%  →  -0.30
      +10%   →  +1.00 (capped)
    """
    raw = change_pct * 0.15
    return round(max(-1.0, min(1.0, raw)), 4)


# ─────────────────────────────────────────────
# Main Recommendation Function
# ─────────────────────────────────────────────

def get_recommendation(
    prediction: dict,
    sentiment:  dict,
    risk_level: str  = "medium",
    investment_amount: float = 0.0,
) -> dict:
    """
    Generate a BUY / HOLD / SELL recommendation with rationale.

    Parameters
    ──────────
    prediction        : output of price_prediction_model.run_price_prediction()
    sentiment         : output of sentiment_model.get_aggregate_sentiment()
    risk_level        : "low" | "medium" | "high"
    investment_amount : optional — for share count calculation

    Returns
    ───────
    {
      recommendation  : "BUY" | "HOLD" | "SELL"
      emoji           : 🟢 / 🟡 / 🔴
      composite_score : float ∈ [-1, +1]
      price_signal    : float
      sentiment_signal: float
      confidence      : "High" | "Medium" | "Low"
      rationale       : list[str]
      suggested_action: str
      signal_breakdown: dict
    }
    """
    # ── Validate risk level ──
    risk = risk_level.lower().strip()
    if risk not in settings.RISK_CONFIG:
        risk = "medium"
    cfg = settings.RISK_CONFIG[risk]

    # ── Extract values ──
    change_pct      = prediction.get("change_pct",      0.0)
    direction       = prediction.get("direction",        "FLAT")
    predicted_price = prediction.get("predicted_price",  0.0)
    current_price   = prediction.get("current_price",    0.0)

    # ── Compute signals ──
    price_signal     = _price_change_to_signal(change_pct)
    sentiment_signal = round(sentiment_to_signal(sentiment), 4)

    # ── Composite score ──
    composite = round(
        cfg["price_w"] * price_signal + cfg["sent_w"] * sentiment_signal,
        4
    )
    composite = max(-1.0, min(1.0, composite))

    # ── Decision ──
    if composite >= cfg["buy"]:
        recommendation = "BUY";  emoji = "🟢"
    elif composite <= cfg["sell"]:
        recommendation = "SELL"; emoji = "🔴"
    else:
        recommendation = "HOLD"; emoji = "🟡"

    # ── Confidence ──
    abs_score  = abs(composite)
    confidence = "High" if abs_score >= 0.40 else "Medium" if abs_score >= 0.20 else "Low"

    # ── Build rationale ──
    rationale = _build_rationale(
        recommendation   = recommendation,
        change_pct       = change_pct,
        direction        = direction,
        predicted_price  = predicted_price,
        current_price    = current_price,
        sentiment        = sentiment,
        composite        = composite,
        risk             = risk,
        confidence       = confidence,
        price_w          = cfg["price_w"],
        sent_w           = cfg["sent_w"],
    )

    suggested_action = _build_action(
        recommendation   = recommendation,
        risk             = risk,
        amount           = investment_amount,
        current_price    = current_price,
        confidence       = confidence,
    )

    return {
        "recommendation"  : recommendation,
        "emoji"           : emoji,
        "composite_score" : composite,
        "price_signal"    : price_signal,
        "sentiment_signal": sentiment_signal,
        "confidence"      : confidence,
        "rationale"       : rationale,
        "suggested_action": suggested_action,
        "signal_breakdown": {
            "price_weight"    : cfg["price_w"],
            "sentiment_weight": cfg["sent_w"],
            "buy_threshold"   : cfg["buy"],
            "sell_threshold"  : cfg["sell"],
        },
    }


# ─────────────────────────────────────────────
# Rationale Builder
# ─────────────────────────────────────────────

def _build_rationale(
    recommendation, change_pct, direction, predicted_price,
    current_price, sentiment, composite, risk, confidence,
    price_w, sent_w,
) -> list[str]:
    arrow   = "↑" if direction == "UP" else ("↓" if direction == "DOWN" else "→")
    s_emoji = sentiment.get("emoji", "🟡")
    s_label = sentiment.get("overall_label", "NEUTRAL")
    pos     = sentiment.get("positive_count", 0)
    neg     = sentiment.get("negative_count", 0)
    tot     = sentiment.get("total_articles", 0)

    r = []

    r.append(
        f"📈 Price model predicts {arrow} {abs(change_pct):.2f}% change "
        f"(${current_price:.2f} → ${predicted_price:.2f} next day)"
    )
    r.append(
        f"📰 News sentiment: {s_emoji} {s_label} — "
        f"{pos} positive / {tot - pos - neg} neutral / {neg} negative "
        f"across {tot} articles (VADER + TextBlob dual-engine)"
    )
    r.append(
        f"⚖️  Risk profile '{risk}': price model weighted "
        f"{int(price_w * 100)}%, sentiment weighted {int(sent_w * 100)}%"
    )
    r.append(
        f"🎯 Composite score: {composite:+.4f}  |  Confidence: {confidence}"
    )

    if recommendation == "BUY":
        r.append(
            f"✅ Positive signals clear the {risk}-risk BUY threshold — Recommend BUY"
        )
    elif recommendation == "SELL":
        r.append(
            f"⚠️  Negative signals breach the {risk}-risk SELL threshold — Recommend SELL"
        )
    else:
        r.append(
            "⏸️  Insufficient signal strength to act — Recommend HOLD and monitor"
        )

    return r


# ─────────────────────────────────────────────
# Action Text Builder
# ─────────────────────────────────────────────

def _build_action(recommendation, risk, amount, current_price, confidence) -> str:
    shares_note = ""
    if amount > 0 and current_price > 0:
        shares = int(amount // current_price)
        shares_note = (
            f" With ${amount:,.2f}, you could buy ~{shares} share(s) at ${current_price:.2f}."
            if shares > 0
            else f" ${amount:,.2f} is less than 1 full share at ${current_price:.2f}."
        )

    if recommendation == "BUY":
        if confidence == "High":
            return (
                f"Strong buy signal for a {risk}-risk investor.{shares_note} "
                "Consider entering a full position now."
            )
        return (
            f"Mild buy signal.{shares_note} "
            "Consider a partial position and set a stop-loss order."
        )

    if recommendation == "SELL":
        return (
            f"Exit or reduce your position.{shares_note} "
            "Place a stop-loss if you continue holding."
        )

    return (
        f"Hold your current position.{shares_note} "
        "Re-evaluate after the next earnings report or significant news event."
    )
