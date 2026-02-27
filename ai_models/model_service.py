"""
model_service.py
================
Flask API server for the CapitalWave AI Stock Trading Platform.

Serves predictions from downloaded/fine-tuned HuggingFace models.
The Node.js backend calls this API to get real AI-powered results.

Usage:
    python model_service.py                # Start on default port 5001
    python model_service.py --port 5002    # Custom port
"""

import os
import json
import shutil
import threading
from pathlib import Path
from datetime import datetime

import torch
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
from huggingface_hub import HfApi

load_dotenv()

# ── Configuration ───────────────────────────────────────────
CACHE_DIR = os.getenv("MODEL_CACHE_DIR", "./models_cache")
FINE_TUNED_DIR = os.path.join(CACHE_DIR, "fine_tuned")
FLASK_PORT = int(os.getenv("FLASK_PORT", 5001))
HF_TOKEN = os.getenv("HUGGINGFACE_TOKEN", None) or None

app = Flask(__name__)
CORS(app)

# ── Model Registry ──────────────────────────────────────────
# Loaded models are cached in memory for fast inference
loaded_models = {}
download_progress = {}  # Track ongoing downloads


def get_device():
    """Get the best available device."""
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def load_model(model_key, model_path=None):
    """Load a model into memory for inference."""
    if model_key in loaded_models:
        return loaded_models[model_key]

    model_path = model_path or os.path.join(CACHE_DIR, model_key)

    if not os.path.exists(model_path):
        return None

    try:
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForSequenceClassification.from_pretrained(model_path)
        device = get_device()
        model.to(device)
        model.eval()

        loaded_models[model_key] = {
            "tokenizer": tokenizer,
            "model": model,
            "device": device,
            "loaded_at": datetime.now().isoformat(),
        }
        print(f"✅ Loaded model: {model_key} on {device}")
        return loaded_models[model_key]
    except Exception as e:
        print(f"❌ Failed to load {model_key}: {e}")
        return None


def predict_sentiment(text, model_key="finbert"):
    """Run sentiment prediction on text."""
    model_data = load_model(model_key)
    if not model_data:
        return None

    tokenizer = model_data["tokenizer"]
    model = model_data["model"]
    device = model_data["device"]

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=512,
    ).to(device)

    with torch.no_grad():
        outputs = model(**inputs)
        probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)
        predicted_class = torch.argmax(probabilities, dim=-1).item()
        confidence = probabilities[0][predicted_class].item()

    # Map labels (depends on model)
    label_map = model.config.id2label if hasattr(model.config, 'id2label') else {
        0: "negative", 1: "neutral", 2: "positive"
    }

    return {
        "label": label_map.get(predicted_class, str(predicted_class)),
        "confidence": round(confidence * 100, 2),
        "probabilities": {
            label_map.get(i, str(i)): round(prob.item() * 100, 2)
            for i, prob in enumerate(probabilities[0])
        },
    }


# ── API Routes ──────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "CapitalWave AI Model Service",
        "device": get_device(),
        "gpu_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "loaded_models": list(loaded_models.keys()),
        "timestamp": datetime.now().isoformat(),
    })


@app.route("/predict/sentiment", methods=["POST"])
def sentiment_endpoint():
    """Analyze sentiment of text using a loaded model."""
    data = request.get_json()
    text = data.get("text", "")
    model_key = data.get("model", "finbert")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    result = predict_sentiment(text, model_key)
    if result is None:
        return jsonify({
            "error": f"Model '{model_key}' not found. Download it first.",
        }), 404

    return jsonify({
        "success": True,
        "data": {
            "text": text,
            "model": model_key,
            **result,
            "timestamp": datetime.now().isoformat(),
        }
    })


@app.route("/predict/recommendation", methods=["POST"])
def recommendation_endpoint():
    """
    Get an AI-powered stock recommendation based on sentiment analysis
    of multiple inputs (news headlines, price context, etc.).
    """
    data = request.get_json()
    symbol = data.get("symbol", "UNKNOWN")
    current_price = data.get("currentPrice", 0)
    news_headlines = data.get("headlines", [])
    sentiment_text = data.get("sentimentText", "")
    model_key = data.get("model", "finbert")

    # Analyze sentiment of provided text/headlines
    texts_to_analyze = []
    if sentiment_text:
        texts_to_analyze.append(sentiment_text)
    texts_to_analyze.extend(news_headlines)

    if not texts_to_analyze:
        texts_to_analyze = [f"{symbol} stock current market analysis"]

    # Get sentiment for each text
    sentiments = []
    for text in texts_to_analyze:
        result = predict_sentiment(text, model_key)
        if result:
            sentiments.append(result)

    if not sentiments:
        return jsonify({"error": "Model not available for prediction"}), 404

    # Aggregate sentiments
    avg_confidence = np.mean([s["confidence"] for s in sentiments])
    sentiment_counts = {}
    for s in sentiments:
        label = s["label"].lower()
        sentiment_counts[label] = sentiment_counts.get(label, 0) + 1

    dominant_sentiment = max(sentiment_counts, key=sentiment_counts.get)

    # Generate recommendation
    if dominant_sentiment == "positive":
        recommendation = "BUY"
        reasoning = "Positive sentiment detected across analyzed market data"
        target_multiplier = 1.08
    elif dominant_sentiment == "negative":
        recommendation = "SELL"
        reasoning = "Negative sentiment detected in market analysis"
        target_multiplier = 0.92
    else:
        recommendation = "HOLD"
        reasoning = "Mixed or neutral market sentiment — maintain position"
        target_multiplier = 1.02

    return jsonify({
        "success": True,
        "data": {
            "symbol": symbol,
            "recommendation": recommendation,
            "confidence": round(avg_confidence, 2),
            "reasoning": reasoning,
            "targetPrice": round(current_price * target_multiplier, 2) if current_price else None,
            "sentimentBreakdown": sentiment_counts,
            "analyzedCount": len(sentiments),
            "model": model_key,
            "timestamp": datetime.now().isoformat(),
        }
    })


@app.route("/models/list", methods=["GET"])
def list_models_endpoint():
    """List all locally downloaded models."""
    models = []

    if not os.path.exists(CACHE_DIR):
        return jsonify({"success": True, "data": []})

    for item in sorted(os.listdir(CACHE_DIR)):
        item_path = os.path.join(CACHE_DIR, item)
        if os.path.isdir(item_path) and item not in [".hf_cache", "fine_tuned"]:
            size_mb = sum(
                f.stat().st_size for f in Path(item_path).rglob("*") if f.is_file()
            ) / (1024 * 1024)

            has_model = any(
                f.endswith((".bin", ".safetensors"))
                for f in os.listdir(item_path)
            )

            models.append({
                "key": item,
                "path": item_path,
                "size_mb": round(size_mb, 1),
                "is_complete": has_model,
                "is_loaded": item in loaded_models,
                "type": "base",
            })

    # Also list fine-tuned models
    if os.path.exists(FINE_TUNED_DIR):
        for item in sorted(os.listdir(FINE_TUNED_DIR)):
            item_path = os.path.join(FINE_TUNED_DIR, item)
            if os.path.isdir(item_path):
                size_mb = sum(
                    f.stat().st_size for f in Path(item_path).rglob("*") if f.is_file()
                ) / (1024 * 1024)

                # Read training metadata if available
                metadata = {}
                meta_path = os.path.join(item_path, "training_metadata.json")
                if os.path.exists(meta_path):
                    with open(meta_path) as f:
                        metadata = json.load(f)

                models.append({
                    "key": f"fine_tuned/{item}",
                    "path": item_path,
                    "size_mb": round(size_mb, 1),
                    "is_complete": True,
                    "is_loaded": f"fine_tuned/{item}" in loaded_models,
                    "type": "fine_tuned",
                    "metadata": metadata,
                })

    return jsonify({"success": True, "data": models})


@app.route("/models/download", methods=["POST"])
def download_model_endpoint():
    """Download a model from HuggingFace Hub."""
    data = request.get_json()
    repo_id = data.get("repo_id", "")
    model_key = data.get("model_key", repo_id.replace("/", "_"))
    model_type = data.get("model_type", "sequence-classification")

    if not repo_id:
        return jsonify({"error": "No repo_id provided"}), 400

    model_path = os.path.join(CACHE_DIR, model_key)
    if os.path.exists(model_path) and any(
        f.endswith(('.bin', '.safetensors')) for f in os.listdir(model_path)
    ):
        return jsonify({
            "success": True,
            "message": f"Model '{model_key}' already downloaded",
            "model_key": model_key,
        })

    # Start download in background thread
    download_progress[model_key] = {"status": "downloading", "progress": 0}

    def _download():
        try:
            os.makedirs(model_path, exist_ok=True)

            download_progress[model_key]["progress"] = 10
            tokenizer = AutoTokenizer.from_pretrained(
                repo_id, token=HF_TOKEN,
                cache_dir=os.path.join(CACHE_DIR, ".hf_cache"),
            )
            tokenizer.save_pretrained(model_path)

            download_progress[model_key]["progress"] = 40

            if model_type == "causal-lm":
                from transformers import AutoModelForCausalLM
                model = AutoModelForCausalLM.from_pretrained(
                    repo_id, token=HF_TOKEN,
                    cache_dir=os.path.join(CACHE_DIR, ".hf_cache"),
                )
            else:
                model = AutoModelForSequenceClassification.from_pretrained(
                    repo_id, token=HF_TOKEN,
                    cache_dir=os.path.join(CACHE_DIR, ".hf_cache"),
                )

            download_progress[model_key]["progress"] = 80
            model.save_pretrained(model_path)
            download_progress[model_key] = {"status": "complete", "progress": 100}
            print(f"✅ Downloaded: {repo_id} → {model_key}")

        except Exception as e:
            download_progress[model_key] = {"status": "error", "error": str(e), "progress": 0}
            print(f"❌ Download failed: {e}")

    thread = threading.Thread(target=_download, daemon=True)
    thread.start()

    return jsonify({
        "success": True,
        "message": f"Download started for '{repo_id}'",
        "model_key": model_key,
    })


@app.route("/models/download/progress/<model_key>", methods=["GET"])
def download_progress_endpoint(model_key):
    """Get download progress for a model."""
    progress = download_progress.get(model_key, {"status": "unknown"})
    return jsonify({"success": True, "data": progress})


@app.route("/models/search", methods=["GET"])
def search_models_endpoint():
    """Search HuggingFace Hub for models."""
    query = request.args.get("q", "")
    task = request.args.get("task", "")
    limit = int(request.args.get("limit", 10))

    if not query:
        return jsonify({"error": "No search query provided"}), 400

    try:
        api = HfApi(token=HF_TOKEN)
        kwargs = {
            "search": query,
            "sort": "downloads",
            "direction": -1,
            "limit": limit,
        }
        if task:
            kwargs["filter"] = task

        models = list(api.list_models(**kwargs))

        results = []
        for m in models:
            results.append({
                "id": m.id,
                "downloads": getattr(m, "downloads", 0),
                "likes": getattr(m, "likes", 0),
                "tags": getattr(m, "tags", [])[:8],
                "pipeline_tag": getattr(m, "pipeline_tag", None),
                "last_modified": str(getattr(m, "lastModified", "")),
            })

        return jsonify({"success": True, "data": results})

    except Exception as e:
        return jsonify({"error": f"Search failed: {str(e)}"}), 500


@app.route("/models/local/<path:model_key>", methods=["DELETE"])
def delete_model_endpoint(model_key):
    """Delete a locally downloaded model."""
    model_path = os.path.join(CACHE_DIR, model_key)

    if not os.path.exists(model_path):
        return jsonify({"error": f"Model '{model_key}' not found"}), 404

    # Unload from memory if loaded
    if model_key in loaded_models:
        del loaded_models[model_key]

    shutil.rmtree(model_path)
    return jsonify({
        "success": True,
        "message": f"Model '{model_key}' deleted successfully",
    })


@app.route("/models/load", methods=["POST"])
def load_model_endpoint():
    """Load a model into memory for inference."""
    data = request.get_json()
    model_key = data.get("model_key", "")

    if not model_key:
        return jsonify({"error": "No model_key provided"}), 400

    model_path = os.path.join(CACHE_DIR, model_key)
    result = load_model(model_key, model_path)

    if result:
        return jsonify({
            "success": True,
            "message": f"Model '{model_key}' loaded on {result['device']}",
        })
    else:
        return jsonify({"error": f"Failed to load model '{model_key}'"}), 500


@app.route("/models/fine-tune", methods=["POST"])
def fine_tune_endpoint():
    """Start fine-tuning a model (runs in background)."""
    data = request.get_json()
    base_model = data.get("base_model", "finbert")
    epochs = data.get("epochs", 3)
    batch_size = data.get("batch_size", 16)
    learning_rate = data.get("learning_rate", 2e-5)
    output_name = data.get("output_name", None)

    # Import fine_tune module
    from fine_tune import fine_tune as run_fine_tune

    def _train():
        try:
            run_fine_tune(
                base_model_key=base_model,
                epochs=epochs,
                batch_size=batch_size,
                learning_rate=learning_rate,
                output_name=output_name,
            )
        except Exception as e:
            print(f"❌ Fine-tuning failed: {e}")

    thread = threading.Thread(target=_train, daemon=True)
    thread.start()

    return jsonify({
        "success": True,
        "message": f"Fine-tuning started for '{base_model}'",
        "config": {
            "base_model": base_model,
            "epochs": epochs,
            "batch_size": batch_size,
            "learning_rate": learning_rate,
        },
    })


# ── Run Server ──────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=FLASK_PORT)
    parser.add_argument("--preload", nargs="*", default=[],
                        help="Models to preload at startup (e.g. finbert)")
    args = parser.parse_args()

    # Create directories
    os.makedirs(CACHE_DIR, exist_ok=True)
    os.makedirs(FINE_TUNED_DIR, exist_ok=True)

    # Preload models
    for model_key in args.preload:
        print(f"Preloading model: {model_key}")
        load_model(model_key)

    print(f"\n{'='*50}")
    print(f"  🚀 CapitalWave AI Model Service")
    print(f"  Port: {args.port}")
    print(f"  Device: {get_device()}")
    print(f"  Cache: {os.path.abspath(CACHE_DIR)}")
    print(f"{'='*50}\n")

    app.run(host="0.0.0.0", port=args.port, debug=True)
