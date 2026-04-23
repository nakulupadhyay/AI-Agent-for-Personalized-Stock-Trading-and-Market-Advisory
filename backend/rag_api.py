from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os, re, time, warnings, requests, json
import numpy as np
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.document_loaders import PyPDFLoader

warnings.filterwarnings("ignore")

app = FastAPI(title="Stock Market RAG Chatbot v4")

# ==============================
# 0. INPUT FORMAT DEFINITION
# ==============================
class QueryRequest(BaseModel):
    question: str

# --- CONFIG ---
ALPHA_VANTAGE_KEY = "UWE4HM2PEGDGTPRJ"
BASE_URL          = "https://www.alphavantage.co/query"
TICKERS           = ["AAPL", "TSLA", "MSFT", "GOOGL", "RELIANCE"]
INDEX_PATH        = "stock_index"
EMBED_MODEL       = "sentence-transformers/all-MiniLM-L6-v2"
TOP_K_DOCS        = 8
CACHE_DIR         = "av_cache"
os.makedirs(CACHE_DIR, exist_ok=True)

def _cache_path(key): 
    return os.path.join(CACHE_DIR, f"{re.sub(r'[^a-zA-Z0-9_]', '_', key)}.json")

def _load_cache(key):
    p = _cache_path(key)
    if os.path.exists(p) and (time.time() - os.path.getmtime(p) < 3600):
        try:
            with open(p) as f: 
                return json.load(f)
        except:
            return None
    return None

def _save_cache(key, data):
    try:
        with open(_cache_path(key), "w") as f: 
            json.dump(data, f)
    except Exception as e:
        print(f"Cache save error: {e}")

def av_get(params, cache_key):
    cached = _load_cache(cache_key)
    if cached: 
        return cached
    params["apikey"] = ALPHA_VANTAGE_KEY
    try:
        r = requests.get(BASE_URL, params=params, timeout=15)
        data = r.json()
        if "Note" in data or "Error Message" in data: 
            return {}
        _save_cache(cache_key, data)
        return data
    except: 
        return {}

def av_daily_prices(t):
    data = av_get({"function": "TIME_SERIES_DAILY", "symbol": t, "outputsize": "compact"}, f"daily_{t}")
    series = data.get("Time Series (Daily)", {})
    return [{"date": d, "close": float(v["4. close"]), "volume": int(v["5. volume"])} for d, v in sorted(series.items(), reverse=True)[:65]]

def av_quote(t):
    q = av_get({"function": "GLOBAL_QUOTE", "symbol": t}, f"quote_{t}").get("Global Quote", {})
    return {"price": float(q.get("05. price", 0)), "change_pct": q.get("10. change percent", "0%")}

def av_rsi(t):
    d = av_get({"function":"RSI","symbol":t,"interval":"daily","time_period":14,"series_type":"close"}, f"rsi_{t}")
    s = d.get("Technical Analysis: RSI", {})
    if not s: return None
    latest_val = s[sorted(s.keys(), reverse=True)[0]]
    return float(latest_val["RSI"]) if isinstance(latest_val, dict) else float(latest_val)

def av_macd(t):
    d = av_get({"function":"MACD","symbol":t,"interval":"daily","series_type":"close"}, f"macd_{t}")
    s = d.get("Technical Analysis: MACD", {})
    if not s: 
        return None
    r = s[sorted(s.keys(), reverse=True)[0]]
    return {"macd": float(r["MACD"]), "signal": float(r["MACD_Signal"]), "histogram": float(r["MACD_Hist"])}

def av_sma(t, p):
    d = av_get({"function":"SMA","symbol":t,"interval":"daily","time_period":p,"series_type":"close"}, f"sma{p}_{t}")
    s = d.get("Technical Analysis: SMA", {})
    if not s: return None
    latest_val = s[sorted(s.keys(), reverse=True)[0]]
    return float(latest_val["SMA"]) if isinstance(latest_val, dict) else float(latest_val)

def av_news(t):
    d = av_get({"function": "NEWS_SENTIMENT", "tickers": t, "limit": 10}, f"news_{t}")
    return [{"sentiment": i.get("overall_sentiment_label", "Neutral")} for i in d.get("feed", [])]

# --- LOGIC ---
def compute_signal(ticker):
    prices = av_daily_prices(ticker)
    if not prices or len(prices) == 0: 
        return None
    
    closes = [r['close'] for r in prices]
    latest = closes[0]
    rsi_val = av_rsi(ticker) or 50
    sma20 = av_sma(ticker, 20) or np.mean(closes[:20] if len(closes) >= 20 else closes)
    sma50 = av_sma(ticker, 50) or np.mean(closes[:50] if len(closes) >= 50 else closes)

    score = 0
    if latest > sma20 > sma50: score += 25
    elif latest < sma20 < sma50: score -= 25
    if rsi_val < 35: score += 20
    elif rsi_val > 70: score -= 20

    signal = "BUY" if score >= 20 else "SELL" if score <= -20 else "HOLD"
    return {"signal": signal, "confidence": 70, "latest": latest, "rsi": rsi_val}

def stock_answer(question, retriever_obj):
    q_upper = question.upper()
    ticker = None
    for t in TICKERS:
        if t in q_upper: 
            ticker = t
            break

    if ticker:
        sig = compute_signal(ticker)
        if sig: 
            return f"Signal for {ticker}: {sig['signal']} (Price: ${sig['latest']:.2f}, RSI: {sig['rsi']:.1f})"

    # Fallback to RAG if no ticker found
    docs = retriever_obj.get_relevant_documents(question)
    return "\n".join([d.page_content for d in docs[:3]]) if docs else "No specific data found."

# --- INITIALIZE GLOBAL OBJECTS ---
embed = HuggingFaceEmbeddings(model_name=EMBED_MODEL)

try:
    if os.path.exists(INDEX_PATH):
        vectorstore = FAISS.load_local(INDEX_PATH, embed, allow_dangerous_deserialization=True)
    else:
        # Load from documents if available
        if os.path.exists("data.pdf"):
            loader = PyPDFLoader("data.pdf")
            docs = loader.load()
            splitter = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=80)
            texts = splitter.split_documents(docs)
            vectorstore = FAISS.from_documents(texts, embed)
            vectorstore.save_local(INDEX_PATH)
        else:
            d = [Document(page_content="AAPL is a tech company.", metadata={})]
            vectorstore = FAISS.from_documents(d, embed)
except Exception as e:
    print(f"FAISS initialization error: {e}")
    d = [Document(page_content="Fallback data.", metadata={})]
    vectorstore = FAISS.from_documents(d, embed)

retriever = vectorstore.as_retriever(search_kwargs={"k": TOP_K_DOCS})

# ==============================
# API ENDPOINT
# ==============================
@app.post("/api/query")
def answer_question_endpoint(request: QueryRequest):
    try:
        ans = stock_answer(request.question, retriever)
        
        # Determine confidence for integration compatibility
        confidence = 0.85 if "Signal for" in ans else 0.5
        if ans == "No specific data found.":
            confidence = 0.1 # Minimum non-zero value
            
        return {
            "answer": ans,
            "confidence": confidence,
            "status": "success"
        }
    except Exception as e:
        return {
            "answer": f"API Error: {str(e)}",
            "confidence": 0.0,
            "status": "error"
        }

# Run the server using: uvicorn rag_api:app --host 0.0.0.0 --port 8000
