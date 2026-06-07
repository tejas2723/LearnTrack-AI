from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel

from backend.database import get_db, get_next_sequence_value
from backend.models.user import User
from backend.routers.auth import require_teacher, get_current_user

router = APIRouter(prefix="/suggestions", tags=["suggestions"])

class SuggestionCreate(BaseModel):
    student_id: Optional[int] = None  # null = send to whole class
    subject: str
    message: str
    priority: Literal["low", "medium", "high"]

def _format_suggestion(s: dict, teacher: dict, student: Optional[dict] = None) -> dict:
    return {
        "id": s["_id"],
        "teacher_id": s.get("teacher_id"),
        "student_id": s.get("student_id"),
        "subject": s.get("subject", ""),
        "message": s.get("message", ""),
        "priority": s.get("priority", "low"),
        "created_at": s.get("created_at"),
        "is_read": s.get("is_read", False),
        "teacher_name": teacher.get("full_name", "") if teacher else "Unknown",
        "student_name": student.get("full_name") if student else None
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_suggestion(
    payload: SuggestionCreate,
    db=Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    if payload.student_id:
        student = db.users.find_one({"_id": payload.student_id, "role": "student"})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
    else:
        student = None

    suggestion_id = get_next_sequence_value("suggestions")
    suggestion_doc = {
        "_id": suggestion_id,
        "teacher_id": current_user.id,
        "student_id": payload.student_id,
        "subject": payload.subject,
        "message": payload.message,
        "priority": payload.priority,
        "is_read": False,
        "created_at": datetime.now()
    }
    db.suggestions.insert_one(suggestion_doc)

    teacher_doc = {"full_name": current_user.full_name}
    return _format_suggestion(suggestion_doc, teacher_doc, student)

@router.get("")
def list_suggestions(
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "teacher":
        suggestions = list(db.suggestions.find({"teacher_id": current_user.id}).sort("created_at", -1))
    elif current_user.role == "student":
        raise HTTPException(status_code=403, detail="Use the student-specific suggestions endpoint")
    else:
        suggestions = list(db.suggestions.find({}).sort("created_at", -1))

    # Bulk load teachers and students
    teacher_ids = list({s["teacher_id"] for s in suggestions})
    student_ids = list({s["student_id"] for s in suggestions if s.get("student_id")})
    teachers_map = {u["_id"]: u for u in db.users.find({"_id": {"$in": teacher_ids}})}
    students_map = {u["_id"]: u for u in db.users.find({"_id": {"$in": student_ids}})}

    response = []
    for s in suggestions:
        teacher = teachers_map.get(s["teacher_id"], {})
        student = students_map.get(s["student_id"]) if s.get("student_id") else None
        response.append(_format_suggestion(s, teacher, student))
    return response

@router.get("/student/{id}")
def get_student_suggestions(
    id: int,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "student" and current_user.id != id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Return both individual suggestions and class-wide suggestions (student_id == null)
    suggestions = list(db.suggestions.find(
        {"$or": [{"student_id": id}, {"student_id": None}]}
    ).sort("created_at", -1))

    teacher_ids = list({s["teacher_id"] for s in suggestions})
    teachers_map = {u["_id"]: u for u in db.users.find({"_id": {"$in": teacher_ids}})}
    student_doc = db.users.find_one({"_id": id})

    response = []
    for s in suggestions:
        teacher = teachers_map.get(s["teacher_id"], {})
        student = student_doc if s.get("student_id") == id else None
        response.append(_format_suggestion(s, teacher, student))
    return response

@router.get("/class")
def get_class_suggestions(
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    suggestions = list(db.suggestions.find({"student_id": None}).sort("created_at", -1))
    teacher_ids = list({s["teacher_id"] for s in suggestions})
    teachers_map = {u["_id"]: u for u in db.users.find({"_id": {"$in": teacher_ids}})}

    response = []
    for s in suggestions:
        teacher = teachers_map.get(s["teacher_id"], {})
        response.append(_format_suggestion(s, teacher, None))
    return response

@router.patch("/{id}/read")
def mark_suggestion_as_read(
    id: int,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    suggestion = db.suggestions.find_one({"_id": id})
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    if current_user.role == "student" and suggestion.get("student_id") is not None and suggestion["student_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.suggestions.update_one({"_id": id}, {"$set": {"is_read": True}})
    suggestion["is_read"] = True

    teacher_doc = db.users.find_one({"_id": suggestion["teacher_id"]}) or {}
    student_doc = db.users.find_one({"_id": suggestion["student_id"]}) if suggestion.get("student_id") else None
    return _format_suggestion(suggestion, teacher_doc, student_doc)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_suggestion(
    id: int,
    db=Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    suggestion = db.suggestions.find_one({"_id": id})
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    if suggestion["teacher_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete suggestions that you created")

    db.suggestions.delete_one({"_id": id})
