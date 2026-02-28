"""
risk_classifier.py
==================
ML-Based Portfolio Risk Classification using Random Forest.

Trained on synthetically generated data derived from established
financial heuristics. This is suitable for a final-year AI fintech
project demonstration.

Features:
  - Portfolio volatility (annualized %)
  - Sharpe Ratio
  - Max Drawdown (%)
  - Sector concentration (HHI-derived %)
  - Diversification ratio (stocks/sectors)
  - Number of holdings

Output:
  - Risk category: Low / Medium / High
  - Confidence percentage

Flask endpoint: POST /predict-risk

Usage:
    python risk_classifier.py          # Start standalone on port 5002
    # Or import and register blueprint in model_service.py
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from flask import Blueprint, request, jsonify
import json
import os

# ── Blueprint for integration with model_service.py ──────────
risk_bp = Blueprint('risk_classifier', __name__)

# ── Global model reference ───────────────────────────────────
_model = None
_feature_names = [
    'volatility',
    'sharpe_ratio',
    'max_drawdown',
    'sector_concentration',
    'diversification_ratio',
    'holding_count',
]


# ═══════════════════════════════════════════════════════════════
# 1. SYNTHETIC TRAINING DATA GENERATION
# ═══════════════════════════════════════════════════════════════

def generate_training_data(n_samples=3000, seed=42):
    """
    Generate synthetic labeled data based on financial heuristics.

    The labeling logic mirrors textbook risk assessment criteria:
      - Low Risk:  low vol, positive Sharpe, low drawdown, diversified
      - High Risk: high vol, negative Sharpe, high drawdown, concentrated
      - Medium Risk: everything in between

    Returns:
        X (np.ndarray): Feature matrix (n_samples, 6)
        y (np.ndarray): Labels array (0=Low, 1=Medium, 2=High)
    """
    rng = np.random.RandomState(seed)

    # Generate feature distributions
    volatility = rng.uniform(5, 60, n_samples)           # annualized %
    sharpe_ratio = rng.uniform(-2.0, 3.0, n_samples)
    max_drawdown = rng.uniform(0, 50, n_samples)          # %
    sector_concentration = rng.uniform(10, 100, n_samples) # %
    diversification_ratio = rng.uniform(0.5, 5.0, n_samples)
    holding_count = rng.randint(1, 20, n_samples)

    X = np.column_stack([
        volatility,
        sharpe_ratio,
        max_drawdown,
        sector_concentration,
        diversification_ratio,
        holding_count,
    ])

    # Label using rule-based heuristics (this IS the ground truth for training)
    y = np.zeros(n_samples, dtype=int)  # default Medium (1)
    y[:] = 1  # Medium

    for i in range(n_samples):
        risk_score = 0

        # Volatility scoring (0-35 points)
        if volatility[i] < 12:
            risk_score += 0
        elif volatility[i] < 25:
            risk_score += 15
        else:
            risk_score += 35

        # Sharpe scoring (0-25 points, inverted)
        if sharpe_ratio[i] > 1.5:
            risk_score += 0
        elif sharpe_ratio[i] > 0.5:
            risk_score += 10
        elif sharpe_ratio[i] > 0:
            risk_score += 18
        else:
            risk_score += 25

        # Drawdown scoring (0-25 points)
        if max_drawdown[i] < 5:
            risk_score += 0
        elif max_drawdown[i] < 15:
            risk_score += 12
        else:
            risk_score += 25

        # Concentration scoring (0-15 points)
        if sector_concentration[i] > 60:
            risk_score += 15
        elif sector_concentration[i] > 35:
            risk_score += 7
        else:
            risk_score += 0

        # Add some noise for realistic ML training
        risk_score += rng.normal(0, 5)

        # Classify
        if risk_score <= 30:
            y[i] = 0  # Low
        elif risk_score <= 60:
            y[i] = 1  # Medium
        else:
            y[i] = 2  # High

    return X, y


# ═══════════════════════════════════════════════════════════════
# 2. MODEL TRAINING
# ═══════════════════════════════════════════════════════════════

def train_model():
    """Train the Random Forest classifier and return it."""
    global _model

    print("🔧 Generating synthetic training data...")
    X, y = generate_training_data(n_samples=3000)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"📊 Training set: {len(X_train)} samples")
    print(f"📊 Test set: {len(X_test)} samples")
    print(f"📊 Class distribution: Low={sum(y==0)}, Medium={sum(y==1)}, High={sum(y==2)}")

    # Train Random Forest
    _model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    _model.fit(X_train, y_train)

    # Evaluate
    y_pred = _model.predict(X_test)
    accuracy = (_model.score(X_test, y_test) * 100)
    print(f"\n✅ Model trained! Accuracy: {accuracy:.1f}%")
    print("\nClassification Report:")
    print(classification_report(
        y_test, y_pred,
        target_names=['Low Risk', 'Medium Risk', 'High Risk']
    ))

    # Feature importance
    importance = dict(zip(_feature_names, _model.feature_importances_))
    print("Feature Importance:")
    for name, imp in sorted(importance.items(), key=lambda x: -x[1]):
        print(f"  {name}: {imp:.3f}")

    return _model


def get_model():
    """Get or train the model."""
    global _model
    if _model is None:
        _model = train_model()
    return _model


# ═══════════════════════════════════════════════════════════════
# 3. PREDICTION
# ═══════════════════════════════════════════════════════════════

RISK_LABELS = {0: 'Low', 1: 'Medium', 2: 'High'}

def predict_risk(features):
    """
    Predict risk category from portfolio features.

    Args:
        features (dict): {
            volatility, sharpeRatio, maxDrawdown,
            sectorConcentration, diversificationRatio, holdingCount
        }

    Returns:
        dict: { category, confidence, probabilities }
    """
    model = get_model()

    X = np.array([[
        features.get('volatility', 20),
        features.get('sharpeRatio', 0),
        features.get('maxDrawdown', 10),
        features.get('sectorConcentration', 50),
        features.get('diversificationRatio', 1.0),
        features.get('holdingCount', 3),
    ]])

    prediction = model.predict(X)[0]
    probabilities = model.predict_proba(X)[0]

    return {
        'category': RISK_LABELS[prediction],
        'confidence': float(max(probabilities) * 100),
        'probabilities': {
            'Low': float(probabilities[0] * 100),
            'Medium': float(probabilities[1] * 100),
            'High': float(probabilities[2] * 100),
        },
    }


# ═══════════════════════════════════════════════════════════════
# 4. FLASK ENDPOINT
# ═══════════════════════════════════════════════════════════════

@risk_bp.route('/predict-risk', methods=['POST'])
def predict_risk_endpoint():
    """
    POST /predict-risk

    Request body (JSON):
    {
        "volatility": 25.5,        // annualized %
        "sharpeRatio": 0.8,
        "maxDrawdown": 12.3,       // %
        "sectorConcentration": 45, // %
        "diversificationRatio": 2.0,
        "holdingCount": 5
    }

    Response:
    {
        "success": true,
        "prediction": {
            "category": "Medium",
            "confidence": 78.5,
            "probabilities": { "Low": 12.5, "Medium": 78.5, "High": 9.0 }
        }
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No JSON body provided'}), 400

        result = predict_risk(data)

        return jsonify({
            'success': True,
            'prediction': result,
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
        }), 500


@risk_bp.route('/risk-model-info', methods=['GET'])
def model_info_endpoint():
    """GET /risk-model-info — Return model metadata."""
    model = get_model()
    return jsonify({
        'success': True,
        'model': {
            'type': 'RandomForestClassifier',
            'n_estimators': model.n_estimators,
            'max_depth': model.max_depth,
            'features': _feature_names,
            'classes': list(RISK_LABELS.values()),
            'feature_importance': dict(zip(
                _feature_names,
                [round(float(x), 4) for x in model.feature_importances_]
            )),
        },
    })


# ═══════════════════════════════════════════════════════════════
# 5. STANDALONE SERVER
# ═══════════════════════════════════════════════════════════════

if __name__ == '__main__':
    from flask import Flask
    from flask_cors import CORS

    app = Flask(__name__)
    CORS(app)
    app.register_blueprint(risk_bp)

    # Pre-train model on startup
    print("=" * 50)
    print(" Risk Classifier — Standalone Server")
    print("=" * 50)
    train_model()

    port = int(os.environ.get('RISK_PORT', 5002))
    print(f"\n🚀 Risk classifier running on http://localhost:{port}")
    print(f"   POST /predict-risk")
    print(f"   GET  /risk-model-info")
    app.run(host='0.0.0.0', port=port, debug=False)
