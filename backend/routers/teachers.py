from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from datetime import datetime

from backend.database import get_db
from backend.models.user import User
from backend.routers.auth import require_teacher

router = APIRouter(prefix="/teacher", tags=["teacher"])

SUBJECTS_KEYS = {
    "compiler_design": "Compiler Design",
    "computer_networks": "Computer Networks",
    "machine_learning": "Machine Learning",
    "internet_of_things": "Internet of Things",
    "development_engineering": "Development Engineering"
}

DESC_TEMPLATES = {
    "Watch tutorial": {
        "compiler_design": "Watch Compiler LL(1) & LR(1) Parser tutorial.",
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
    subject_performance = {}
    for key in SUBJECTS_KEYS:
        sub_results = [
            r for r in results
            if quizzes_map.get(r.get("quiz_id"), {}).get("subject", "").lower() == key.lower()
            or quizzes_map.get(r.get("quiz_id"), {}).get("title", "").lower().replace(" ", "_") == key.lower()
        ]
        subject_performance[key] = sum(r.get("accuracy", 0) for r in sub_results) / len(sub_results) if sub_results else 75.0
    return subject_performance

@router.get("/dashboard-stats")
def get_teacher_dashboard_stats(
    db=Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    students = list(db.users.find({"role": "student"}))
    total_students = len(students)
    quizzes_created = db.quizzes.count_documents({})

    if total_students == 0:
        return {
            "total_students": 0,
            "class_average": 0,
            "at_risk_count": 0,
            "quizzes_created": quizzes_created,
            "class_averages": [],
            "at_risk_students": [],
            "top_performing": [],
            "struggling": []
        }

    at_risk_count = db.users.count_documents({"role": "student", "risk_level": "High"})

    results = list(db.results.find({}))
    quiz_ids = list({r["quiz_id"] for r in results})
    quizzes_map = {q["_id"]: q for q in db.quizzes.find({"_id": {"$in": quiz_ids}})}

    class_average = (
        round(sum(r.get("accuracy", 0) for r in results) / len(results))
        if results
        else round(sum(s.get("predicted_score", 70) for s in students) / total_students)
    )

    # Class Averages per Topic
    class_averages = []
    for key, display in SUBJECTS_KEYS.items():
        sub_results = [
            r for r in results
            if quizzes_map.get(r.get("quiz_id"), {}).get("subject", "").lower() == key.lower()
            or quizzes_map.get(r.get("quiz_id"), {}).get("title", "").lower().replace(" ", "_") == key.lower()
        ]
        avg = round(sum(r.get("accuracy", 0) for r in sub_results) / len(sub_results)) if sub_results else 75
        class_averages.append({"topic": display, "avg_score": avg})

    # At-Risk Students list
    at_risk_students = []
    for s in students:
        if s.get("risk_level") in ["High", "Medium"]:
            last_res = db.results.find_one(
                {"student_id": s["_id"]},
                sort=[("timestamp", -1)]
            )
            last_score = round(last_res["accuracy"]) if last_res else s.get("predicted_score", 70)
            at_risk_students.append({
                "id": s["_id"],
                "name": s.get("full_name", ""),
                "last_score": last_score,
                "risk_level": s.get("risk_level", "Low")
            })

    # Top/Struggling students
    student_scores = []
    for s in students:
        s_results = [r for r in results if r.get("student_id") == s["_id"]]
        avg_score = sum(r.get("accuracy", 0) for r in s_results) / len(s_results) if s_results else float(s.get("predicted_score", 70))
        student_scores.append({
            "id": s["_id"],
            "name": s.get("full_name", ""),
            "score": round(avg_score, 1),
            "risk_level": s.get("risk_level", "Low")
        })

    sorted_students = sorted(student_scores, key=lambda x: x["score"], reverse=True)
    top_performing = sorted_students[:5]
    struggling = sorted(student_scores, key=lambda x: x["score"])[:5]

    return {
        "total_students": total_students,
        "class_average": class_average,
        "at_risk_count": at_risk_count,
        "quizzes_created": quizzes_created,
        "class_averages": class_averages,
        "at_risk_students": at_risk_students,
        "top_performing": top_performing,
        "struggling": struggling
    }

@router.get("/students")
def get_teacher_students_directory(
    db=Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    students = list(db.users.find({"role": "student"}))
    results = list(db.results.find({}))
    sessions = list(db.study_sessions.find({}))

    roster = []
    for s in students:
        sid = s["_id"]
        s_results = [r for r in results if r.get("student_id") == sid]
        s_sessions = [ss for ss in sessions if ss.get("student_id") == sid]

        avg_score = sum(r.get("accuracy", 0) for r in s_results) / len(s_results) if s_results else float(s.get("predicted_score", 70))
        quizzes_taken = len(s_results)

        timestamps = [r["timestamp"] for r in s_results if r.get("timestamp")] + \
                     [ss["timestamp"] for ss in s_sessions if ss.get("timestamp")]
        last_active = max(timestamps).strftime("%Y-%m-%d %H:%M") if timestamps else "N/A"

        roster.append({
            "id": sid,
            "name": s.get("full_name", ""),
            "email": s.get("email", ""),
            "avg_score": round(avg_score, 1),
            "quizzes_taken": quizzes_taken,
            "risk_level": s.get("risk_level", "Low"),
            "last_active": last_active
        })
    return roster

@router.get("/students/{id}")
def get_teacher_student_analytics(
    id: str,
    db=Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    student_doc = None
    if id.isdigit():
        student_doc = db.users.find_one({"_id": int(id), "role": "student"})
    if not student_doc:
        student_doc = db.users.find_one({"prn_no": id, "role": "student"})
    if not student_doc:
        raise HTTPException(status_code=404, detail="Student not found")

    student = student_doc
    sid = student["_id"]

    results = list(db.results.find({"student_id": sid}))
    sessions = list(db.study_sessions.find({"student_id": sid}))
    mastery = list(db.concept_mastery.find({"student_id": sid}))

    quiz_ids = list({r["quiz_id"] for r in results})
    quizzes_map = {q["_id"]: q for q in db.quizzes.find({"_id": {"$in": quiz_ids}})}

    overall_score = sum(r.get("accuracy", 0) for r in results) / len(results) if results else 75.0

    # Score Trend
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

    # Weak Topics
    subject_performance = _build_subject_performance(results, quizzes_map)
    sorted_perf = sorted(subject_performance.items(), key=lambda x: x[1])
    weak_topics = [
        {"subject": SUBJECTS_KEYS.get(sub, sub.replace("_", " ").title()), "score": round(score, 1)}
        for sub, score in sorted_perf[:3]
    ]

    # Recommendations
    weak_subs_only = [sub for sub, score in sorted_perf if score < 75]
    if not weak_subs_only:
        weak_subs_only = [sub for sub, score in sorted_perf]
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

    return {
        "id": sid,
        "name": student.get("full_name", ""),
        "email": student.get("email", ""),
        "prn_no": student.get("prn_no"),
        "class_name": student.get("class_name"),
        "predicted_score": student.get("predicted_score", 70),
        "risk_level": student.get("risk_level", "Low"),
        "preferred_style": student.get("preferred_style", "Visual"),
        "overall_score": round(overall_score, 1),
        "score_trend": score_trend,
        "weak_topics": weak_topics,
        "recommendations": recommendations_list,
        "concept_masteries": [
            {"id": m["_id"], "category": m.get("category"), "topic": m.get("topic"), "is_mastered": m.get("is_mastered")}
            for m in mastery
        ]
    }

@router.get("/class-analytics")
def get_teacher_class_analytics(
    db=Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    results = list(db.results.find({}))
    quiz_ids = list({r["quiz_id"] for r in results})
    quizzes_map = {q["_id"]: q for q in db.quizzes.find({"_id": {"$in": quiz_ids}})}

    analytics = []
    for key, display in SUBJECTS_KEYS.items():
        sub_results = [
            r for r in results
            if quizzes_map.get(r.get("quiz_id"), {}).get("subject", "").lower() == key.lower()
            or quizzes_map.get(r.get("quiz_id"), {}).get("title", "").lower().replace(" ", "_") == key.lower()
        ]
        avg = round(sum(r.get("accuracy", 0) for r in sub_results) / len(sub_results), 1) if sub_results else 75.0
        analytics.append({"topic": display, "avg_score": avg})
    return analytics
