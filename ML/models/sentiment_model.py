"""
ml_service/models/sentiment_model.py
──────────────────────────────────────
Dual-engine sentiment analysis using VADER + TextBlob.

Why VADER?
  • Designed specifically for social media and short text (like news headlines)
  • Understands capitalisation, punctuation, and common slang
  • Returns a compound score in [-1, +1] with no training required
  • Outperforms general-purpose models on financial news headlines

Why TextBlob (secondary)?
  • Provides subjectivity score (how opinion-based the text is)
  • Offers a second opinion on polarity for confidence weighting

Architecture:
  1. Clean the text
  2. Run VADER → compound score [-1, +1]
  3. Run TextBlob → polarity [-1,+1] + subjectivity [0,1]
  4. Blend: final_score = 0.7 * vader + 0.3 * textblob
  5. Aggregate across all headlines
  6. Convert to a recommendation signal
"""

import re
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from textblob import TextBlob
from utils.config import settings

# Singleton analyser instance (loaded once at import time)
_vader = SentimentIntensityAnalyzer()


# ─────────────────────────────────────────────
# Text Preprocessing
# ─────────────────────────────────────────────

def _clean_text(text: str) -> str:
    """
    Lightweight text cleaning that preserves punctuation signals
    that VADER uses (e.g. "!!!", "GREAT", "not good").
    """
    if not text:
        return ""
    # Remove URLs
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)
    # Remove special chars but keep letters, numbers, basic punctuation
    text = re.sub(r"[^\w\s.,!?'\"%-]", " ", text)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ─────────────────────────────────────────────
# Single-text Analysis
# ─────────────────────────────────────────────

def analyze_single(text: str) -> dict:
    """
    Analyse the sentiment of one piece of text (headline or description).

    Returns
    ───────
    {
      label         : "POSITIVE" | "NEGATIVE" | "NEUTRAL"
      vader_compound: float in [-1, +1]   — VADER score
      tb_polarity   : float in [-1, +1]   — TextBlob polarity
      tb_subjectivity: float in [0, +1]   — TextBlob subjectivity
      blended_score : float in [-1, +1]   — 70% VADER + 30% TextBlob
      emoji         : 🟢 / 🔴 / 🟡
    }
    """
    cleaned  = _clean_text(text)

    if not cleaned:
        return {
            "label"          : "NEUTRAL",
            "vader_compound" : 0.0,
            "tb_polarity"    : 0.0,
            "tb_subjectivity": 0.0,
            "blended_score"  : 0.0,
            "emoji"          : "🟡",
        }

    # ── VADER ──
    vader_scores   = _vader.polarity_scores(cleaned)
    vader_compound = vader_scores["compound"]  # in [-1, +1]

    # ── TextBlob ──
    blob           = TextBlob(cleaned)
    tb_polarity    = round(float(blob.sentiment.polarity),     4)
    tb_subjectivity= round(float(blob.sentiment.subjectivity), 4)

    # ── Blend ──
    blended = round(0.70 * vader_compound + 0.30 * tb_polarity, 4)

    # ── Label ──
    if blended >= settings.VADER_POSITIVE_THRESH:
        label = "POSITIVE"; emoji = "🟢"
    elif blended <= settings.VADER_NEGATIVE_THRESH:
        label = "NEGATIVE"; emoji = "🔴"
    else:
        label = "NEUTRAL";  emoji = "🟡"

    return {
        "label"          : label,
        "vader_compound" : round(vader_compound, 4),
        "tb_polarity"    : tb_polarity,
        "tb_subjectivity": tb_subjectivity,
        "blended_score"  : blended,
        "emoji"          : emoji,
    }


# ─────────────────────────────────────────────
# Batch Analysis
# ─────────────────────────────────────────────

def analyze_headlines(headlines: list[str]) -> list[dict]:
    """
    Run analysis on every headline in the list.

    Returns a list of dicts, each containing the original headline
    plus all fields from analyze_single().
    """
    return [
        {"headline": hl, **analyze_single(hl)}
        for hl in headlines
        if hl and hl.strip()
    ]


# ─────────────────────────────────────────────
# Aggregate Sentiment
# ─────────────────────────────────────────────

def get_aggregate_sentiment(headlines: list[str]) -> dict:
    """
    Compute an overall sentiment score across a batch of headlines.

    Algorithm
    ─────────
    1. Analyse each headline (VADER + TextBlob blend).
    2. Average the blended scores → avg_blended.
    3. Also compute an article-ratio score:
         ratio = (pos_count - neg_count) / total  ∈ [-1, +1]
    4. Final aggregate = 0.60 * avg_blended + 0.40 * ratio
    5. Map to label using the same thresholds.

    Returns
    ───────
    {
      overall_label   : str
      avg_blended     : float    — average of per-headline blended scores
      aggregate_score : float    — final weighted aggregate ∈ [-1, +1]
      avg_vader       : float    — average VADER compound
      avg_subjectivity: float    — average TextBlob subjectivity
      positive_count  : int
      negative_count  : int
      neutral_count   : int
      total_articles  : int
      confidence      : float    — |aggregate_score| (0=uncertain, 1=certain)
      emoji           : str
      individual      : list[dict]
    }
    """
    if not headlines:
        return _empty_sentiment()

    results         = analyze_headlines(headlines)
    blended_scores  = [r["blended_score"]   for r in results]
    vader_scores    = [r["vader_compound"]   for r in results]
    subj_scores     = [r["tb_subjectivity"]  for r in results]
    labels          = [r["label"]            for r in results]

    n               = len(results)
    avg_blended     = sum(blended_scores) / n
    avg_vader       = sum(vader_scores)   / n
    avg_subjectivity= sum(subj_scores)    / n

    pos_count = labels.count("POSITIVE")
    neg_count = labels.count("NEGATIVE")
    neu_count = labels.count("NEUTRAL")

    ratio_score  = (pos_count - neg_count) / n  # ∈ [-1, +1]
    aggregate    = 0.60 * avg_blended + 0.40 * ratio_score
    aggregate    = round(max(-1.0, min(1.0, aggregate)), 4)

    if aggregate >= settings.VADER_POSITIVE_THRESH:
        overall_label = "POSITIVE"; emoji = "🟢"
    elif aggregate <= settings.VADER_NEGATIVE_THRESH:
        overall_label = "NEGATIVE"; emoji = "🔴"
    else:
        overall_label = "NEUTRAL";  emoji = "🟡"

    return {
        "overall_label"   : overall_label,
        "avg_blended"     : round(avg_blended,      4),
        "aggregate_score" : aggregate,
        "avg_vader"       : round(avg_vader,         4),
        "avg_subjectivity": round(avg_subjectivity,  4),
        "positive_count"  : pos_count,
        "negative_count"  : neg_count,
        "neutral_count"   : neu_count,
        "total_articles"  : n,
        "confidence"      : round(abs(aggregate),    4),
        "emoji"           : emoji,
        "individual"      : results,
    }


def _empty_sentiment() -> dict:
    return {
        "overall_label"   : "NEUTRAL",
        "avg_blended"     : 0.0,
        "aggregate_score" : 0.0,
        "avg_vader"       : 0.0,
        "avg_subjectivity": 0.0,
        "positive_count"  : 0,
        "negative_count"  : 0,
        "neutral_count"   : 0,
        "total_articles"  : 0,
        "confidence"      : 0.0,
        "emoji"           : "🟡",
        "individual"      : [],
    }


def sentiment_to_signal(aggregate: dict) -> float:
    """
    Convert aggregate sentiment dict to a single [-1, +1] signal
    for use by the recommendation engine.
    """
    return aggregate.get("aggregate_score", 0.0)
