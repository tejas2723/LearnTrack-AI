from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from backend.database import get_db, get_next_sequence_value
from backend.models.user import User
from backend.routers.auth import get_current_user, require_student, require_teacher
from backend.ml.predictor import calculate_student_ml_features, predict

def update_student_predictions(db, current_user: User):
    features = calculate_student_ml_features(db, current_user.id)
    prediction = predict(features)

    db.users.update_one(
        {"_id": current_user.id},
        {"$set": {
            "predicted_score": prediction["predicted_score"],
            "risk_level": prediction["risk_level"]
        }}
    )
    return prediction

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

def _serialize_quiz(quiz_doc: dict) -> dict:
    """Convert MongoDB quiz document to a clean response dict."""
    questions = quiz_doc.get("questions", [])
    total_marks = sum(q.get("marks", 1) for q in questions)
    return {
        "id": quiz_doc["_id"],
        "title": quiz_doc.get("title", ""),
        "subject": quiz_doc.get("subject", ""),
        "is_active": quiz_doc.get("is_active", False),
        "created_at": quiz_doc.get("created_at"),
        "total_marks": total_marks,
        "questions": [
            {
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
            for q in questions
        ]
    }

@router.get("")
def get_quizzes(db=Depends(get_db), current_user: User = Depends(get_current_user)):
    quizzes = list(db.quizzes.find({}))
    for q in quizzes:
        q["questions"] = list(db.questions.find({"quiz_id": q["_id"]}))
    return [_serialize_quiz(q) for q in quizzes]

@router.get("/active")
def get_active_quiz(db=Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.quizzes.find_one({"is_active": True})
    if not quiz:
        quiz = db.quizzes.find_one({})
    if not quiz:
        raise HTTPException(status_code=404, detail="No active quiz found")
    quiz["questions"] = list(db.questions.find({"quiz_id": quiz["_id"]}))
    return _serialize_quiz(quiz)

@router.get("/review/{result_id}")
def review_quiz(
    result_id: int,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = db.results.find_one({"_id": result_id})
    if not result:
        raise HTTPException(status_code=404, detail="Result log not found")

    if current_user.role == "student" and result["student_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    quiz = db.quizzes.find_one({"_id": result["quiz_id"]})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = list(db.questions.find({"quiz_id": quiz["_id"]}))
    attempts = list(db.quiz_attempts.find({"result_id": result_id}))
    attempts_map = {att["question_id"]: att for att in attempts}

    questions_review = []
    for q in questions:
        attempt = attempts_map.get(q["_id"])
        questions_review.append({
            "id": q["_id"],
            "question_text": q.get("question_text", ""),
            "option_a": q.get("option_a", ""),
            "option_b": q.get("option_b", ""),
            "option_c": q.get("option_c", ""),
            "option_d": q.get("option_d", ""),
            "correct_option": q.get("correct_option", "a"),
            "explanation": q.get("explanation"),
            "difficulty": q.get("difficulty", "medium"),
            "marks": q.get("marks", 1),
            "selected_option": attempt["selected_option"] if attempt else None,
            "is_correct": attempt["is_correct"] if attempt else False,
            "time_taken_seconds": attempt["time_taken_seconds"] if attempt else 0,
            "confidence_level": attempt["confidence_level"] if attempt else None
        })

    return {
        "quiz_id": quiz["_id"],
        "quiz_title": quiz.get("title"),
        "subject": quiz.get("subject"),
        "result": {
            "score": result.get("score"),
            "total_questions": result.get("total_questions"),
            "accuracy": result.get("accuracy"),
            "time_taken_seconds": result.get("time_taken_seconds"),
            "focus_score": result.get("focus_score")
        },
        "questions": questions_review
    }

class QuestionIn(BaseModel):
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

class QuizCreate(BaseModel):
    title: str
    subject: str
    questions: List[QuestionIn]

@router.post("", status_code=status.HTTP_201_CREATED)
def create_quiz(
    quiz_in: QuizCreate,
    db=Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    quiz_id = get_next_sequence_value("quizzes")
    quiz_doc = {
        "_id": quiz_id,
        "title": quiz_in.title,
        "subject": quiz_in.subject,
        "is_active": True,
        "created_at": datetime.now()
    }
    db.quizzes.insert_one(quiz_doc)

    questions = []
    for q in quiz_in.questions:
        q_id = get_next_sequence_value("questions")
        q_doc = {
            "_id": q_id,
            "quiz_id": quiz_id,
            "question_text": q.question_text,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
            "correct_option": q.correct_option.lower(),
            "explanation": q.explanation,
            "difficulty": q.difficulty,
            "topic": q.topic,
            "subject": q.subject or quiz_in.subject,
            "marks": q.marks,
            "time_limit_seconds": q.time_limit_seconds
        }
        db.questions.insert_one(q_doc)
        questions.append(q_doc)

    quiz_doc["questions"] = questions
    return _serialize_quiz(quiz_doc)

@router.get("/{quiz_id}")
def get_quiz(quiz_id: int, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.quizzes.find_one({"_id": quiz_id})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    quiz["questions"] = list(db.questions.find({"quiz_id": quiz_id}))
    return _serialize_quiz(quiz)

@router.patch("/{quiz_id}/activate")
def toggle_quiz_activate(
    quiz_id: int,
    db=Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    quiz = db.quizzes.find_one({"_id": quiz_id})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    new_status = not quiz.get("is_active", False)
    db.quizzes.update_one({"_id": quiz_id}, {"$set": {"is_active": new_status}})
    return {"id": quiz_id, "is_active": new_status}

class AttemptIn(BaseModel):
    question_id: int
    selected_option: Optional[str] = None
    time_taken_seconds: int = 60
    confidence_level: Optional[int] = None

class ActiveQuizSubmission(BaseModel):
    attempts: List[AttemptIn]
    time_taken_seconds: int = 0
    idle_time_seconds: int = 0

class QuizSubmission(BaseModel):
    attempts: List[AttemptIn]
    time_taken_seconds: int = 0
    idle_time_seconds: int = 0

@router.post("/submit")
def submit_active_quiz(
    submission: ActiveQuizSubmission,
    db=Depends(get_db),
    current_user: User = Depends(require_student)
):
    quiz = db.quizzes.find_one({"is_active": True})
    if not quiz:
        quiz = db.quizzes.find_one({})
    if not quiz:
        raise HTTPException(status_code=404, detail="No active quiz found")
    return process_quiz_submission(db, quiz, submission, current_user)

@router.post("/{quiz_id}/submit")
def submit_quiz(
    quiz_id: int,
    submission: QuizSubmission,
    db=Depends(get_db),
    current_user: User = Depends(require_student)
):
    quiz = db.quizzes.find_one({"_id": quiz_id})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return process_quiz_submission(db, quiz, submission, current_user)

def process_quiz_submission(db, quiz: dict, submission, current_user: User):
    questions = list(db.questions.find({"quiz_id": quiz["_id"]}))
    attempts_in = {att.question_id: att for att in submission.attempts}

    # Calculate score
    score = 0
    total_questions = len(questions)

    # Insert result first to get the ID
    result_id = get_next_sequence_value("results")
    time_taken = submission.time_taken_seconds
    idle_time = submission.idle_time_seconds

    result_doc = {
        "_id": result_id,
        "student_id": current_user.id,
        "quiz_id": quiz["_id"],
        "score": 0,
        "total_questions": total_questions,
        "accuracy": 0.0,
        "time_taken_seconds": time_taken,
        "idle_time_seconds": idle_time,
        "focus_score": 50,
        "timestamp": datetime.now()
    }
    db.results.insert_one(result_doc)

    incorrect_questions = []
    for question in questions:
        attempt = attempts_in.get(question["_id"])
        selected_option = attempt.selected_option if attempt else None

        is_correct = False
        if selected_option and selected_option.lower() == question.get("correct_option", "").lower():
            is_correct = True
            score += 1
        else:
            incorrect_questions.append(question)

        time_taken_q = attempt.time_taken_seconds if attempt else 60
        confidence = attempt.confidence_level if attempt else None

        attempt_id = get_next_sequence_value("quiz_attempts")
        db.quiz_attempts.insert_one({
            "_id": attempt_id,
            "result_id": result_id,
            "question_id": question["_id"],
            "selected_option": selected_option,
            "is_correct": is_correct,
            "time_taken_seconds": time_taken_q,
            "confidence_level": confidence
        })

    accuracy = (score / total_questions) * 100.0 if total_questions > 0 else 0.0

    # Focus score: blend of active time ratio and accuracy
    active_ratio = (time_taken - idle_time) / time_taken if time_taken > 0 else 1.0
    focus_score = int(max(10, min(100, (active_ratio * 75) + (accuracy / 100 * 25))))

    # Generate personalized suggestions
    personalized_suggestions = generate_personalized_suggestions(
        accuracy, quiz.get("subject", ""), incorrect_questions
    )

    # Update result with final scores
    db.results.update_one(
        {"_id": result_id},
        {"$set": {
            "score": score,
            "accuracy": accuracy,
            "focus_score": focus_score,
            "personalized_suggestions": personalized_suggestions
        }}
    )

    # Save Study Session
    duration_min = max(1, round(time_taken / 60))
    idle_min = round(idle_time / 60)
    session_id = get_next_sequence_value("study_sessions")
    db.study_sessions.insert_one({
        "_id": session_id,
        "student_id": current_user.id,
        "duration_minutes": duration_min,
        "focus_score": focus_score,
        "idle_minutes": idle_min,
        "questions_attempted": total_questions,
        "timestamp": datetime.now()
    })

    # Update concept mastery
    is_mastered = accuracy >= 80.0
    if is_mastered:
        subject = quiz.get("subject", "")
        db.concept_mastery.update_many(
            {
                "student_id": current_user.id,
                "$or": [
                    {"category": {"$regex": subject, "$options": "i"}},
                    {"topic": {"$regex": subject, "$options": "i"}}
                ]
            },
            {"$set": {"is_mastered": True}}
        )

    # Badges
    existing_badges = [b["badge_id"] for b in db.badges.find({"student_id": current_user.id})]

    if accuracy == 100.0 and "topic_master" not in existing_badges:
        badge_id = get_next_sequence_value("badges")
        db.badges.insert_one({
            "_id": badge_id,
            "student_id": current_user.id,
            "badge_id": "topic_master",
            "name": "Topic Master",
            "description": "Scored 100% on a quiz",
            "earned_at": datetime.now()
        })

    total_quizzes_completed = db.results.count_documents({"student_id": current_user.id})
    if total_quizzes_completed >= 3 and "consistency_champion" not in existing_badges:
        badge_id = get_next_sequence_value("badges")
        db.badges.insert_one({
            "_id": badge_id,
            "student_id": current_user.id,
            "badge_id": "consistency_champion",
            "name": "Consistency Champion",
            "description": "Completed 3 or more academic quizzes",
            "earned_at": datetime.now()
        })

    # Trigger ML prediction update
    update_student_predictions(db, current_user)

    return {"result_id": result_id}

def generate_personalized_suggestions(accuracy: float, subject: str, incorrect_questions: list) -> dict:
    # 1. Performance-based suggestions
    if accuracy < 40.0:
        perf_suggestion = "Your performance indicates significant improvement is needed. Focus on fundamental concepts of this subject. Study 1-2 hours daily, revise previous topics, and practice beginner-level questions before attempting advanced quizzes."
    elif accuracy <= 70.0:
        perf_suggestion = "You have basic understanding of the subject. Strengthen weak topics identified in this quiz and solve additional practice questions. Allocate more time to revision and concept clarification."
    else:
        perf_suggestion = "Excellent performance. Continue practicing advanced-level questions and maintain consistency. Focus on mastering difficult concepts and preparing for higher-level assessments."

    # 2. Subject-based suggestions
    sub_key = subject.lower().replace(" ", "_")
    subject_suggestions = []
    if "machine_learning" in sub_key or "machine learning" in sub_key:
        subject_suggestions = [
            "Study supervised learning algorithms",
            "Practice classification problems",
            "Review model evaluation metrics"
        ]
    elif "competitive_programming" in sub_key or "competitive programming" in sub_key:
        subject_suggestions = [
            "Practice arrays and strings",
            "Solve time complexity problems",
            "Improve problem-solving speed"
        ]
    elif "java" in sub_key:
        subject_suggestions = [
            "OOP Concepts",
            "Collections Framework",
            "Exception Handling"
        ]
    elif "dbms" in sub_key or "database" in sub_key:
        subject_suggestions = [
            "SQL Queries",
            "Normalization",
            "Transactions"
        ]
    elif "compiler_design" in sub_key or "compiler design" in sub_key:
        subject_suggestions = [
            "Study lexical analysis and parsing algorithms",
            "Review syntax-directed translation",
            "Practice context-free grammar normalization"
        ]
    elif "computer_networks" in sub_key or "computer networks" in sub_key:
        subject_suggestions = [
            "Review OSI and TCP/IP models",
            "Practice subnetting and routing algorithms",
            "Study transport layer protocols"
        ]
    elif "internet_of_things" in sub_key or "iot" in sub_key:
        subject_suggestions = [
            "Study MQTT and CoAP protocols",
            "Practice micro-controller interfacing",
            "Review IoT sensor data flow"
        ]
    elif "development_engineering" in sub_key or "development engineering" in sub_key:
        subject_suggestions = [
            "Review CI/CD pipelines",
            "Study software development life cycles",
            "Practice version control using Git"
        ]
    else:
        subject_suggestions = [
            "Revise notes and lecture slides for this subject",
            "Solve practice questions regularly",
            "Clear doubts with your instructor"
        ]

    # 3. Topic-based suggestions
    weak_topics = list(set(q.get("topic") for q in incorrect_questions if q.get("topic")))
    topic_suggestions = []
    for t in weak_topics:
        topic_suggestions.append(f"Revise key concepts of {t}")

    return {
        "performance_suggestion": perf_suggestion,
        "subject_suggestions": subject_suggestions,
        "weak_topics": weak_topics,
        "topic_suggestions": topic_suggestions
    }
