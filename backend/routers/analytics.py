from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Optional
from pydantic import BaseModel
from datetime import datetime

from backend.database import get_db
from backend.models.user import User
from backend.routers.auth import get_current_user
from backend.ml.analyzer import (
    detect_weak_subjects,
    generate_recommendations,
    generate_exam_strategy,
    detect_burnout,
    optimize_study_time
)
from backend.ml.focus_score import calculate_focus_score
from backend.ml.study_optimizer import optimize_study_time_ml

router = APIRouter(prefix="/analytics", tags=["analytics"])

SUBJECTS_KEYS = {
    "compiler_design": "Compiler Design",
    "computer_networks": "Computer Networks",
    "machine_learning": "Machine Learning",
    "internet_of_things": "Internet of Things",
    "development_engineering": "Development Engineering"
}

DESC_TEMPLATES = {
    "Watch tutorial": {
        "compiler_design": "Watch Compiler LL(1) & LR(1) Parser tutorial on YouTube.",
        "computer_networks": "Watch Network Layer Routing & Addressing video guides.",
        "machine_learning": "Watch Gradient Descent & Neural Networks backpropagation tutorial.",
        "internet_of_things": "Watch MQTT Pub/Sub Lightweight Communication guides.",
        "development_engineering": "Watch CI/CD Pipeline & Agile SDLC workflow lectures."
    },
    "Practice MCQs": {
        "compiler_design": "Practice 15 Lexical Analysis and syntax tree MCQ problems.",
        "computer_networks": "Practice TCP/IP handshake and subnetting test questions.",
        "machine_learning": "Practice unsupervised K-means clustering calculations.",
        "internet_of_things": "Practice ESP32 & Arduino hardware sensor MCQs.",
        "development_engineering": "Practice git commands and Unit Testing mock exam questions."
    },
    "Revise notes": {
        "compiler_design": "Revise context-free grammar parsing table rules.",
        "computer_networks": "Revise OSI layer models and frame encapsulation notes.",
        "machine_learning": "Revise sigmoid, ReLU activation functions formulas.",
        "internet_of_things": "Revise IoT gateways and sensor interfacing principles.",
        "development_engineering": "Revise Scrum, Kanban and software testing frameworks."
    }
}

def _build_subject_performance(results: list, quizzes_map: dict) -> Dict[str, float]:
    """Build subject -> avg accuracy mapping from results list."""
    subject_performance = {}
    for key in SUBJECTS_KEYS:
        sub_results = [
            r for r in results
            if quizzes_map.get(r.get("quiz_id"), {}).get("subject", "").lower() == key.lower()
            or quizzes_map.get(r.get("quiz_id"), {}).get("title", "").lower().replace(" ", "_") == key.lower()
        ]
        if sub_results:
            subject_performance[key] = sum(r.get("accuracy", 0) for r in sub_results) / len(sub_results)
        else:
            subject_performance[key] = 75.0
    return subject_performance

def _build_recommendations(sorted_performance: list) -> list:
    weak_subs_only = [sub for sub, score in sorted_performance if score < 75]
    if not weak_subs_only:
        weak_subs_only = [sub for sub, score in sorted_performance]
    action_types = ["Watch tutorial", "Practice MCQs", "Revise notes"]
    recommendations_list = []
    for idx, action in enumerate(action_types):
        sub_to_use = weak_subs_only[idx % len(weak_subs_only)]
        desc = DESC_TEMPLATES[action].get(sub_to_use, f"Study {sub_to_use.replace('_', ' ')} topics.")
        recommendations_list.append({
            "action": action,
            "description": desc,
            "subject": SUBJECTS_KEYS.get(sub_to_use, sub_to_use.replace("_", " ").title())
        })
    return recommendations_list

@router.get("/student/{id}")
def get_student_analytics(
    id: str,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Retrieve student by ID (integer) or PRN
    student_doc = None
    if id.isdigit():
        student_doc = db.users.find_one({"_id": int(id), "role": "student"})
    if not student_doc:
        student_doc = db.users.find_one({"prn_no": id, "role": "student"})
    if not student_doc:
        raise HTTPException(status_code=404, detail="Student not found")

    student = User(**student_doc)

    # Security: student can only access their own analytics
    if current_user.role == "student" and current_user.id != student.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    results = list(db.results.find({"student_id": student.id}))
    sessions = list(db.study_sessions.find({"student_id": student.id}))

    # Build quiz lookup map
    quiz_ids = list({r["quiz_id"] for r in results})
    quizzes_map = {q["_id"]: q for q in db.quizzes.find({"_id": {"$in": quiz_ids}})}

    # 1. Overall Score
    overall_score = sum(r.get("accuracy", 0) for r in results) / len(results) if results else 75.0
    quizzes_taken = len(results)

    # 2. Focus Score
    total_time = sum(r.get("time_taken_seconds", 0) for r in results)
    total_qs = sum(r.get("total_questions", 0) for r in results)
    avg_time = (total_time / total_qs) if total_qs > 0 else 60.0

    total_idle = sum(s.get("idle_minutes", 0) for s in sessions)
    total_dur = sum(s.get("duration_minutes", 0) for s in sessions)
    idle_ratio = (total_idle / total_dur) if total_dur > 0 else 0.05

    unique_days = set(
        s["timestamp"].date() for s in sessions if s.get("timestamp")
    )
    streak_days = len(unique_days)

    focus_score = calculate_focus_score({
        "avg_time_per_question": avg_time,
        "idle_ratio": idle_ratio,
        "completion_rate": 1.0,
        "study_streak_days": streak_days
    })

    # 3. Predicted Exam Score
    predicted_exam_score = student.predicted_score or 70.0

    # 4. Score trend over last 10 quizzes
    sorted_results = sorted(results, key=lambda r: r.get("timestamp") or datetime.min)
    score_trend = []
    for idx, r in enumerate(sorted_results[-10:]):
        quiz_title = quizzes_map.get(r["quiz_id"], {}).get("title", f"Quiz {idx+1}")
        ts = r.get("timestamp")
        score_trend.append({
            "quiz_title": quiz_title,
            "score": r.get("accuracy", 0),
            "date": ts.strftime("%b %d") if ts else f"Quiz {idx+1}"
        })

    # 5. Weak Topics
    subject_performance = _build_subject_performance(results, quizzes_map)
    sorted_performance = sorted(subject_performance.items(), key=lambda x: x[1])
    weak_topics = [
        {"subject": SUBJECTS_KEYS.get(sub, sub.replace("_", " ").title()), "score": round(score, 1)}
        for sub, score in sorted_performance[:3]
    ]

    # 6. Personalized Recommendations
    recommendations_list = _build_recommendations(sorted_performance)

    # 7. Study Time Optimizer
    pairs = [(r["timestamp"], r.get("accuracy", 0)) for r in results if r.get("timestamp")]
    opt_res = optimize_study_time_ml(pairs)
    best_time_clean = opt_res["best_time"]

    return {
        "overall_score": round(overall_score, 1),
        "quizzes_taken": quizzes_taken,
        "focus_score": round(focus_score),
        "predicted_exam_score": round(predicted_exam_score, 1),
        "score_trend": score_trend,
        "weak_topics": weak_topics,
        "recommendations": recommendations_list,
        "best_study_time": best_time_clean
    }

@router.get("/student/{prn_no}/summary")
def get_student_summary(
    prn_no: str,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "student" and current_user.prn_no != prn_no:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    student_doc = db.users.find_one({"prn_no": prn_no, "role": "student"})
    if not student_doc:
        raise HTTPException(status_code=404, detail="Student not found")
    student = User(**student_doc)

    results = list(db.results.find({"student_id": student.id}))
    sessions = list(db.study_sessions.find({"student_id": student.id}))
    mastery = list(db.concept_mastery.find({"student_id": student.id}))
    badges = list(db.badges.find({"student_id": student.id}))

    quiz_ids = list({r["quiz_id"] for r in results})
    quizzes_map = {q["_id"]: q for q in db.quizzes.find({"_id": {"$in": quiz_ids}})}

    subject_performance = _build_subject_performance(results, quizzes_map)

    weak_subjects = detect_weak_subjects(subject_performance)
    recommendations = generate_recommendations(weak_subjects)
    strategy = generate_exam_strategy(subject_performance)
    burnout_warning = detect_burnout(results)
    preferred_style = student.preferred_style or "Visual"

    pairs = [(r["timestamp"], r.get("accuracy", 0)) for r in results if r.get("timestamp")]
    opt_res = optimize_study_time_ml(pairs)
    best_time_block = opt_res["best_time"]

    latest_focus_score = 75
    if sessions:
        latest = sorted(sessions, key=lambda s: s.get("timestamp") or datetime.min)[-1]
        latest_focus_score = latest.get("focus_score", 75)

    focus_insight = "Steady study focus. Maintain your current patterns."
    
    attendance = getattr(student, "attendance_percentage", None)
    if attendance is not None and attendance < 75:
        focus_insight = f"Warning: Low attendance ({attendance}%). This heavily impacts learning consistency. " + focus_insight
        
    if latest_focus_score >= 85:
        focus_insight = "Exceptional concentration. Low idle times registered."
    elif latest_focus_score < 60:
        focus_insight = "Learning fatigue warning. High idle time detected; take a short break."

    return {
        "prn_no": student.prn_no,
        "roll_number": getattr(student, "roll_number", None),
        "department": getattr(student, "department", None),
        "year_semester": getattr(student, "year_semester", None),
        "previous_cgpa": getattr(student, "previous_cgpa", None),
        "attendance_percentage": getattr(student, "attendance_percentage", None),
        "skills": getattr(student, "skills", []),
        "learning_interests": getattr(student, "learning_interests", []),
        "predicted_score": student.predicted_score,
        "risk_level": student.risk_level,
        "weak_subjects": weak_subjects,
        "preferred_style": f"{preferred_style} | Best Time: {best_time_block}",
        "recommendations": recommendations,
        "strategy": strategy,
        "burnout_warning": burnout_warning,
        "focus_insight": focus_insight,
        "latest_focus_score": latest_focus_score,
        "badges": [{"id": b["_id"], "name": b.get("name"), "badge_id": b.get("badge_id"), "description": b.get("description")} for b in badges],
        "study_sessions": [{"id": s["_id"], "duration_minutes": s.get("duration_minutes"), "focus_score": s.get("focus_score"), "timestamp": s.get("timestamp")} for s in sessions],
        "concept_mastery": [{"id": m["_id"], "category": m.get("category"), "topic": m.get("topic"), "is_mastered": m.get("is_mastered")} for m in mastery]
    }
