from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime

from backend.database import get_db
from backend.models.user import User
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/students", tags=["students"])

def _format_user(u: dict) -> dict:
    return {
        "id": u["_id"],
        "email": u.get("email", ""),
        "full_name": u.get("full_name", ""),
        "role": u.get("role", "student"),
        "prn_no": u.get("prn_no"),
        "class_name": u.get("class_name"),
        "predicted_score": u.get("predicted_score", 70),
        "risk_level": u.get("risk_level", "Low"),
        "preferred_style": u.get("preferred_style", "Practice-based learning"),
        "is_active": u.get("is_active", True),
        "created_at": u.get("created_at")
    }

@router.get("")
def get_students(
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only teachers and admins can view the student list
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted"
        )
    students_dicts = list(db.users.find({"role": "student"}))
    return [_format_user(s) for s in students_dicts]

@router.get("/{prn_no}")
def get_student(
    prn_no: str,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Students can only view their own profile
    if current_user.role == "student" and current_user.prn_no != prn_no:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own profile"
        )

    student_dict = None
    if prn_no.isdigit():
        student_dict = db.users.find_one({"_id": int(prn_no), "role": "student"})
    if not student_dict:
        student_dict = db.users.find_one({"prn_no": prn_no, "role": "student"})

    if not student_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    return _format_user(student_dict)

@router.get("/{prn_no}/badges")
def get_student_badges(
    prn_no: str,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "student" and current_user.prn_no != prn_no:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    student_dict = None
    if prn_no.isdigit():
        student_dict = db.users.find_one({"_id": int(prn_no), "role": "student"})
    if not student_dict:
        student_dict = db.users.find_one({"prn_no": prn_no, "role": "student"})

    if not student_dict:
        raise HTTPException(status_code=404, detail="Student not found")

    badges = list(db.badges.find({"student_id": student_dict["_id"]}))
    return [
        {
            "id": b["_id"],
            "badge_id": b.get("badge_id", ""),
            "name": b.get("name", ""),
            "description": b.get("description", ""),
            "unlocked_at": b.get("unlocked_at") or b.get("earned_at")
        }
        for b in badges
    ]

@router.get("/{prn_no}/chat")
def get_student_chat_history(
    prn_no: str,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "student" and current_user.prn_no != prn_no:
        raise HTTPException(status_code=403, detail="Access denied")

    student_dict = None
    if prn_no.isdigit():
        student_dict = db.users.find_one({"_id": int(prn_no), "role": "student"})
    if not student_dict:
        student_dict = db.users.find_one({"prn_no": prn_no, "role": "student"})

    if not student_dict:
        raise HTTPException(status_code=404, detail="Student not found")

    # Return last 20 chat history messages for this student
    messages = list(
        db.chat_history.find({"student_id": student_dict["_id"]})
        .sort("created_at", 1)
        .limit(20)
    )
    return [
        {
            "id": m["_id"],
            "role": m.get("role", "user"),
            "message": m.get("message", ""),
            "created_at": m.get("created_at")
        }
        for m in messages
    ]
