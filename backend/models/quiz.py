from pydantic import BaseModel, Field
from typing import Optional

class Quiz(BaseModel):
    id: int = Field(alias="_id")
    title: str
    subject: str # e.g. "compiler_design"
    is_active: bool = True

    model_config = {
        "populate_by_name": True
    }

class Question(BaseModel):
    id: int = Field(alias="_id")
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

    model_config = {
        "populate_by_name": True
    }

class QuizAttempt(BaseModel):
    id: int = Field(alias="_id")
    result_id: int
    question_id: int
    
    selected_option: Optional[str] = None # "a", "b", "c", "d" or None
    is_correct: bool
    time_taken_seconds: int
    confidence_level: Optional[int] = None # 1 to 5

    model_config = {
        "populate_by_name": True
    }
