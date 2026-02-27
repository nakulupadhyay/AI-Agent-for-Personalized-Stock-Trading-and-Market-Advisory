"""
fine_tune.py
============
Fine-tune HuggingFace models for stock trading sentiment analysis.

This script fine-tunes a pre-trained model (default: FinBERT) on financial
sentiment data so it better understands stock market language.

Usage:
    python fine_tune.py                           # Fine-tune with defaults
    python fine_tune.py --base finbert --epochs 5  # Custom params
    python fine_tune.py --base distilbert-sentiment --lr 3e-5
"""

import os
import json
import argparse
from datetime import datetime

import torch
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, classification_report
from sklearn.model_selection import train_test_split
from dotenv import load_dotenv
from colorama import init, Fore, Style

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    EarlyStoppingCallback,
)
from datasets import Dataset

init(autoreset=True)
load_dotenv()

CACHE_DIR = os.getenv("MODEL_CACHE_DIR", "./models_cache")
FINE_TUNED_DIR = os.path.join(CACHE_DIR, "fine_tuned")
DATASETS_DIR = "./datasets"


# ── Sample Financial Sentiment Data ─────────────────────────
# In production, replace with your own labeled dataset or use
# the financial_phrasebank dataset from HuggingFace.
SAMPLE_FINANCIAL_DATA = [
    # Positive
    {"text": "Company reports record quarterly earnings, exceeding analyst expectations", "label": 2},
    {"text": "Stock surges 15% after strong revenue growth announcement", "label": 2},
    {"text": "Bullish outlook as company expands into new markets", "label": 2},
    {"text": "Dividend increased by 20%, reflecting strong financial health", "label": 2},
    {"text": "Market rally continues as economic indicators show improvement", "label": 2},
    {"text": "Strong buy recommendation from major investment bank", "label": 2},
    {"text": "IPO oversubscribed 10x, showing massive investor interest", "label": 2},
    {"text": "Company secures major government contract worth billions", "label": 2},
    {"text": "Earnings beat estimates by 30%, stock hits all-time high", "label": 2},
    {"text": "Sector rotation into tech stocks drives market higher", "label": 2},
    {"text": "Revenue growth accelerates to 40% year over year", "label": 2},
    {"text": "Analysts upgrade stock to strong buy after earnings beat", "label": 2},
    {"text": "Company announces strategic partnership with industry leader", "label": 2},
    {"text": "Operating margins expand significantly due to cost optimization", "label": 2},
    {"text": "Share buyback program signals management confidence", "label": 2},
    {"text": "New product launch receives overwhelmingly positive reviews", "label": 2},
    {"text": "Free cash flow hits record levels this quarter", "label": 2},
    {"text": "Institutional investors increase their stake significantly", "label": 2},
    {"text": "Company achieves profitability ahead of schedule", "label": 2},
    {"text": "Export orders surge as global demand recovers", "label": 2},

    # Negative
    {"text": "Stock plummets after disappointing earnings report", "label": 0},
    {"text": "Company announces major layoffs amid restructuring", "label": 0},
    {"text": "Bearish sentiment as recession fears grow", "label": 0},
    {"text": "Revenue misses expectations, guidance lowered for next quarter", "label": 0},
    {"text": "Market crash wipes out billions in investor wealth", "label": 0},
    {"text": "Credit rating downgraded due to mounting debt concerns", "label": 0},
    {"text": "CEO resigns amid accounting scandal investigation", "label": 0},
    {"text": "Supply chain disruptions cause significant revenue decline", "label": 0},
    {"text": "Company faces class action lawsuit from shareholders", "label": 0},
    {"text": "Profit warning issued as demand weakens across all segments", "label": 0},
    {"text": "Stock hits 52-week low after sector-wide selloff", "label": 0},
    {"text": "Debt levels reach unsustainable levels, default risk rises", "label": 0},
    {"text": "Major client terminates contract, impacting revenue forecast", "label": 0},
    {"text": "Regulatory investigation into business practices announced", "label": 0},
    {"text": "Operating losses widen as competition intensifies", "label": 0},
    {"text": "Insider selling accelerates, raising red flags", "label": 0},
    {"text": "Product recall damages brand reputation significantly", "label": 0},
    {"text": "Failed acquisition attempt leads to large write-downs", "label": 0},
    {"text": "Market share declines as competitors gain ground", "label": 0},
    {"text": "Cash burn rate suggests potential liquidity crisis", "label": 0},

    # Neutral
    {"text": "Company maintains current dividend policy unchanged", "label": 1},
    {"text": "Market closes flat with mixed signals from economic data", "label": 1},
    {"text": "Quarterly results meet analyst expectations exactly", "label": 1},
    {"text": "Board of directors appoints new independent member", "label": 1},
    {"text": "Company completes routine regulatory filing on schedule", "label": 1},
    {"text": "Trading volume remains in normal range for the sector", "label": 1},
    {"text": "Annual general meeting scheduled for next month", "label": 1},
    {"text": "Company restates financials with minimal impact on results", "label": 1},
    {"text": "Market participants await Federal Reserve policy decision", "label": 1},
    {"text": "Stock price consolidates near support level after recent move", "label": 1},
    {"text": "Industry report shows stable growth projections for next year", "label": 1},
    {"text": "Company announces routine management reorganization", "label": 1},
    {"text": "Sector performance in line with broader market trends", "label": 1},
    {"text": "Analyst consensus remains hold with unchanged price target", "label": 1},
    {"text": "Quarterly revenue in line with seasonal expectations", "label": 1},
    {"text": "Company participates in industry conference this week", "label": 1},
    {"text": "Bond offering completed at market interest rates", "label": 1},
    {"text": "Inventory levels remain stable quarter over quarter", "label": 1},
    {"text": "No material changes to guidance reported this period", "label": 1},
    {"text": "Employee headcount remains unchanged from last quarter", "label": 1},
]


def print_banner():
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"  🔧 Model Fine-Tuning")
    print(f"  CapitalWave AI Stock Trading Platform")
    print(f"{'='*60}{Style.RESET_ALL}\n")


def load_dataset_from_file(filepath):
    """Load a custom dataset from CSV or JSON file."""
    if filepath.endswith('.csv'):
        df = pd.read_csv(filepath)
    elif filepath.endswith('.json'):
        df = pd.read_json(filepath)
    else:
        raise ValueError("Unsupported format. Use CSV or JSON.")

    # Expect columns: 'text' and 'label' (0=negative, 1=neutral, 2=positive)
    assert 'text' in df.columns and 'label' in df.columns, \
        "Dataset must have 'text' and 'label' columns"

    return df.to_dict('records')


def prepare_hf_dataset(data, tokenizer, max_length=128):
    """Convert raw data to a HuggingFace Dataset with tokenization."""
    texts = [item["text"] for item in data]
    labels = [item["label"] for item in data]

    encodings = tokenizer(
        texts,
        truncation=True,
        padding="max_length",
        max_length=max_length,
        return_tensors="pt",
    )

    dataset = Dataset.from_dict({
        "input_ids": encodings["input_ids"],
        "attention_mask": encodings["attention_mask"],
        "labels": labels,
    })

    return dataset


def compute_metrics(eval_pred):
    """Compute accuracy and F1 score for evaluation."""
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    return {
        "accuracy": accuracy_score(labels, predictions),
        "f1_macro": f1_score(labels, predictions, average="macro"),
        "f1_weighted": f1_score(labels, predictions, average="weighted"),
    }


def fine_tune(
    base_model_key="finbert",
    epochs=None,
    batch_size=None,
    learning_rate=None,
    dataset_path=None,
    output_name=None,
):
    """Fine-tune a model on financial sentiment data."""

    epochs = epochs or int(os.getenv("DEFAULT_EPOCHS", 3))
    batch_size = batch_size or int(os.getenv("DEFAULT_BATCH_SIZE", 16))
    learning_rate = learning_rate or float(os.getenv("DEFAULT_LEARNING_RATE", 2e-5))

    base_model_path = os.path.join(CACHE_DIR, base_model_key)
    if not os.path.exists(base_model_path):
        print(f"{Fore.RED}❌ Base model '{base_model_key}' not found at {base_model_path}")
        print(f"   Run: python download_models.py --model {base_model_key}{Style.RESET_ALL}")
        return False

    # Output directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_name = output_name or f"{base_model_key}_finetuned_{timestamp}"
    output_dir = os.path.join(FINE_TUNED_DIR, output_name)
    os.makedirs(output_dir, exist_ok=True)

    print(f"{Fore.WHITE}Configuration:{Style.RESET_ALL}")
    print(f"  Base Model:    {base_model_key}")
    print(f"  Epochs:        {epochs}")
    print(f"  Batch Size:    {batch_size}")
    print(f"  Learning Rate: {learning_rate}")
    print(f"  Output:        {output_dir}")
    print()

    # ── Load tokenizer & model ──────────────────────────────
    print(f"{Fore.CYAN}Loading base model...{Style.RESET_ALL}")
    tokenizer = AutoTokenizer.from_pretrained(base_model_path)
    model = AutoModelForSequenceClassification.from_pretrained(
        base_model_path,
        num_labels=3,  # positive, negative, neutral
        ignore_mismatched_sizes=True,
    )

    # ── Prepare dataset ─────────────────────────────────────
    print(f"{Fore.CYAN}Preparing dataset...{Style.RESET_ALL}")
    if dataset_path and os.path.exists(dataset_path):
        print(f"  Loading custom dataset from: {dataset_path}")
        data = load_dataset_from_file(dataset_path)
    else:
        print(f"  Using built-in financial sentiment dataset ({len(SAMPLE_FINANCIAL_DATA)} samples)")
        data = SAMPLE_FINANCIAL_DATA

    # Split data
    train_data, val_data = train_test_split(data, test_size=0.2, random_state=42)
    print(f"  Train: {len(train_data)} samples")
    print(f"  Validation: {len(val_data)} samples")
    print()

    train_dataset = prepare_hf_dataset(train_data, tokenizer)
    val_dataset = prepare_hf_dataset(val_data, tokenizer)

    # ── Training arguments ──────────────────────────────────
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"{Fore.CYAN}Device: {device.upper()}{Style.RESET_ALL}")
    if device == "cuda":
        print(f"  GPU: {torch.cuda.get_device_name(0)}")
    print()

    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        learning_rate=learning_rate,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1_weighted",
        greater_is_better=True,
        logging_dir=os.path.join(output_dir, "logs"),
        logging_steps=10,
        save_total_limit=2,
        report_to="none",  # Disable wandb etc.
        fp16=torch.cuda.is_available(),  # Use mixed precision on GPU
    )

    # ── Trainer ─────────────────────────────────────────────
    print(f"{Fore.CYAN}Starting fine-tuning...{Style.RESET_ALL}\n")

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=2)],
    )

    # Train
    train_result = trainer.train()

    # ── Evaluation ──────────────────────────────────────────
    print(f"\n{Fore.CYAN}Evaluating fine-tuned model...{Style.RESET_ALL}")
    eval_results = trainer.evaluate()

    print(f"\n{Fore.GREEN}{'='*50}")
    print(f"  📊 Fine-Tuning Results")
    print(f"{'='*50}{Style.RESET_ALL}")
    print(f"  Accuracy:    {eval_results.get('eval_accuracy', 'N/A'):.4f}" if isinstance(eval_results.get('eval_accuracy'), float) else "")
    print(f"  F1 (macro):  {eval_results.get('eval_f1_macro', 'N/A'):.4f}" if isinstance(eval_results.get('eval_f1_macro'), float) else "")
    print(f"  F1 (weight): {eval_results.get('eval_f1_weighted', 'N/A'):.4f}" if isinstance(eval_results.get('eval_f1_weighted'), float) else "")
    print(f"  Loss:        {eval_results.get('eval_loss', 'N/A'):.4f}" if isinstance(eval_results.get('eval_loss'), float) else "")
    print()

    # ── Save final model ────────────────────────────────────
    print(f"{Fore.CYAN}Saving fine-tuned model...{Style.RESET_ALL}")
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)

    # Save training metadata
    metadata = {
        "base_model": base_model_key,
        "output_name": output_name,
        "timestamp": timestamp,
        "epochs": epochs,
        "batch_size": batch_size,
        "learning_rate": learning_rate,
        "train_samples": len(train_data),
        "val_samples": len(val_data),
        "eval_results": {k: float(v) for k, v in eval_results.items() if isinstance(v, (int, float))},
        "device": device,
        "labels": {0: "negative", 1: "neutral", 2: "positive"},
    }
    with open(os.path.join(output_dir, "training_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n{Fore.GREEN}✅ Fine-tuned model saved to: {output_dir}{Style.RESET_ALL}")
    print(f"{Fore.WHITE}   Use this model in model_service.py by setting the model path.{Style.RESET_ALL}\n")

    return True


# ── CLI ─────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Fine-tune HuggingFace models for CapitalWave")
    parser.add_argument("--base", type=str, default="finbert",
                        help="Base model key to fine-tune (default: finbert)")
    parser.add_argument("--epochs", type=int, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, help="Training batch size")
    parser.add_argument("--lr", type=float, help="Learning rate")
    parser.add_argument("--dataset", type=str, help="Path to custom dataset (CSV/JSON)")
    parser.add_argument("--name", type=str, help="Custom name for the fine-tuned model")

    args = parser.parse_args()

    print_banner()

    # Check if base model exists
    available = [d for d in os.listdir(CACHE_DIR)
                 if os.path.isdir(os.path.join(CACHE_DIR, d)) and d != ".hf_cache" and d != "fine_tuned"]

    if not available:
        print(f"{Fore.RED}❌ No base models found. Download one first:")
        print(f"   python download_models.py{Style.RESET_ALL}")
        return

    if args.base not in available:
        print(f"{Fore.RED}❌ Model '{args.base}' not found.")
        print(f"   Available: {', '.join(available)}{Style.RESET_ALL}")
        return

    fine_tune(
        base_model_key=args.base,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        dataset_path=args.dataset,
        output_name=args.name,
    )


if __name__ == "__main__":
    main()
