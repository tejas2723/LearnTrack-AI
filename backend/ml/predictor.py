import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

from backend.ml.train import MODEL_PATH, FEATURES
from backend.models.result import Result, StudySession
from backend.models.quiz import QuizAttempt, Question, Quiz

# Loaded models container
_models = None

def load_models():
    """
    Loads model.pkl containing Gradient Boosting models.
    Generates and trains the model first if not present.
    """
    global _models
    if not os.path.exists(MODEL_PATH):
        print("Model file not found. Generating default Gradient Boosting training models...")
        from backend.ml.train import train_and_save_model
        train_and_save_model()
        
    try:
        _models = joblib.load(MODEL_PATH)
        print("Gradient Boosting ML models loaded successfully.")
    except Exception as e:
        print(f"Error loading Gradient Boosting ML models: {e}")
        _models = None

# Load models on module import
load_models()

def calculate_student_ml_features(db, student_id: int) -> dict:
    """
    Queries database tables to compute the 9 ML features for the given student.
    """
    # 1. Fetch user to get academic baseline
    user_doc = db.users.find_one({"_id": student_id})
    previous_cgpa = float(user_doc.get("previous_cgpa") or 7.0) if user_doc else 7.0
    attendance_percentage = float(user_doc.get("attendance_percentage") or 75.0) if user_doc else 75.0

    # 2. Fetch all results (sorted by date desc)
    results_dicts = list(db.results.find({"student_id": student_id}).sort("timestamp", -1))
    results = [Result(**r) for r in results_dicts]
    results_count = len(results)
    
    # 2. Fetch all quiz attempts
    result_ids = [r.id for r in results]
    attempts_dicts = list(db.quiz_attempts.find({"result_id": {"$in": result_ids}}))
    attempts = [QuizAttempt(**att) for att in attempts_dicts]
    attempts_count = len(attempts)
    
    # Feature 1: avg_score_all_time
    avg_score_all_time = sum(r.accuracy for r in results) / results_count if results_count > 0 else 75.0
    
    # Feature 2: avg_score_last_5
    results_last_5 = results[:5]
    avg_score_last_5 = sum(r.accuracy for r in results_last_5) / len(results_last_5) if len(results_last_5) > 0 else 75.0
    
    # Fetch questions for these attempts to evaluate topic accuracy
    question_ids = list(set(att.question_id for att in attempts))
    questions_dicts = list(db.questions.find({"_id": {"$in": question_ids}}))
    questions_map = {q["_id"]: Question(**q) for q in questions_dicts}
    
    topic_scores = {} # topic -> {correct, total}
    difficulty_scores = {"easy": [], "medium": [], "hard": []}
    high_conf_attempts = 0
    incorrect_high_conf_attempts = 0
    
    for att in attempts:
        q = questions_map.get(att.question_id)
        if q:
            # Topic profiling
            topic = q.topic or "General"
            if topic not in topic_scores:
                topic_scores[topic] = {"correct": 0, "total": 0}
            topic_scores[topic]["total"] += 1
            if att.is_correct:
                topic_scores[topic]["correct"] += 1
            
            # Difficulty profiling
            diff = (q.difficulty or "medium").lower()
            if diff in difficulty_scores:
                difficulty_scores[diff].append(1.0 if att.is_correct else 0.0)
                
            # Confidence calibration
            if att.confidence_level is not None and att.confidence_level >= 4:
                high_conf_attempts += 1
                if not att.is_correct:
                    incorrect_high_conf_attempts += 1
                    
    # Feature 3 & 4: weak & strong topic counts
    weak_topic_count = 0
    strong_topic_count = 0
    weak_topics_list = []
    improvement_areas = []
    
    for topic, stats in topic_scores.items():
        topic_acc = (stats["correct"] / stats["total"]) * 100.0
        if topic_acc < 60.0:
            weak_topic_count += 1
            weak_topics_list.append(topic)
            improvement_areas.append({
                "topic": topic,
                "current_accuracy": round(topic_acc, 1),
                "target_accuracy": 80.0
            })
        elif topic_acc >= 80.0:
            strong_topic_count += 1
            
    # Feature 5: avg_time_per_question
    total_time = sum(att.time_taken_seconds for att in attempts)
    avg_time_per_question = total_time / attempts_count if attempts_count > 0 else 45.0
    avg_time_per_question = max(5.0, min(120.0, avg_time_per_question))
    
    # Feature 6: difficulty_distribution_score
    easy_acc = np.mean(difficulty_scores["easy"]) * 100.0 if difficulty_scores["easy"] else avg_score_all_time
    medium_acc = np.mean(difficulty_scores["medium"]) * 100.0 if difficulty_scores["medium"] else avg_score_all_time
    hard_acc = np.mean(difficulty_scores["hard"]) * 100.0 if difficulty_scores["hard"] else avg_score_all_time
    difficulty_distribution_score = (easy_acc * 0.2) + (medium_acc * 0.3) + (hard_acc * 0.5)
    
    # Feature 7: study_consistency_score (active days in last 30 / 30)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    # Fetch unique dates of results & sessions
    results_in_30 = db.results.find({
        "student_id": student_id,
        "timestamp": {"$gte": thirty_days_ago}
    })
    result_dates = [r["timestamp"].date() for r in results_in_30 if "timestamp" in r]
    
    sessions_in_30 = db.study_sessions.find({
        "student_id": student_id,
        "timestamp": {"$gte": thirty_days_ago}
    })
    session_dates = [s["timestamp"].date() for s in sessions_in_30 if "timestamp" in s]
    
    active_dates = set(result_dates + session_dates)
    study_consistency_score = len(active_dates) / 30.0
    study_consistency_score = max(0.0, min(1.0, study_consistency_score))
    
    # Feature 8: confidence_accuracy_gap
    confidence_accuracy_gap = (incorrect_high_conf_attempts / high_conf_attempts * 100.0) if high_conf_attempts > 0 else 0.0
    
    # Feature 9: quiz_attempt_frequency (quizzes per week in last 30 days)
    recent_quiz_count = db.results.count_documents({
        "student_id": student_id,
        "timestamp": {"$gte": thirty_days_ago}
    })
    quiz_attempt_frequency = recent_quiz_count / 4.3
    
    # Compute Trend
    predicted_trend = "stable"
    if results_count >= 2:
        # Sort chronologically to fit trend
        chrono_accuracies = [r.accuracy for r in reversed(results[:5])]
        x = np.arange(len(chrono_accuracies))
        y = np.array(chrono_accuracies)
        if len(chrono_accuracies) >= 2:
            slope, _ = np.polyfit(x, y, 1)
            if slope > 2.0:
                predicted_trend = "improving"
            elif slope < -2.0:
                predicted_trend = "declining"
                 
    return {
        "avg_score_last_5": avg_score_last_5,
        "avg_score_all_time": avg_score_all_time,
        "weak_topic_count": weak_topic_count,
        "strong_topic_count": strong_topic_count,
        "avg_time_per_question": avg_time_per_question,
        "difficulty_distribution_score": difficulty_distribution_score,
        "study_consistency_score": study_consistency_score,
        "confidence_accuracy_gap": confidence_accuracy_gap,
        "quiz_attempt_frequency": quiz_attempt_frequency,
        "previous_cgpa": previous_cgpa,
        "attendance_percentage": attendance_percentage,
        "weak_topics_list": weak_topics_list,
        "improvement_areas": improvement_areas,
        "predicted_trend": predicted_trend
    }

def predict(student_stats: dict) -> dict:
    """
    Predicts student's predicted exam score and risk level using Gradient Boosting.
    """
    avg_score_last_5 = float(student_stats.get("avg_score_last_5", 75.0))
    avg_score_all_time = float(student_stats.get("avg_score_all_time", 75.0))
    weak_topic_count = float(student_stats.get("weak_topic_count", 1.0))
    strong_topic_count = float(student_stats.get("strong_topic_count", 2.0))
    avg_time_per_question = float(student_stats.get("avg_time_per_question", 45.0))
    difficulty_distribution_score = float(student_stats.get("difficulty_distribution_score", 75.0))
    study_consistency_score = float(student_stats.get("study_consistency_score", 0.5))
    confidence_accuracy_gap = float(student_stats.get("confidence_accuracy_gap", 10.0))
    quiz_attempt_frequency = float(student_stats.get("quiz_attempt_frequency", 1.0))
    previous_cgpa = float(student_stats.get("previous_cgpa", 7.0))
    attendance_percentage = float(student_stats.get("attendance_percentage", 75.0))
    
    # Fallback lists if not provided
    weak_topics = student_stats.get("weak_topics_list", [])
    improvement_areas = student_stats.get("improvement_areas", [])
    predicted_trend = student_stats.get("predicted_trend", "stable")
    
    if _models is None:
        # Fallback heuristic using CGPA and attendance heavily
        score = (previous_cgpa * 10.0 * 0.4) + (attendance_percentage * 0.1) + (avg_score_all_time * 0.2) + (avg_score_last_5 * 0.15) + (study_consistency_score * 15.0) - (weak_topic_count * 2.0)
        score = max(30.0, min(100.0, score + 10.0))
        risk = "Low"
        if score < 60.0:
            risk = "High"
        elif score < 75.0:
            risk = "Medium"
        return {
            "predicted_score": round(score, 1),
            "risk_level": risk,
            "confidence": 0.8,
            "weak_topics": weak_topics,
            "improvement_areas": improvement_areas,
            "predicted_trend": predicted_trend
        }
        
    try:
        input_df = pd.DataFrame([{
            "avg_score_last_5": avg_score_last_5,
            "avg_score_all_time": avg_score_all_time,
            "weak_topic_count": weak_topic_count,
            "strong_topic_count": strong_topic_count,
            "avg_time_per_question": avg_time_per_question,
            "difficulty_distribution_score": difficulty_distribution_score,
            "study_consistency_score": study_consistency_score,
            "confidence_accuracy_gap": confidence_accuracy_gap,
            "quiz_attempt_frequency": quiz_attempt_frequency,
            "previous_cgpa": previous_cgpa,
            "attendance_percentage": attendance_percentage
        }])
        
        # 1. Regressor prediction
        pred_score = _models["regressor"].predict(input_df)[0]
        pred_score = float(max(30.0, min(100.0, pred_score)))
        
        # 2. Classifier prediction
        pred_risk = _models["classifier"].predict(input_df)[0]
        
        # 3. Classifier confidence (max class probability)
        pred_prob = _models["classifier"].predict_proba(input_df)[0]
        confidence = float(np.max(pred_prob))
        
        return {
            "predicted_score": round(pred_score, 1),
            "risk_level": str(pred_risk),
            "confidence": round(confidence, 2),
            "weak_topics": weak_topics,
            "improvement_areas": improvement_areas,
            "predicted_trend": predicted_trend
        }
    except Exception as e:
        print(f"Error during Gradient Boosting prediction: {e}")
        score = (previous_cgpa * 10.0 * 0.4) + (attendance_percentage * 0.1) + (avg_score_all_time * 0.2) + (avg_score_last_5 * 0.15) + (study_consistency_score * 15.0) - (weak_topic_count * 2.0)
        score = max(30.0, min(100.0, score + 10.0))
        risk = "Low"
        if score < 60.0:
            risk = "High"
        elif score < 75.0:
            risk = "Medium"
        return {
            "predicted_score": round(score, 1),
            "risk_level": risk,
            "confidence": 0.8,
            "weak_topics": weak_topics,
            "improvement_areas": improvement_areas,
            "predicted_trend": predicted_trend
        }

def retrain_model(real_data: list):
    """
    Retrains Gradient Boosting models with accumulated real student records.
    """
    try:
        from backend.ml.train import train_and_save_model
        train_and_save_model(real_data)
        load_models()
        print("Gradient Boosting ML models retrained and reloaded successfully.")
    except Exception as e:
        print(f"Failed to retrain Gradient Boosting ML models: {e}")

# Backward-compatibility wrapper
def predict_exam_score(
    study_hours: float,
    quiz_accuracy: float,
    focus_score: float,
    idle_pct: float,
    attendance: float = 90.0
) -> int:
    avg_score = quiz_accuracy
    study_consistency = min(1.0, study_hours / 10.0)
    result = predict({
        "avg_score_last_5": avg_score,
        "avg_score_all_time": avg_score,
        "weak_topic_count": 1.0,
        "strong_topic_count": 2.0,
        "avg_time_per_question": 45.0,
        "difficulty_distribution_score": avg_score,
        "study_consistency_score": study_consistency,
        "confidence_accuracy_gap": 10.0,
        "quiz_attempt_frequency": 1.0
    })
    return int(result["predicted_score"])
