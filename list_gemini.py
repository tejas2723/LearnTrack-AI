import httpx
import asyncio
from backend.config import settings

async def main():
    gemini_key = settings.GEMINI_API_KEY
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={gemini_key}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        print("Status:", response.status_code)
        import json
        try:
            data = response.json()
            for model in data.get("models", []):
                print(model.get("name"), "-", model.get("supportedGenerationMethods", []))
        except Exception as e:
            print("Response:", response.text)

if __name__ == "__main__":
    asyncio.run(main())
