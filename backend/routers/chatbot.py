import json
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from backend.database import get_db, get_next_sequence_value
from backend.models.user import User
from backend.routers.auth import get_current_user, require_student
from backend.ml.analyzer import detect_weak_topics
from backend.config import settings

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

class ChatPayload(BaseModel):
    message: str
    session_id: str

@router.post("/chat")
async def chat_with_tutor(
    payload: ChatPayload,
    db=Depends(get_db),
    current_user: User = Depends(require_student)
):
    # 1. Fetch student context
    student_doc = db.users.find_one({"_id": current_user.id})
    if not student_doc:
        raise HTTPException(status_code=404, detail="Student not found")

    # 2. Get recent results to detect weak topics
    all_results_raw = list(db.results.find({"student_id": current_user.id}).sort("timestamp", -1))

    # Enrich with quiz subject info for weak topic detection
    quiz_ids = [r["quiz_id"] for r in all_results_raw]
    quizzes_map = {q["_id"]: q for q in db.quizzes.find({"_id": {"$in": quiz_ids}})}
    all_results = []
    for r in all_results_raw:
        quiz = quizzes_map.get(r["quiz_id"], {})
        all_results.append({
            "topic": quiz.get("subject") or quiz.get("title"),
            "accuracy": r.get("accuracy"),
            "score": r.get("score"),
            "total_questions": r.get("total_questions"),
        })

    # 3. Identify weak topics
    weak_topics_list = detect_weak_topics(all_results)
    weak_topics = ", ".join(weak_topics_list) if weak_topics_list else "None detected yet"

    # 4. Get last quiz info
    if all_results_raw:
        last_r = all_results_raw[0]
        last_score = int(last_r.get("accuracy", 75))
        last_quiz = quizzes_map.get(last_r["quiz_id"], {})
        last_subject = last_quiz.get("title", "Unassessed")
    else:
        last_score = 75
        last_subject = "Unassessed"

    # 5. Build system prompt
    student_name = student_doc.get("full_name", "Student")
    system_prompt = f"""You are an intelligent academic tutor helping a student named {student_name}.
The student's weak topics are: {weak_topics}.
Their recent quiz score was {last_score}% in {last_subject}.
Your role: answer academic doubts clearly and concisely.
Explain concepts step by step. Use simple examples.
If asked something non-academic, politely redirect.
Keep responses under 200 words unless a detailed explanation is needed."""

    # 6. Save user message
    msg_id = get_next_sequence_value("chat_history")
    db.chat_history.insert_one({
        "_id": msg_id,
        "student_id": current_user.id,
        "session_id": payload.session_id,
        "role": "user",
        "message": payload.message,
        "created_at": datetime.now()
    })

    # 7. Fetch chat history for this session
    history = list(db.chat_history.find(
        {"session_id": payload.session_id}
    ).sort("created_at", 1))

    # 8. Format for Gemini API (combine consecutive messages of same role)
    contents = []
    for h in history[:-1]:  # exclude the message we just saved
        role = "user" if h["role"] == "user" else "model"
        if contents and contents[-1]["role"] == role:
            contents[-1]["parts"][0]["text"] += "\n" + h["message"]
        else:
            contents.append({"role": role, "parts": [{"text": h["message"]}]})

    # Add current user message
    if contents and contents[-1]["role"] == "user":
        contents[-1]["parts"][0]["text"] += "\n" + payload.message
    else:
        contents.append({"role": "user", "parts": [{"text": payload.message}]})

    gemini_key = settings.GEMINI_API_KEY
    if not gemini_key:
        fallback_msg = "I'm sorry, my Gemini tutor API key is not configured. Please add GEMINI_API_KEY in the environment."
        fallback_id = get_next_sequence_value("chat_history")
        db.chat_history.insert_one({
            "_id": fallback_id,
            "student_id": current_user.id,
            "session_id": payload.session_id,
            "role": "assistant",
            "message": fallback_msg,
            "created_at": datetime.now()
        })

        async def fallback_generator():
            yield fallback_msg
        return StreamingResponse(fallback_generator(), media_type="text/plain")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key={gemini_key}"
    payload_data = {
        "contents": contents,
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        }
    }

    async def stream_generator():
        collected_text = []
        async with httpx.AsyncClient() as client:
            try:
                async with client.stream("POST", url, json=payload_data, timeout=30.0) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        yield f"Error: Failed to contact AI. Status: {response.status_code}, Body: {error_text.decode('utf-8')}"
                        return

                    async for line in response.aiter_lines():
                        line = line.strip()
                        if line.startswith("data: "):
                            data_str = line[6:].strip()
                            if data_str:
                                try:
                                    chunk_data = json.loads(data_str)
                                    text = chunk_data["candidates"][0]["content"]["parts"][0]["text"]
                                    collected_text.append(text)
                                    yield text
                                except Exception:
                                    pass
            except Exception as e:
                yield f"\n[Connection Error: {str(e)}]"

        # Save complete assistant response to DB
        assistant_message = "".join(collected_text)
        if assistant_message:
            try:
                asst_id = get_next_sequence_value("chat_history")
                db.chat_history.insert_one({
                    "_id": asst_id,
                    "student_id": current_user.id,
                    "session_id": payload.session_id,
                    "role": "assistant",
                    "message": assistant_message,
                    "created_at": datetime.now()
                })
            except Exception as store_err:
                print(f"Failed to store assistant chat message: {store_err}")

    return StreamingResponse(stream_generator(), media_type="text/plain")

@router.get("/history/{session_id}")
def get_chat_history(
    session_id: str,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    history = list(db.chat_history.find(
        {"session_id": session_id}
    ).sort("created_at", 1))

    return [
        {
            "id": h["_id"],
            "role": h.get("role", "user"),
            "message": h.get("message", ""),
            "created_at": h.get("created_at")
        }
        for h in history
    ]
