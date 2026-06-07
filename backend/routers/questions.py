import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Optional
from pydantic import BaseModel

from backend.database import get_db, get_next_sequence_value
from backend.models.user import User
from backend.routers.auth import require_teacher, get_current_user

router = APIRouter(prefix="/questions", tags=["questions"])

class QuestionCreate(BaseModel):
    quiz_id: Optional[int] = None
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str  # "a", "b", "c", "d"
    explanation: Optional[str] = None
    difficulty: str = "medium"
    topic: Optional[str] = None
    subject: Optional[str] = None
    marks: int = 1
    time_limit_seconds: int = 60

class QuestionUpdate(BaseModel):
    quiz_id: Optional[int] = None
    question_text: Optional[str] = None
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_option: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: Optional[str] = None
    topic: Optional[str] = None
    subject: Optional[str] = None
    marks: Optional[int] = None
    time_limit_seconds: Optional[int] = None

def _format_question(q: dict) -> dict:
    return {
        "id": q["_id"],
        "quiz_id": q.get("quiz_id"),
        "question_text": q.get("question_text", ""),
        "option_a": q.get("option_a", ""),
        "option_b": q.get("option_b", ""),
        "option_c": q.get("option_c", ""),
        "option_d": q.get("option_d", ""),
        "correct_option": q.get("correct_option", "a"),
        "explanation": q.get("explanation"),
        "difficulty": q.get("difficulty", "medium"),
        "topic": q.get("topic"),
        "subject": q.get("subject"),
        "marks": q.get("marks", 1),
        "time_limit_seconds": q.get("time_limit_seconds", 60)
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_question(
    payload: QuestionCreate,
    db=Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    q_id = get_next_sequence_value("questions")
    q_doc = {
        "_id": q_id,
        "quiz_id": payload.quiz_id,
        "question_text": payload.question_text,
        "option_a": payload.option_a,
        "option_b": payload.option_b,
        "option_c": payload.option_c,
        "option_d": payload.option_d,
        "correct_option": payload.correct_option.lower(),
        "explanation": payload.explanation,
        "difficulty": payload.difficulty.lower(),
        "topic": payload.topic,
        "subject": payload.subject,
        "marks": payload.marks,
        "time_limit_seconds": payload.time_limit_seconds
    }
    db.questions.insert_one(q_doc)
    return _format_question(q_doc)

@router.post("/bulk", status_code=status.HTTP_201_CREATED)
async def bulk_upload_questions(
    quiz_id: Optional[int] = None,
    file: UploadFile = File(...),
    db=Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    try:
        contents = await file.read()
        decoded = contents.decode("utf-8")
        f = io.StringIO(decoded)
        reader = csv.DictReader(f)

        reader.fieldnames = [name.strip() for name in reader.fieldnames] if reader.fieldnames else []

        added_count = 0
        for row in reader:
            row = {k: v.strip() if v else "" for k, v in row.items()}
            if not row.get("question_text"):
                continue

            q_id = get_next_sequence_value("questions")
            q_doc = {
                "_id": q_id,
                "quiz_id": quiz_id,
                "question_text": row.get("question_text", ""),
                "option_a": row.get("option_a", ""),
                "option_b": row.get("option_b", ""),
                "option_c": row.get("option_c", ""),
                "option_d": row.get("option_d", ""),
                "correct_option": row.get("correct_option", "a").lower(),
                "difficulty": row.get("difficulty", "medium").lower(),
                "explanation": row.get("explanation", ""),
                "topic": row.get("topic", "General"),
                "subject": row.get("subject", "General"),
                "marks": int(row.get("marks", 1)) if row.get("marks") else 1,
                "time_limit_seconds": int(row.get("time_limit_seconds", 60)) if row.get("time_limit_seconds") else 60
            }
            db.questions.insert_one(q_doc)
            added_count += 1

        return {"detail": f"Successfully imported {added_count} questions."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV Parsing failed: {str(e)}")

@router.get("")
def list_questions(
    subject: Optional[str] = None,
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = {}
    if subject:
        query["subject"] = {"$regex": subject, "$options": "i"}
    if topic:
        query["topic"] = {"$regex": topic, "$options": "i"}
    if difficulty:
        query["difficulty"] = difficulty.lower()

    questions = list(db.questions.find(query))
    return [_format_question(q) for q in questions]

@router.patch("/{id}")
def update_question(
    id: int,
    payload: QuestionUpdate,
    db=Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    q_doc = db.questions.find_one({"_id": id})
    if not q_doc:
        raise HTTPException(status_code=404, detail="Question not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "correct_option" in update_data and update_data["correct_option"]:
        update_data["correct_option"] = update_data["correct_option"].lower()
    if "difficulty" in update_data and update_data["difficulty"]:
        update_data["difficulty"] = update_data["difficulty"].lower()

    if update_data:
        db.questions.update_one({"_id": id}, {"$set": update_data})

    updated = db.questions.find_one({"_id": id})
    return _format_question(updated)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    id: int,
    db=Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    q_doc = db.questions.find_one({"_id": id})
    if not q_doc:
        raise HTTPException(status_code=404, detail="Question not found")
    db.questions.delete_one({"_id": id})
