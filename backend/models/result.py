from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class Result(BaseModel):
    id: int = Field(alias="_id")
    student_id: int
    quiz_id: int
    
    score: int
    total_questions: int
    accuracy: float # score / total_questions * 100
    
    time_taken_seconds: int
    idle_time_seconds: int
    focus_score: int
    timestamp: datetime = Field(default_factory=datetime.now)

    model_config = {
        "populate_by_name": True
    }

class StudySession(BaseModel):
    id: int = Field(alias="_id")
    student_id: int
    
    timestamp: datetime = Field(default_factory=datetime.now)
    duration_minutes: int
    focus_score: int
    idle_minutes: int
    questions_attempted: int

    model_config = {
        "populate_by_name": True
    }

class ConceptMastery(BaseModel):
    id: int = Field(alias="_id")
    student_id: int
    
    category: str # e.g. "Mathematics", "Computer Science"
    topic: str # e.g. "Algebra", "Probability"
    is_mastered: bool = False

    model_config = {
        "populate_by_name": True
    }

class Badge(BaseModel):
    id: int = Field(alias="_id")
    student_id: int
    
    badge_id: str # e.g. "beginner_learner"
    name: str
    description: str
    unlocked_at: datetime = Field(default_factory=datetime.now)

    model_config = {
        "populate_by_name": True
    }

class ChatMessage(BaseModel):
    id: int = Field(alias="_id")
    student_id: int
    
    sender: str # "user" or "ai"
    message_text: str
    timestamp: datetime = Field(default_factory=datetime.now)

    model_config = {
        "populate_by_name": True
    }

class ChatHistory(BaseModel):
    id: int = Field(alias="_id")
    student_id: int
    session_id: str
    role: str # "user" or "assistant"
    message: str
    created_at: datetime = Field(default_factory=datetime.now)

    model_config = {
        "populate_by_name": True
    }
