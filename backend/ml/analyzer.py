import pandas as pd
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta

# Legacy functions for compatibility
def detect_weak_subjects(subject_performance: Dict[str, float]) -> List[str]:
    """
    Returns subjects where performance score is below 70%.
    (Legacy compat wrapper)
    """
    weak = []
    for sub, score in subject_performance.items():
        if score < 70.0:
            weak.append(sub)
    return weak

def generate_recommendations(weak_subjects: List[str]) -> List[str]:
    """
    Generates study recommendations as list of strings.
    (Legacy compat wrapper)
    """
    recommendations = []
    for sub in weak_subjects:
        if sub == "machine_learning":
            recommendations.append("Practice 15 MCQ questions on Neural Networks & Backpropagation")
            recommendations.append("Watch Machine Learning Basics & Gradient Descent video tutorials")
        elif sub == "compiler_design":
            recommendations.append("Review parsing algorithms (LL, LR parsers) and Syntax tree constructions")
            recommendations.append("Solve 10 problems on Context-Free Grammars (CFG)")
        elif sub == "computer_networks":
            recommendations.append("Review routing protocols: OSPF, BGP, and RIP principles")
            recommendations.append("Draw and study OSI layer packet encapsulations")
        elif sub == "internet_of_things":
            recommendations.append("Practice sensor communication protocols (I2C, SPI, MQTT)")
        elif sub == "development_engineering":
            recommendations.append("Review software engineering lifecycle phases and Agile workflows")
            
    if not recommendations:
        recommendations.append("Take a full-length comprehensive mock examination")
        recommendations.append("Enroll in advanced peer tutoring classes on campus")
        
    return recommendations

def generate_exam_strategy(subject_performance: Dict[str, float]) -> List[str]:
    """
    Formulates a customized exam taking strategy based on subject strengths.
    """
    if not subject_performance:
        return ["Attempt all sections in order of appearance."]
        
    sorted_subs = sorted(subject_performance.items(), key=lambda item: item[1], reverse=True)
    best_sub = sorted_subs[0][0].replace("_", " ").title()
    worst_sub = sorted_subs[-1][0].replace("_", " ").title()
    
    return [
        f"Attempt questions from {best_sub} first to secure easy points and establish test momentum.",
        f"Spend the extra reading time reviewing {worst_sub} questions and save its difficult calculations for the middle of the exam session."
    ]

def detect_burnout(results: List[Any]) -> Optional[str]:
    """
    Analyzes quiz results to detect if the student is taking too many quizzes in a short window.
    """
    if len(results) < 2:
        return None
        
    timestamps = []
    for r in results:
        ts = getattr(r, "timestamp", None)
        if ts:
            timestamps.append(pd.to_datetime(ts))
            
    if len(timestamps) < 2:
        return None
        
    timestamps.sort()
    now = datetime.now()
    one_day_ago = now - timedelta(days=1)
    
    recent_quizzes = [t for t in timestamps if t.tz_localize(None) > one_day_ago]
    
    if len(recent_quizzes) >= 2:
        return "Warning: Learning fatigue detected. Suggestion: Take a short break."
        
    return None

def optimize_study_time(sessions: List[Any]) -> str:
    """
    Analyzes past study sessions using pandas to determine the time block with the highest average focus score.
    """
    if not sessions:
        return "Evening (7:00 PM - 9:00 PM)"
        
    data = []
    for s in sessions:
        ts = pd.to_datetime(getattr(s, "timestamp", datetime.now()))
        data.append({
            "hour": ts.hour,
            "focus_score": getattr(s, "focus_score", 75)
        })
        
    df = pd.DataFrame(data)
    
    def map_to_block(hour):
        if 6 <= hour < 12: return "Morning (8:00 AM - 11:00 AM)"
        elif 12 <= hour < 18: return "Afternoon (2:00 PM - 5:00 PM)"
        elif 18 <= hour < 24: return "Evening (7:00 PM - 9:00 PM)"
        else: return "Night (10:00 PM - Midnight)"
        
    df["time_block"] = df["hour"].apply(map_to_block)
    
    avg_focus = df.groupby("time_block")["focus_score"].mean()
    if avg_focus.empty:
        return "Evening (7:00 PM - 9:00 PM)"
        
    best_block = avg_focus.idxmax()
    return best_block

# New ML Requirements
def detect_weak_topics(results: List[Any]) -> List[str]:
    """
    Groups quiz results by topic/subject and returns topics where the average accuracy is under 60%.
    """
    if not results:
        return []
        
    parsed_data = []
    for r in results:
        topic = None
        accuracy = None
        
        # Check if DB model or dict
        if isinstance(r, dict):
            topic = r.get("topic") or r.get("subject")
            accuracy = r.get("accuracy")
            if accuracy is None and "score" in r and "total_questions" in r:
                tot = float(r["total_questions"])
                accuracy = (float(r["score"]) / tot * 100.0) if tot > 0 else 0.0
        else:
            # Check relations
            quiz_obj = getattr(r, "quiz", None)
            if quiz_obj:
                topic = getattr(quiz_obj, "subject", None) or getattr(quiz_obj, "title", None)
            
            if not topic:
                topic = getattr(r, "subject", None) or getattr(r, "quiz_title", None)
                
            accuracy = getattr(r, "accuracy", None)
            if accuracy is None:
                score = getattr(r, "score", None)
                tot = getattr(r, "total_questions", None)
                if score is not None and tot is not None and tot > 0:
                    accuracy = (float(score) / float(tot)) * 100.0
                    
        if topic and accuracy is not None:
            parsed_data.append({
                "topic": topic.strip().lower(),
                "accuracy": float(accuracy)
            })
            
    if not parsed_data:
        return []
        
    df = pd.DataFrame(parsed_data)
    grouped = df.groupby("topic")["accuracy"].mean()
    
    weak_topics = grouped[grouped < 60.0].index.tolist()
    return [t.replace("_", " ").title() for t in weak_topics]

def generate_recommendations_ml(weak_topics: List[str]) -> List[Dict[str, str]]:
    """
    Generates structured recommendations based on weak topics.
    Format: { "topic": topic, "action": action, "type": type }
    """
    recs = []
    
    topic_mapping = {
        "probability": {
            "action": "Watch Probability Basics and Bayes Theorem tutorial",
            "type": "video"
        },
        "calculus": {
            "action": "Practice derivative and integration calculations",
            "type": "practice"
        },
        "algebra": {
            "action": "Review linear equation variables and matrices",
            "type": "notes"
        },
        "compiler design": {
            "action": "Review context-free grammars and LL/LR parsing tables",
            "type": "notes"
        },
        "computer networks": {
            "action": "Watch TCP/IP handshake and routing algorithms video guides",
            "type": "video"
        },
        "machine learning": {
            "action": "Practice 15 MCQ questions on neural network backpropagation",
            "type": "practice"
        },
        "internet of things": {
            "action": "Review MQTT publish-subscribe architecture and ESP32 hardware",
            "type": "notes"
        },
        "development engineering": {
            "action": "Practice Git branch merges and check CI/CD pipeline guides",
            "type": "practice"
        }
    }
    
    for topic in weak_topics:
        key = topic.strip().lower()
        if key in topic_mapping:
            recs.append({
                "topic": topic,
                "action": topic_mapping[key]["action"],
                "type": topic_mapping[key]["type"]
            })
        else:
            recs.append({
                "topic": topic,
                "action": f"Revise key notes and practice questions on {topic}",
                "type": "notes"
            })
            
    if not recs:
        # Default recommendations if no weak topics
        recs.append({
            "topic": "General Study",
            "action": "Take a comprehensive mock examination to challenge yourself",
            "type": "practice"
        })
        
    return recs
