import logging
from pymongo import MongoClient, ReturnDocument
from backend.config import settings

logger = logging.getLogger("uvicorn.error")

# Configure MongoDB connection
mongodb_url = settings.MONGODB_URL
client = MongoClient(mongodb_url)
db = client[settings.MONGODB_DB_NAME]

# Dependency to get db session in FastAPI routes (yields pymongo database object)
def get_db():
    yield db

# Sequence generator to use auto-incrementing integer IDs
def get_next_sequence_value(sequence_name: str) -> int:
    result = db.counters.find_one_and_update(
        {"_id": sequence_name},
        {"$inc": {"sequence_value": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return result["sequence_value"]

# Initialize MongoDB collection indexes
def init_db():
    logger.info("Initializing MongoDB collection indexes...")
    # Unique email and prn_no constraints on users
    db.users.create_index("email", unique=True)
    db.users.create_index("prn_no", unique=True, sparse=True)
    
    # Indexes for performance optimization on hot query filters
    db.study_materials.create_index("subject")
    db.study_materials.create_index("topic")
    db.results.create_index("student_id")
    db.suggestions.create_index("student_id")
    db.suggestions.create_index("teacher_id")
    db.chat_history.create_index("session_id")
    db.questions.create_index("quiz_id")
