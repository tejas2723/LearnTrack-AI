from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class StudySessionCreate(BaseModel):
    duration_minutes: int
    focus_score: int
    idle_minutes: int
    questions_attempted: int

class StudySessionResponse(StudySessionCreate):
    id: int
    student_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class ConceptMasteryResponse(BaseModel):
    id: int
    category: str
    topic: str
    is_mastered: bool

    class Config:
        from_attributes = True

class BadgeResponse(BaseModel):
    id: int
    badge_id: str
    name: str
    description: str
    unlocked_at: datetime

    class Config:
        from_attributes = True

class ChatMessageCreate(BaseModel):
    message_text: str

class ChatMessageResponse(BaseModel):
    id: int
    sender: str # "user" or "ai"
    message_text: str
    timestamp: datetime

    class Config:
        from_attributes = True

class StudentAnalyticsSummary(BaseModel):
    prn_no: Optional[str]
    predicted_score: int
    risk_level: str
    weak_subjects: List[str]
    preferred_style: str
    recommendations: List[str]
    strategy: List[str]
    burnout_warning: Optional[str]
    focus_insight: str
    latest_focus_score: int
    badges: List[BadgeResponse]
    study_sessions: List[StudySessionResponse]
    concept_mastery: List[ConceptMasteryResponse]

    class Config:
        from_attributes = True
