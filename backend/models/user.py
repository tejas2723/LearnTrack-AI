from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class User(BaseModel):
    id: int = Field(alias="_id")
    email: str
    hashed_password: str
    full_name: str
    
    # Student specific columns (nullable for teachers/admins)
    prn_no: Optional[str] = None
    class_name: Optional[str] = None # e.g. "TY - A"
    department: Optional[str] = None
    year_semester: Optional[str] = None
    roll_number: Optional[str] = None
    previous_cgpa: Optional[float] = None
    attendance_percentage: Optional[float] = None
    skills: Optional[list[str]] = None
    learning_interests: Optional[list[str]] = None
    predicted_score: float = 70.0
    risk_level: str = "Low"
    preferred_style: str = "Practice-based learning"
    
    role: str = "student" # student, teacher, admin
    status: str = "Approved" # Approved, Pending, Rejected
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)

    model_config = {
        "populate_by_name": True
    }
