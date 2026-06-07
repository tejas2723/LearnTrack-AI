from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class StudyMaterial(BaseModel):
    id: int = Field(alias="_id")
    teacher_id: int
    subject: str
    topic: str
    title: str
    description: Optional[str] = None
    material_type: str # pdf / video_link / notes / practice_set
    file_url: Optional[str] = None
    external_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    tags: Optional[List[str]] = None
    is_published: bool = True
    target_audience: str = "all" # all / weak_students / specific
    target_student_ids: Optional[List[int]] = None # list of student IDs
    view_count: int = 0
    download_count: int = 0
    created_at: datetime = Field(default_factory=datetime.now)

    model_config = {
        "populate_by_name": True
    }
