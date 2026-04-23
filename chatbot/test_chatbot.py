"""
test_chatbot.py — Automated tests for the Local QA Chatbot API
==============================================================
Run with:
    python test_chatbot.py

Requires the server to be running:
    python main.py          (in the chatbot/ folder)
"""

import json
import sys
import requests
import io

# Force UTF-8 stdout mapping for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

BASE_URL = "http://localhost:8000"
PASS = "[PASS]"
FAIL = "[FAIL]"
WARN = "[WARN]"
SEP  = "=" * 60

results = {"passed": 0, "failed": 0, "warnings": 0}


def check(label: str, condition: bool, detail: str = ""):
    if condition:
        print(f"  {PASS}  {label}")
        results["passed"] += 1
    else:
        print(f"  {FAIL}  {label}" + (f" → {detail}" if detail else ""))
        results["failed"] += 1


def warn(label: str, detail: str = ""):
    print(f"  {WARN}  {label}" + (f" → {detail}" if detail else ""))
    results["warnings"] += 1


# ─── Test 1: Server Health ───────────────────────────────────────────────────
def test_health():
    print(f"\n{SEP}")
    print("TEST 1 — Health & Root Endpoints")
    print(SEP)
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=10)
        check("GET /health returns 200", r.status_code == 200)
        data = r.json()
        check("health.status == 'healthy'", data.get("status") == "healthy")
        check("model_loaded == True", data.get("model_loaded") is True)
    except Exception as e:
        check("Server reachable", False, str(e))
        print("\n  ⚠ Server may not be running. Start it with: python main.py")
        sys.exit(1)

    r2 = requests.get(f"{BASE_URL}/", timeout=5)
    check("GET / returns 200", r2.status_code == 200)


# ─── Test 2: Default Context (Stock Questions) ───────────────────────────────
def test_default_context():
    print(f"\n{SEP}")
    print("TEST 2 — Questions answered from built-in stock context")
    print(SEP)

    stock_questions = [
        ("What is a BUY signal?", "rise"),
        ("What is paper trading?", "simulated"),
        ("What does P&L stand for?", "Profit"),
        ("What is portfolio diversification?", "risk"),
        ("What is RSI?", "Relative Strength Index"),
        ("Name a popular Indian stock.", "RELIANCE"),
        ("What is a blue-chip stock?", "established"),
    ]

    for question, keyword in stock_questions:
        r = requests.post(
            f"{BASE_URL}/ask",
            json={"question": question},
            timeout=30,
        )
        check(f"POST /ask — '{question[:45]}...' → 200", r.status_code == 200)
        if r.status_code == 200:
            data = r.json()
            answer = data.get("answer", "")
            score  = data.get("score", 0)
            ctx    = data.get("context_used", "")

            check(
                f"  keyword '{keyword}' in answer or score > 0.05",
                keyword.lower() in answer.lower() or score > 0.05,
                f"answer='{answer[:80]}', score={score}",
            )
            check("  context_used == 'default'", ctx == "default")
            print(f"       Answer  : {answer[:90]}")
            print(f"       Score   : {score}")


# ─── Test 3: Custom Context ───────────────────────────────────────────────────
def test_custom_context():
    print(f"\n{SEP}")
    print("TEST 3 — Custom context supplied by caller")
    print(SEP)

    custom_ctx = (
        "TCS reported a net profit of ₹11,058 crore in Q2 FY24, up 8.7% year-on-year. "
        "Revenue grew to ₹59,692 crore. The company declared a dividend of ₹9 per share. "
        "TCS employs over 600,000 professionals globally and is listed on NSE and BSE."
    )

    cases = [
        ("What was TCS net profit in Q2 FY24?", "11,058"),
        ("How many employees does TCS have?", "600,000"),
        ("What dividend did TCS declare?", "₹9"),
    ]

    for question, keyword in cases:
        r = requests.post(
            f"{BASE_URL}/ask",
            json={"question": question, "context": custom_ctx},
            timeout=30,
        )
        check(f"POST /ask — '{question[:45]}' → 200", r.status_code == 200)
        if r.status_code == 200:
            data = r.json()
            answer = data.get("answer", "")
            score  = data.get("score", 0)
            ctx    = data.get("context_used", "")

            check(
                f"  keyword '{keyword}' in answer",
                keyword.lower() in answer.lower(),
                f"answer='{answer[:80]}'",
            )
            check("  context_used == 'custom'", ctx == "custom")
            print(f"       Answer  : {answer[:90]}")
            print(f"       Score   : {score}")


# ─── Test 4: Edge Cases / Validation ─────────────────────────────────────────
def test_edge_cases():
    print(f"\n{SEP}")
    print("TEST 4 — Edge cases & validation")
    print(SEP)

    # Empty question should return 400
    r = requests.post(f"{BASE_URL}/ask", json={"question": ""}, timeout=10)
    check("Empty question → 400", r.status_code == 400)

    # Very long context (should be truncated, not crash)
    long_ctx = "Stock markets trade shares. " * 300
    r = requests.post(
        f"{BASE_URL}/ask",
        json={"question": "What do stock markets trade?", "context": long_ctx},
        timeout=30,
    )
    check("Very long context → 200 (auto-truncated)", r.status_code == 200)

    # Gibberish question with no matching context → low-confidence fallback
    r = requests.post(
        f"{BASE_URL}/ask",
        json={
            "question": "What is the colour of an alien's spaceship?",
            "context": "The stock exchange opens at 9:15 AM IST.",
        },
        timeout=30,
    )
    check("Unrelated question → 200 (fallback answer)", r.status_code == 200)
    if r.status_code == 200:
        answer = r.json().get("answer", "")
        score  = r.json().get("score", 1)
        if score < 0.05:
            check("  Low-confidence fallback message returned", "don't" in answer.lower())
        else:
            warn("  score > 0.05 (model still returned something)", f"'{answer}'")


# ─── Test 5: Swagger Docs accessible ─────────────────────────────────────────
def test_docs():
    print(f"\n{SEP}")
    print("TEST 5 — Swagger UI & OpenAPI JSON")
    print(SEP)
    r = requests.get(f"{BASE_URL}/docs", timeout=5)
    check("GET /docs → 200", r.status_code == 200)
    r2 = requests.get(f"{BASE_URL}/openapi.json", timeout=5)
    check("GET /openapi.json → 200", r2.status_code == 200)


# ─── Runner ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  CapitalWave Local QA Chatbot — Test Suite")
    print(f"  Target: {BASE_URL}")
    print("=" * 60)

    test_health()
    test_default_context()
    test_custom_context()
    test_edge_cases()
    test_docs()

    print(f"\n{SEP}")
    print("RESULTS")
    print(SEP)
    print(f"  ✓ Passed   : {results['passed']}")
    print(f"  ✗ Failed   : {results['failed']}")
    print(f"  ⚠ Warnings : {results['warnings']}")
    total = results["passed"] + results["failed"]
    pct = int(100 * results["passed"] / total) if total else 0
    print(f"  Score      : {pct}%")
    print(SEP)
    sys.exit(0 if results["failed"] == 0 else 1)
