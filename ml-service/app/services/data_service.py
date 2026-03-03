"""
Data Service — MongoDB connector for reading user data, transactions, portfolios.
"""
import logging
from pymongo import MongoClient
from bson import ObjectId
from app.config import settings

logger = logging.getLogger(__name__)

_client = None
_db = None


def get_db():
    """Get or create MongoDB connection."""
    global _client, _db
    if _db is None:
        try:
            _client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=3000)
            _db = _client[settings.DB_NAME]
            # Test connection
            _client.server_info()
            logger.info("Connected to MongoDB")
        except Exception as e:
            logger.warning(f"MongoDB connection failed: {e}")
            _db = None
    return _db


def get_user(user_id: str) -> dict:
    """Fetch user by ID."""
    db = get_db()
    if db is None:
        return {}
    try:
        user = db.users.find_one({"_id": ObjectId(user_id)})
        return user or {}
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        return {}


def get_user_transactions(user_id: str, limit: int = 500) -> list:
    """Fetch user's transactions, sorted chronologically."""
    db = get_db()
    if db is None:
        return []
    try:
        txns = list(
            db.transactions.find({"userId": ObjectId(user_id)})
            .sort("timestamp", 1)
            .limit(limit)
        )
        return txns
    except Exception as e:
        logger.error(f"Error fetching transactions: {e}")
        return []


def get_portfolio(user_id: str) -> dict:
    """Fetch user's portfolio."""
    db = get_db()
    if db is None:
        return {}
    try:
        portfolio = db.portfolios.find_one({"userId": ObjectId(user_id)})
        return portfolio or {}
    except Exception as e:
        logger.error(f"Error fetching portfolio: {e}")
        return {}


def get_risk_profile(user_id: str) -> dict:
    """Fetch user's risk profile."""
    db = get_db()
    if db is None:
        return {}
    try:
        profile = db.riskprofiles.find_one({"userId": ObjectId(user_id)})
        return profile or {}
    except Exception as e:
        logger.error(f"Error fetching risk profile: {e}")
        return {}


def get_all_users_with_transactions() -> list:
    """Fetch all users who have at least one transaction. For behavior clustering."""
    db = get_db()
    if db is None:
        return []
    try:
        # Get unique user IDs from transactions
        user_ids = db.transactions.distinct("userId")
        users = []
        for uid in user_ids:
            user = db.users.find_one({"_id": uid})
            txns = list(db.transactions.find({"userId": uid}).sort("timestamp", 1))
            if user and txns:
                users.append({"user": user, "transactions": txns})
        return users
    except Exception as e:
        logger.error(f"Error fetching users with transactions: {e}")
        return []
