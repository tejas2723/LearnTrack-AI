import httpx
import asyncio
from backend.database import get_db
from backend.routers.auth import create_access_token
from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv()

from backend.config import settings
from backend.database import get_db

async def main():
    client_instance = MongoClient(settings.DATABASE_URL)
    db = client_instance[settings.DATABASE_NAME]
    student = db.users.find_one({"role": "student"})
    if not student:
        print("No student found")
        return
        
    token = create_access_token(data={"sub": student["email"], "role": student["role"], "user_id": student["_id"]})
    print(f"Testing with student: {student['email']}")
    
    cookies = {"access_token": token}
    payload = {"message": "Test message", "session_id": "test_session_123"}
    
    async with httpx.AsyncClient() as client:
        # Use stream to read SSE
        async with client.stream("POST", "http://localhost:8000/api/chatbot/chat", json=payload, cookies=cookies) as response:
            print("Status:", response.status_code)
            async for line in response.aiter_lines():
                print(line)

if __name__ == "__main__":
    asyncio.run(main())
