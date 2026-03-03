"""
Financial Sentiment Analysis — FinBERT Wrapper.

Uses ProsusAI/finbert from HuggingFace for financial sentiment.
Falls back to a lightweight keyword-based model if FinBERT
cannot be loaded (resource constraints / offline).
"""
import logging
import os

logger = logging.getLogger(__name__)


class SentimentAnalyzer:
    """
    Sentiment analyzer that attempts to use FinBERT
    and gracefully falls back to keyword-based analysis.
    """

    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.model_type = "unknown"
        self._load_model()

    def _load_model(self):
        """Try to load FinBERT, fall back to keyword-based."""
        try:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification
            import torch

            model_name = "ProsusAI/finbert"

            # Check if model is cached locally
            cache_dir = os.path.join("models", "finbert-cache")
            os.makedirs(cache_dir, exist_ok=True)

            logger.info(f"Loading FinBERT model ({model_name})...")
            self.tokenizer = AutoTokenizer.from_pretrained(model_name, cache_dir=cache_dir)
            self.model = AutoModelForSequenceClassification.from_pretrained(model_name, cache_dir=cache_dir)
            self.model.eval()
            self.model_type = "finbert"
            self._torch = torch
            logger.info("FinBERT loaded successfully")

        except Exception as e:
            logger.warning(f"FinBERT load failed: {e}. Using keyword-based fallback.")
            self.model_type = "keyword-based"

    def analyze(self, text: str) -> dict:
        """
        Analyze sentiment of financial text.

        Returns:
            dict with keys: label, confidence, probabilities, model
        """
        if self.model_type == "finbert":
            return self._finbert_analyze(text)
        else:
            return self._keyword_analyze(text)

    def _finbert_analyze(self, text: str) -> dict:
        """FinBERT-based sentiment analysis."""
        try:
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True,
            )

            with self._torch.no_grad():
                outputs = self.model(**inputs)
                probs = self._torch.nn.functional.softmax(outputs.logits, dim=-1)

            # FinBERT output order: positive, negative, neutral
            labels = ["positive", "negative", "neutral"]
            prob_values = probs[0].tolist()

            best_idx = prob_values.index(max(prob_values))

            return {
                "label": labels[best_idx],
                "confidence": round(max(prob_values) * 100, 1),
                "probabilities": {
                    labels[i]: round(prob_values[i] * 100, 1)
                    for i in range(3)
                },
                "model": "finbert",
            }

        except Exception as e:
            logger.error(f"FinBERT inference error: {e}")
            return self._keyword_analyze(text)

    def _keyword_analyze(self, text: str) -> dict:
        """
        Keyword-based financial sentiment analysis fallback.
        Uses curated financial sentiment word lists.
        """
        text_lower = text.lower()

        positive_words = [
            "bullish", "surge", "rally", "growth", "profit", "gain",
            "upgrade", "beat", "outperform", "strong", "positive",
            "recovery", "upside", "momentum", "expansion", "dividend",
            "record", "exceed", "optimistic", "breakthrough", "innovation",
            "earnings beat", "target raised", "buy rating", "accumulate",
            "overweight", "robust", "accelerat", "highest", "soar",
        ]

        negative_words = [
            "bearish", "crash", "decline", "loss", "sell", "downgrade",
            "underperform", "weak", "negative", "recession", "risk",
            "volatile", "bankruptcy", "debt", "lawsuit", "fraud",
            "miss", "cut", "warning", "slump", "plunge", "worst",
            "earnings miss", "target cut", "sell rating", "underweight",
            "concerns", "headwind", "slowdown", "layoff", "restructur",
        ]

        pos_count = sum(1 for word in positive_words if word in text_lower)
        neg_count = sum(1 for word in negative_words if word in text_lower)
        total = pos_count + neg_count + 1  # +1 to avoid division by zero

        pos_score = pos_count / total
        neg_score = neg_count / total
        neu_score = 1 - pos_score - neg_score

        if pos_score > neg_score and pos_score > 0.3:
            label = "positive"
            confidence = min(pos_score * 100 + 40, 90)
        elif neg_score > pos_score and neg_score > 0.3:
            label = "negative"
            confidence = min(neg_score * 100 + 40, 90)
        else:
            label = "neutral"
            confidence = min(neu_score * 80 + 20, 80)

        return {
            "label": label,
            "confidence": round(confidence, 1),
            "probabilities": {
                "positive": round(pos_score * 100, 1),
                "negative": round(neg_score * 100, 1),
                "neutral": round(neu_score * 100, 1),
            },
            "model": "keyword-financial",
        }

    def analyze_batch(self, texts: list) -> list:
        """Analyze a batch of texts."""
        return [self.analyze(text) for text in texts]
