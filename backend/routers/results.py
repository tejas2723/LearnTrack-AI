from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from typing import List, Optional

from backend.database import get_db
from backend.models.user import User
from backend.routers.auth import get_current_user
from backend.ml.predictor import calculate_student_ml_features, predict

router = APIRouter(prefix="/results", tags=["results"])

@router.get("/my-history")
def get_my_history(
    subject: Optional[str] = None,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can view their quiz history.")
        
    query = {"student_id": current_user.id}
    results = list(db.results.find(query).sort("timestamp", -1))
    
    # Pre-load all quizzes to map subjects
    quizzes = {q["_id"]: q for q in db.quizzes.find({})}
    
    history = []
    for r in results:
        quiz = quizzes.get(r["quiz_id"], {})
        quiz_subject = quiz.get("subject", "unknown")
        
        # Subject filter (case insensitive)
        if subject and subject.lower() != "all" and quiz_subject.lower() != subject.lower():
            continue
            
        accuracy = r.get("accuracy", 0.0)
        if accuracy > 70.0:
            perf_level = "High"
        elif accuracy >= 40.0:
            perf_level = "Medium"
        else:
            perf_level = "Low"
            
        history.append({
            "id": r["_id"],
            "quiz_id": r["quiz_id"],
            "quiz_title": quiz.get("title", "Unknown Quiz"),
            "subject": quiz_subject,
            "timestamp": r.get("timestamp"),
            "score": r.get("score", 0),
            "total_questions": r.get("total_questions", 0),
            "accuracy": accuracy,
            "performance_level": perf_level
        })
    return history

@router.get("/{result_id}")
def get_result(
    result_id: int,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = db.results.find_one({"_id": result_id})
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    if current_user.role == "student" and result.get("student_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # ML Features
    features = calculate_student_ml_features(db, result["student_id"])
    prediction = predict(features)

    predicted_grade = prediction["predicted_score"]
    risk_level = prediction["risk_level"]
    weak_topics = features["weak_topics_list"]
    recommendations = [
        f"Focus on {area['topic']} to raise score from {area['current_accuracy']}% to {area['target_accuracy']}%"
        for area in features["improvement_areas"]
    ]
    if not recommendations:
        recommendations = ["Continue studying your syllabus concepts regularly."]

    # Quiz and question lookup
    quiz = db.quizzes.find_one({"_id": result["quiz_id"]}) or {}

    # Load attempts
    attempts = list(db.quiz_attempts.find({"result_id": result_id}))
    question_ids = [att["question_id"] for att in attempts]
    questions_map = {q["_id"]: q for q in db.questions.find({"_id": {"$in": question_ids}})}

    # Platform avg time per question
    attempts_review = []
    for att in attempts:
        q = questions_map.get(att["question_id"], {})
        # Calculate average time taken for this question across all attempts
        pipeline = [
            {"$match": {"question_id": att["question_id"]}},
            {"$group": {"_id": None, "avg": {"$avg": "$time_taken_seconds"}}}
        ]
        agg_result = list(db.quiz_attempts.aggregate(pipeline))
        avg_time = agg_result[0]["avg"] if agg_result else 45.0

        attempts_review.append({
            "question_id": q.get("_id"),
            "question_text": q.get("question_text", ""),
            "option_a": q.get("option_a", ""),
            "option_b": q.get("option_b", ""),
            "option_c": q.get("option_c", ""),
            "option_d": q.get("option_d", ""),
            "correct_option": q.get("correct_option", "a"),
            "selected_option": att.get("selected_option"),
            "is_correct": att.get("is_correct", False),
            "time_taken_seconds": att.get("time_taken_seconds", 0),
            "avg_time_taken_seconds": round(float(avg_time), 1),
            "confidence_level": att.get("confidence_level"),
            "explanation": q.get("explanation")
        })

    ts = result.get("timestamp")
    return {
        "id": result["_id"],
        "score": result.get("score", 0),
        "total_questions": result.get("total_questions", 0),
        "accuracy": result.get("accuracy", 0.0),
        "time_taken_seconds": result.get("time_taken_seconds", 0),
        "idle_time_seconds": result.get("idle_time_seconds", 0),
        "focus_score": result.get("focus_score", 0),
        "timestamp": ts,
        "quiz_title": quiz.get("title", "Unknown"),
        "attempts": attempts_review,
        "personalized_suggestions": result.get("personalized_suggestions"),
        "ai_insights": {
            "weak_topics": weak_topics[:3],
            "predicted_score": predicted_grade,
            "risk_level": risk_level,
            "recommendations": recommendations[:3]
        }
    }
