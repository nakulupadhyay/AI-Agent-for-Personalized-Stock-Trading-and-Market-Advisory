"""
ml_service/services/news_service.py
─────────────────────────────────────
Fetches financial news from two sources (with fallback):
  1. NewsAPI     → free key at newsapi.org (100 req/day)
  2. yfinance    → built-in Yahoo Finance news feed (no key needed)

News provider choice: NewsAPI + yfinance fallback
  • NewsAPI gives clean, structured articles with descriptions
  • yfinance news feed is always available as a backup
  • Both are completely free
"""

import yfinance as yf
import requests
from datetime import datetime, timedelta
from typing import Optional
from utils.config import settings


# ─────────────────────────────────────────────
# NewsAPI (Primary Source)
# ─────────────────────────────────────────────

def fetch_from_newsapi(
    query: str,
    max_articles: int = 10,
    days_back: int = 7,
) -> list[dict]:
    """
    Fetch articles from NewsAPI.

    Free tier limits:
      • 100 requests per day
      • Articles from the past 30 days only
      • Paginated, English language

    GET /v2/everything?q={query}&from={date}&sortBy=publishedAt&language=en
    """
    if not settings.NEWSAPI_KEY:
        raise RuntimeError("NEWSAPI_KEY not configured in .env")

    from_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")

    url    = "https://newsapi.org/v2/everything"
    params = {
        "q"        : query,
        "from"     : from_date,
        "sortBy"   : "publishedAt",
        "language" : "en",
        "pageSize" : min(max_articles, 100),
        "apiKey"   : settings.NEWSAPI_KEY,
    }

    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    if data.get("status") != "ok":
        raise RuntimeError(f"NewsAPI returned error: {data.get('message', 'unknown')}")

    articles = data.get("articles", [])
    return [
        {
            "title"       : a.get("title",       "") or "",
            "description" : a.get("description", "") or "",
            "content"     : a.get("content",     "") or "",
            "source"      : a.get("source", {}).get("name", "Unknown"),
            "published_at": a.get("publishedAt",  ""),
            "url"         : a.get("url",           ""),
        }
        for a in articles
        if a.get("title") and a["title"] != "[Removed]"
    ]


# ─────────────────────────────────────────────
# yfinance News (Fallback / No-key Source)
# ─────────────────────────────────────────────

def fetch_from_yfinance(ticker: str, max_articles: int = 10) -> list[dict]:
    """
    Pull news directly attached to a Yahoo Finance ticker symbol.
    No API key required — always works as a fallback.
    """
    try:
        stock   = yf.Ticker(ticker)
        raw     = stock.news or []

        articles = []
        for item in raw[:max_articles]:
            ts        = item.get("providerPublishTime", 0)
            published = (
                datetime.utcfromtimestamp(ts).strftime("%Y-%m-%dT%H:%M:%SZ")
                if ts else ""
            )
            articles.append({
                "title"       : item.get("title",     "") or "",
                "description" : item.get("summary",   "") or "",
                "content"     : "",
                "source"      : item.get("publisher", "Yahoo Finance"),
                "published_at": published,
                "url"         : item.get("link",       ""),
            })
        return [a for a in articles if a["title"]]
    except Exception as e:
        raise RuntimeError(f"yfinance news failed for '{ticker}': {e}")


# ─────────────────────────────────────────────
# Unified Entry Point
# ─────────────────────────────────────────────

def get_stock_news(
    ticker: str,
    company_name: str = "",
    max_articles: int = 10,
) -> list[dict]:
    """
    Master function: try NewsAPI first, fall back to yfinance.

    The query to NewsAPI uses the company name for richer results
    (e.g. "Apple stock" instead of just "AAPL").

    Returns a normalised list of article dicts.
    """
    query = f"{company_name} stock" if company_name else f"{ticker} stock"

    # Attempt 1: NewsAPI
    if settings.NEWSAPI_KEY:
        try:
            articles = fetch_from_newsapi(query, max_articles)
            if articles:
                return articles
        except Exception as e:
            print(f"[news_service] NewsAPI failed ({e}) — falling back to yfinance.")

    # Attempt 2: yfinance
    try:
        return fetch_from_yfinance(ticker, max_articles)
    except Exception as e:
        print(f"[news_service] yfinance news also failed: {e}")
        return []


def extract_headlines(articles: list[dict]) -> list[str]:
    """Pull just the title strings from the articles list."""
    return [a["title"] for a in articles if a.get("title")]
