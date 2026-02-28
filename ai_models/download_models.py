"""
download_models.py
==================
Download pre-trained models from HuggingFace Hub for the
CapitalWave AI Stock Trading Platform.

Usage:
    python download_models.py              # Download all default models
    python download_models.py --model finbert   # Download specific model
    python download_models.py --search "sentiment analysis"  # Search HF Hub
    python download_models.py --list       # List downloaded models
"""

import os
import sys
import argparse
import shutil
from pathlib import Path

from dotenv import load_dotenv
from colorama import init, Fore, Style
from huggingface_hub import HfApi, snapshot_download, list_models
from transformers import AutoTokenizer, AutoModelForSequenceClassification, AutoModelForCausalLM

init(autoreset=True)  # colorama
load_dotenv()

# ── Configuration ───────────────────────────────────────────
CACHE_DIR = os.getenv("MODEL_CACHE_DIR", "./models_cache")
HF_TOKEN = os.getenv("HUGGINGFACE_TOKEN", None) or None

# Default models for stock trading / financial analysis
DEFAULT_MODELS = {
    "finbert": {
        "repo_id": "ProsusAI/finbert",
        "description": "Financial Sentiment Analysis (FinBERT)",
        "task": "sentiment-analysis",
        "type": "sequence-classification",
    },
    "distilbert-sentiment": {
        "repo_id": "distilbert/distilbert-base-uncased-finetuned-sst-2-english",
        "description": "General Sentiment Analysis (DistilBERT)",
        "task": "sentiment-analysis",
        "type": "sequence-classification",
    },
    "finbert-tone": {
        "repo_id": "yiyanghkust/finbert-tone",
        "description": "Financial Tone Analysis (Positive/Negative/Neutral)",
        "task": "sentiment-analysis",
        "type": "sequence-classification",
    },
    "distilgpt2": {
        "repo_id": "distilgpt2",
        "description": "Lightweight Text Generation (DistilGPT-2)",
        "task": "text-generation",
        "type": "causal-lm",
    },
}


def print_banner():
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"  🤗 HuggingFace Model Downloader")
    print(f"  CapitalWave AI Stock Trading Platform")
    print(f"{'='*60}{Style.RESET_ALL}\n")


def print_model_info(key, info):
    print(f"  {Fore.GREEN}📦 {key}{Style.RESET_ALL}")
    print(f"     Repo:  {info['repo_id']}")
    print(f"     Desc:  {info['description']}")
    print(f"     Task:  {info['task']}")
    print()


def get_model_path(model_key):
    """Get the local path for a model."""
    return os.path.join(CACHE_DIR, model_key)


def is_model_downloaded(model_key):
    """Check if a model is already downloaded."""
    model_path = get_model_path(model_key)
    return os.path.exists(model_path) and any(
        f.endswith(('.bin', '.safetensors', '.json'))
        for f in os.listdir(model_path)
    ) if os.path.exists(model_path) else False


def download_model(model_key, model_info):
    """Download a single model from HuggingFace Hub."""
    model_path = get_model_path(model_key)

    if is_model_downloaded(model_key):
        print(f"  {Fore.YELLOW}⚠ {model_key} already downloaded. Skipping.{Style.RESET_ALL}")
        return True

    print(f"  {Fore.CYAN}⬇ Downloading {model_info['repo_id']}...{Style.RESET_ALL}")
    print(f"    → {model_info['description']}")

    try:
        os.makedirs(model_path, exist_ok=True)

        # Download tokenizer and model using transformers
        print(f"    {Fore.WHITE}Downloading tokenizer...{Style.RESET_ALL}")
        tokenizer = AutoTokenizer.from_pretrained(
            model_info["repo_id"],
            token=HF_TOKEN,
            cache_dir=os.path.join(CACHE_DIR, ".hf_cache"),
        )
        tokenizer.save_pretrained(model_path)

        print(f"    {Fore.WHITE}Downloading model weights...{Style.RESET_ALL}")
        if model_info["type"] == "causal-lm":
            model = AutoModelForCausalLM.from_pretrained(
                model_info["repo_id"],
                token=HF_TOKEN,
                cache_dir=os.path.join(CACHE_DIR, ".hf_cache"),
            )
        else:
            model = AutoModelForSequenceClassification.from_pretrained(
                model_info["repo_id"],
                token=HF_TOKEN,
                cache_dir=os.path.join(CACHE_DIR, ".hf_cache"),
            )
        model.save_pretrained(model_path)

        # Calculate size
        size_mb = sum(
            f.stat().st_size for f in Path(model_path).rglob('*') if f.is_file()
        ) / (1024 * 1024)

        print(f"  {Fore.GREEN}✅ {model_key} downloaded successfully! ({size_mb:.1f} MB){Style.RESET_ALL}\n")
        return True

    except Exception as e:
        print(f"  {Fore.RED}❌ Failed to download {model_key}: {e}{Style.RESET_ALL}\n")
        return False


def download_all():
    """Download all default models."""
    print(f"{Fore.WHITE}Downloading all default models...{Style.RESET_ALL}\n")
    success = 0
    for key, info in DEFAULT_MODELS.items():
        if download_model(key, info):
            success += 1
    print(f"\n{Fore.GREEN}✅ Downloaded {success}/{len(DEFAULT_MODELS)} models{Style.RESET_ALL}")


def download_specific(model_key):
    """Download a specific model by key."""
    if model_key in DEFAULT_MODELS:
        download_model(model_key, DEFAULT_MODELS[model_key])
    else:
        print(f"{Fore.RED}❌ Unknown model key: {model_key}{Style.RESET_ALL}")
        print(f"Available models: {', '.join(DEFAULT_MODELS.keys())}")


def download_custom(repo_id, model_type="sequence-classification"):
    """Download a custom model by HuggingFace repo ID."""
    model_key = repo_id.replace("/", "_")
    model_info = {
        "repo_id": repo_id,
        "description": f"Custom model: {repo_id}",
        "task": "custom",
        "type": model_type,
    }
    download_model(model_key, model_info)


def list_downloaded():
    """List all locally downloaded models."""
    print(f"{Fore.WHITE}Downloaded Models:{Style.RESET_ALL}\n")

    if not os.path.exists(CACHE_DIR):
        print(f"  {Fore.YELLOW}No models downloaded yet.{Style.RESET_ALL}")
        return

    found = False
    for item in sorted(os.listdir(CACHE_DIR)):
        item_path = os.path.join(CACHE_DIR, item)
        if os.path.isdir(item_path) and item != ".hf_cache":
            size_mb = sum(
                f.stat().st_size for f in Path(item_path).rglob('*') if f.is_file()
            ) / (1024 * 1024)

            status = f"{Fore.GREEN}✅" if is_model_downloaded(item) else f"{Fore.YELLOW}⚠ Incomplete"
            info = DEFAULT_MODELS.get(item, {})
            desc = info.get("description", "Custom model")

            print(f"  {status} {Fore.WHITE}{item}{Style.RESET_ALL}")
            print(f"     {desc}")
            print(f"     Size: {size_mb:.1f} MB")
            print()
            found = True

    if not found:
        print(f"  {Fore.YELLOW}No models downloaded yet.{Style.RESET_ALL}")


def search_hub(query, limit=10):
    """Search HuggingFace Hub for models."""
    print(f"{Fore.WHITE}Searching HuggingFace Hub for: '{query}'...{Style.RESET_ALL}\n")

    try:
        api = HfApi(token=HF_TOKEN)
        models = list(api.list_models(
            search=query,
            sort="downloads",
            direction=-1,
            limit=limit,
        ))

        if not models:
            print(f"  {Fore.YELLOW}No models found.{Style.RESET_ALL}")
            return

        for i, model in enumerate(models, 1):
            downloads = getattr(model, 'downloads', 'N/A')
            likes = getattr(model, 'likes', 'N/A')
            tags = getattr(model, 'tags', [])[:5]

            print(f"  {Fore.GREEN}{i}. {model.id}{Style.RESET_ALL}")
            print(f"     Downloads: {downloads:,}" if isinstance(downloads, int) else f"     Downloads: {downloads}")
            print(f"     Likes: {likes}")
            if tags:
                print(f"     Tags: {', '.join(tags)}")
            print()

        print(f"{Fore.CYAN}To download: python download_models.py --custom <repo_id>{Style.RESET_ALL}")

    except Exception as e:
        print(f"{Fore.RED}❌ Search failed: {e}{Style.RESET_ALL}")


def delete_model(model_key):
    """Delete a locally downloaded model."""
    model_path = get_model_path(model_key)
    if os.path.exists(model_path):
        shutil.rmtree(model_path)
        print(f"{Fore.GREEN}✅ Deleted model: {model_key}{Style.RESET_ALL}")
    else:
        print(f"{Fore.YELLOW}⚠ Model not found: {model_key}{Style.RESET_ALL}")


# ── CLI ─────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="HuggingFace Model Downloader for CapitalWave")
    parser.add_argument("--model", type=str, help="Download a specific default model by key")
    parser.add_argument("--custom", type=str, help="Download a custom model by HF repo ID")
    parser.add_argument("--custom-type", type=str, default="sequence-classification",
                        help="Model type for custom download (sequence-classification or causal-lm)")
    parser.add_argument("--search", type=str, help="Search HuggingFace Hub")
    parser.add_argument("--list", action="store_true", help="List downloaded models")
    parser.add_argument("--delete", type=str, help="Delete a downloaded model")
    parser.add_argument("--all", action="store_true", help="Download all default models")

    args = parser.parse_args()

    print_banner()

    if args.list:
        list_downloaded()
    elif args.search:
        search_hub(args.search)
    elif args.delete:
        delete_model(args.delete)
    elif args.model:
        download_specific(args.model)
    elif args.custom:
        download_custom(args.custom, args.custom_type)
    elif args.all or len(sys.argv) == 1:
        # Default: show available models and ask
        print(f"{Fore.WHITE}Available models for download:{Style.RESET_ALL}\n")
        for key, info in DEFAULT_MODELS.items():
            status = f"{Fore.GREEN}✅ Downloaded" if is_model_downloaded(key) else f"{Fore.YELLOW}⏳ Not downloaded"
            print(f"  {status} {Fore.WHITE}{key}{Style.RESET_ALL} — {info['description']}")
        print()

        if args.all:
            download_all()
        else:
            response = input(f"{Fore.CYAN}Download all models? (y/n): {Style.RESET_ALL}").strip().lower()
            if response in ('y', 'yes'):
                download_all()
            else:
                print(f"\n{Fore.WHITE}Use --model <key> to download a specific model.{Style.RESET_ALL}")
                print(f"{Fore.WHITE}Use --search <query> to search HuggingFace Hub.{Style.RESET_ALL}")


if __name__ == "__main__":
    main()
