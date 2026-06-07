from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr
import csv
import io

from backend.database import get_db, get_next_sequence_value
from backend.models.user import User
from backend.routers.auth import require_admin, get_password_hash

router = APIRouter(prefix="/admin", tags=["admin"])

class UserUpdatePayload(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserCreatePayload(BaseModel):
    name: str
    email: EmailStr
    temp_password: str
    role: str

@router.get("/stats")
def get_admin_stats(
    db=Depends(get_db),
    current_user: User = Depends(require_admin)
):
    users = list(db.users.find({}))
    total_users = len(users)
    total_students = sum(1 for u in users if u.get("role") == "student")
    total_teachers = sum(1 for u in users if u.get("role") == "teacher")
    total_admins = sum(1 for u in users if u.get("role") == "admin")
    total_quizzes = db.quizzes.count_documents({})

    results = list(db.results.find({}))
    avg_platform_score = round(sum(r.get("accuracy", 0) for r in results) / len(results), 1) if results else 75.0

    role_distribution = [
        {"name": "Students", "value": total_students},
        {"name": "Teachers", "value": total_teachers},
        {"name": "Admins", "value": total_admins}
    ]

    # New user registrations over last 30 days
    now = datetime.now()
    registrations_map = {}
    for i in range(30, -1, -1):
        day_str = (now - timedelta(days=i)).strftime("%b %d")
        registrations_map[day_str] = 0

    for u in users:
        created = u.get("created_at")
        if created and created >= (now - timedelta(days=30)):
            day_str = created.strftime("%b %d")
            if day_str in registrations_map:
                registrations_map[day_str] += 1

    registrations_trend = [{"date": k, "users": v} for k, v in registrations_map.items()]

    # Recent activity feed
    recent_results = list(db.results.find({}).sort("timestamp", -1).limit(10))
    quiz_ids = [r["quiz_id"] for r in recent_results]
    student_ids = [r["student_id"] for r in recent_results]
    quizzes_map = {q["_id"]: q for q in db.quizzes.find({"_id": {"$in": quiz_ids}})}
    students_map = {u["_id"]: u for u in db.users.find({"_id": {"$in": student_ids}})}

    recent_activity = []
    for r in recent_results:
        quiz = quizzes_map.get(r["quiz_id"], {})
        student = students_map.get(r["student_id"], {})
        ts = r.get("timestamp")
        recent_activity.append({
            "id": r["_id"],
            "student_name": student.get("full_name", "Unknown"),
            "quiz_title": quiz.get("title", "Unknown"),
            "accuracy": round(r.get("accuracy", 0), 1),
            "timestamp": ts.strftime("%Y-%m-%d %H:%M") if ts else "N/A"
        })

    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_quizzes": total_quizzes,
        "avg_platform_score": avg_platform_score,
        "role_distribution": role_distribution,
        "registrations_trend": registrations_trend,
        "recent_activity": recent_activity
    }

@router.get("/users")
def list_admin_users(
    role: Optional[str] = None,
    status_filter: Optional[str] = None,
    db=Depends(get_db),
    current_user: User = Depends(require_admin)
):
    query = {}
    if role:
        query["role"] = role
    if status_filter:
        query["is_active"] = (status_filter.lower() == "active")

    users = list(db.users.find(query))
    user_list = []
    for u in users:
        created = u.get("created_at")
        user_list.append({
            "id": u["_id"],
            "name": u.get("full_name", ""),
            "email": u.get("email", ""),
            "role": u.get("role", ""),
            "joined_date": created.strftime("%Y-%m-%d") if created else "N/A",
            "status": "active" if u.get("is_active", True) else "inactive"
        })
    return user_list

@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_admin_user(
    payload: UserCreatePayload,
    db=Depends(get_db),
    current_user: User = Depends(require_admin)
):
    existing = db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pwd = get_password_hash(payload.temp_password)
    user_id = get_next_sequence_value("users")
    now = datetime.now()

    user_doc = {
        "_id": user_id,
        "email": payload.email,
        "hashed_password": hashed_pwd,
        "full_name": payload.name,
        "role": payload.role,
        "is_active": True,
        "predicted_score": 70,
        "risk_level": "Low",
        "preferred_style": "Practice-based learning",
        "created_at": now
    }
    db.users.insert_one(user_doc)

    return {
        "id": user_id,
        "name": payload.name,
        "email": payload.email,
        "role": payload.role,
        "joined_date": now.strftime("%Y-%m-%d"),
        "status": "active"
    }

@router.patch("/users/{id}")
def update_admin_user(
    id: int,
    payload: UserUpdatePayload,
    db=Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.users.find_one({"_id": id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    updates = {}
    if payload.role is not None:
        if payload.role not in ["student", "teacher", "admin"]:
            raise HTTPException(status_code=400, detail="Invalid role specified")
        updates["role"] = payload.role
    if payload.is_active is not None:
        updates["is_active"] = payload.is_active

    if updates:
        db.users.update_one({"_id": id}, {"$set": updates})

    updated = db.users.find_one({"_id": id})
    created = updated.get("created_at")
    return {
        "id": updated["_id"],
        "name": updated.get("full_name", ""),
        "email": updated.get("email", ""),
        "role": updated.get("role", ""),
        "joined_date": created.strftime("%Y-%m-%d") if created else "N/A",
        "status": "active" if updated.get("is_active", True) else "inactive"
    }

@router.delete("/users/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_user(
    id: int,
    db=Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.users.find_one({"_id": id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.users.delete_one({"_id": id})

@router.get("/analytics")
def get_admin_analytics(
    db=Depends(get_db),
    current_user: User = Depends(require_admin)
):
    total_results = db.results.count_documents({})
    total_sessions = db.study_sessions.count_documents({})

    sessions = list(db.study_sessions.find({}))
    avg_focus = round(sum(s.get("focus_score", 0) for s in sessions) / len(sessions)) if sessions else 75

    results = list(db.results.find({}))
    quiz_ids = list({r["quiz_id"] for r in results})
    quizzes_map = {q["_id"]: q for q in db.quizzes.find({"_id": {"$in": quiz_ids}})}

    SUBJECTS_KEYS = {
        "compiler_design": "Compiler Design",
        "computer_networks": "Computer Networks",
        "machine_learning": "Machine Learning",
        "internet_of_things": "Internet of Things",
        "development_engineering": "Development Engineering"
    }

    subject_performances = []
    for key, display in SUBJECTS_KEYS.items():
        sub_results = [
            r for r in results
            if quizzes_map.get(r.get("quiz_id"), {}).get("subject", "").lower() == key.lower()
            or quizzes_map.get(r.get("quiz_id"), {}).get("title", "").lower().replace(" ", "_") == key.lower()
        ]
        avg = round(sum(r.get("accuracy", 0) for r in sub_results) / len(sub_results), 1) if sub_results else 75.0
        subject_performances.append({"subject": display, "avg_score": avg})

    students = list(db.users.find({"role": "student"}))
    risk_summary = {"Low": 0, "Medium": 0, "High": 0}
    for s in students:
        risk = s.get("risk_level") or "Low"
        if risk in risk_summary:
            risk_summary[risk] += 1

    return {
        "total_results": total_results,
        "total_sessions": total_sessions,
        "avg_focus": avg_focus,
        "subject_performances": subject_performances,
        "risk_summary": risk_summary
    }

@router.get("/export")
def export_results_csv(
    db=Depends(get_db),
    current_user: User = Depends(require_admin)
):
    results = list(db.results.find({}))
    quiz_ids = list({r["quiz_id"] for r in results})
    student_ids = list({r["student_id"] for r in results})
    quizzes_map = {q["_id"]: q for q in db.quizzes.find({"_id": {"$in": quiz_ids}})}
    students_map = {u["_id"]: u for u in db.users.find({"_id": {"$in": student_ids}})}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Student Name", "PRN Number", "Email", "Quiz Title", "Subject",
        "Score", "Total Questions", "Accuracy", "Time Taken (s)", "Idle Time (s)",
        "Focus Score", "Timestamp"
    ])

    for r in results:
        quiz = quizzes_map.get(r["quiz_id"], {})
        student = students_map.get(r["student_id"], {})
        ts = r.get("timestamp")
        writer.writerow([
            student.get("full_name", "Unknown"),
            student.get("prn_no") or "N/A",
            student.get("email", ""),
            quiz.get("title", ""),
            quiz.get("subject", ""),
            r.get("score", 0),
            r.get("total_questions", 0),
            r.get("accuracy", 0),
            r.get("time_taken_seconds", 0),
            r.get("idle_time_seconds", 0),
            r.get("focus_score", 0),
            ts.strftime("%Y-%m-%d %H:%M:%S") if ts else "N/A"
        ])

    output.seek(0)
    response = StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = "attachment; filename=platform_student_results.csv"
    return response
