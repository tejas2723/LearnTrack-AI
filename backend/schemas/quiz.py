from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class QuestionBase(BaseModel):
    quiz_id: Optional[int] = None
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str # "a", "b", "c", "d"
    explanation: Optional[str] = None
    difficulty: str = "medium" # "easy", "medium", "hard"
    topic: Optional[str] = None
    subject: Optional[str] = None
    marks: int = 1
    time_limit_seconds: int = 60

class QuestionCreate(QuestionBase):
    pass

class QuestionResponse(QuestionBase):
    id: int
    quiz_id: Optional[int] = None

    class Config:
        from_attributes = True

class QuizBase(BaseModel):
    title: str
    subject: str # e.g. "compiler_design"

class QuizCreate(QuizBase):
    questions: List[QuestionCreate]

class QuizResponse(QuizBase):
    id: int
    questions: List[QuestionResponse]
    total_marks: int
    is_active: bool

    class Config:
        from_attributes = True

class QuestionAttemptInput(BaseModel):
    question_id: int
    selected_option: Optional[str] = None # "a", "b", "c", "d" or null (skipped)
    time_taken_seconds: int
    confidence_level: Optional[int] = None # 1 to 5

class ActiveQuizSubmission(BaseModel):
    attempts: List[QuestionAttemptInput]
    time_taken_seconds: int = 60
    idle_time_seconds: int = 0

class QuizSubmission(BaseModel):
    attempts: List[QuestionAttemptInput]
    time_taken_seconds: int
    idle_time_seconds: int

class QuizAttemptResponse(BaseModel):
    id: int
    result_id: int
    question_id: int
    selected_option: Optional[str]
    is_correct: bool
    time_taken_seconds: int
    confidence_level: Optional[int]

    class Config:
        from_attributes = True

class QuizResultCreate(BaseModel):
    quiz_id: int
    score: int
    total_questions: int
    time_taken_seconds: int
    idle_time_seconds: int

class QuizResultResponse(BaseModel):
    id: int
    student_id: int
    quiz_id: int
    score: int
    total_questions: int
    accuracy: float
    time_taken_seconds: int
    idle_time_seconds: int
    focus_score: int
    timestamp: datetime
    attempts: List[QuizAttemptResponse]

    class Config:
        from_attributes = True
