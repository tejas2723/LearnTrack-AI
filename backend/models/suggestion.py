from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class Suggestion(BaseModel):
    id: int = Field(alias="_id")
    teacher_id: int
    student_id: Optional[int] = None # Null = Class-wide
    subject: str
    message: str
    priority: str # "low", "medium", "high"
    created_at: datetime = Field(default_factory=datetime.now)
    is_read: bool = False

    model_config = {
        "populate_by_name": True
    }
