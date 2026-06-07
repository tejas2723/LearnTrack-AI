import httpx
import asyncio
from backend.config import settings

async def main():
    gemini_key = settings.GEMINI_API_KEY
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:streamGenerateContent?alt=sse&key={gemini_key}"
    payload_data = {
        "contents": [{"role": "user", "parts": [{"text": "Hello"}]}],
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload_data)
        print("Status:", response.status_code)
        print("Response:", response.text)

if __name__ == "__main__":
    asyncio.run(main())
