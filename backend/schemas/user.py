from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str # student, teacher, admin
    prn_no: Optional[str] = None
    class_name: Optional[str] = None
    department: Optional[str] = None
    year_semester: Optional[str] = None
    roll_number: Optional[str] = None
    previous_cgpa: Optional[float] = None
    attendance_percentage: Optional[float] = None
    skills: Optional[list[str]] = None
    learning_interests: Optional[list[str]] = None
    status: Optional[str] = "Approved"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
