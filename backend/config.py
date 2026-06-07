import os

# Load .env file manually from the workspace root if it exists
root_dir = os.path.dirname(os.path.dirname(__file__))
env_path = os.path.join(root_dir, ".env")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip()

class Settings:
  SECRET_KEY: str = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
  ALGORITHM: str = "HS256"
  ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
  
  # Database configuration: defaults to local SQLite for easy out-of-the-box operation,
  # but supports PostgreSQL via the DATABASE_URL environment variable.
  DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./students.db")
  
  # MongoDB configuration
  MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
  MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "learntrack_ai")
  
  # CSV dataset seed file path
  CSV_SEED_PATH: str = os.getenv("CSV_SEED_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "FINAL_BULLETPROOF_DATASET.csv"))

  # Gemini API credentials
  GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()
