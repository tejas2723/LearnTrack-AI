import os
import json
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from datetime import datetime

from backend.database import get_db, get_next_sequence_value
from backend.models.user import User
from backend.routers.auth import get_current_user, require_teacher
from backend.ml.analyzer import detect_weak_topics

router = APIRouter(prefix="/materials", tags=["materials"])

def _format_material(m: dict) -> dict:
    return {
        "id": m["_id"],
        "teacher_id": m.get("teacher_id"),
        "subject": m.get("subject", ""),
        "topic": m.get("topic", ""),
        "title": m.get("title", ""),
        "description": m.get("description"),
        "material_type": m.get("material_type", "pdf"),
        "file_url": m.get("file_url"),
        "external_url": m.get("external_url"),
        "thumbnail_url": m.get("thumbnail_url"),
        "tags": m.get("tags"),
        "is_published": m.get("is_published", True),
        "target_audience": m.get("target_audience", "all"),
        "target_student_ids": m.get("target_student_ids"),
        "view_count": m.get("view_count", 0),
        "download_count": m.get("download_count", 0),
        "created_at": m.get("created_at")
    }

@router.post("")
async def create_material(
    subject: str = Form(...),
    topic: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    material_type: str = Form(...),  # pdf / video_link / notes / practice_set
    external_url: Optional[str] = Form(None),
    thumbnail_url: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # JSON list of tags as string
    is_published: bool = Form(True),
    target_audience: str = Form("all"),  # all / weak_students / specific
    target_student_ids: Optional[str] = Form(None),  # JSON list of student IDs
    file: Optional[UploadFile] = File(None),
    db=Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    # Parse JSON fields
    parsed_tags = None
    if tags:
        try:
            parsed_tags = json.loads(tags)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON format for tags")

    parsed_student_ids = None
    if target_student_ids:
        try:
            parsed_student_ids = json.loads(target_student_ids)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON format for target_student_ids")

    # File upload handling
    file_url = None
    if file:
        content = await file.read()
        if len(content) > 20 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds the 20MB limit")

        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".pdf", ".docx"]:
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are allowed")

        unique_filename = f"{uuid.uuid4()}{ext}"
        upload_dir = os.path.join("uploads", "materials")
        os.makedirs(upload_dir, exist_ok=True)
        target_path = os.path.join(upload_dir, unique_filename)

        with open(target_path, "wb") as f:
            f.write(content)

        file_url = f"/uploads/materials/{unique_filename}"

    material_id = get_next_sequence_value("study_materials")
    material_doc = {
        "_id": material_id,
        "teacher_id": current_user.id,
        "subject": subject.strip(),
        "topic": topic.strip(),
        "title": title.strip(),
        "description": description.strip() if description else None,
        "material_type": material_type,
        "file_url": file_url,
        "external_url": external_url.strip() if external_url else None,
        "thumbnail_url": thumbnail_url.strip() if thumbnail_url else None,
        "tags": parsed_tags,
        "is_published": is_published,
        "target_audience": target_audience,
        "target_student_ids": parsed_student_ids,
        "view_count": 0,
        "download_count": 0,
        "created_at": datetime.now()
    }
    db.study_materials.insert_one(material_doc)
    return _format_material(material_doc)

@router.get("")
def list_materials(
    subject: Optional[str] = None,
    topic: Optional[str] = None,
    material_type: Optional[str] = None,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = {}
    if subject:
        query["subject"] = {"$regex": f"^{subject.strip()}$", "$options": "i"}
    if topic:
        query["topic"] = {"$regex": f"^{topic.strip()}$", "$options": "i"}
    if material_type:
        query["material_type"] = material_type

    if current_user.role == "teacher":
        query["teacher_id"] = current_user.id
        materials = list(db.study_materials.find(query).sort("created_at", -1))
        return [_format_material(m) for m in materials]

    elif current_user.role == "student":
        query["is_published"] = True
        all_materials = list(db.study_materials.find(query).sort("created_at", -1))

        # Detect weak topics for this student
        results_raw = list(db.results.find({"student_id": current_user.id}))
        quiz_ids = [r["quiz_id"] for r in results_raw]
        quizzes_map = {q["_id"]: q for q in db.quizzes.find({"_id": {"$in": quiz_ids}})}
        results = [
            {"topic": quizzes_map.get(r["quiz_id"], {}).get("subject"), "accuracy": r.get("accuracy")}
            for r in results_raw
        ]
        weak_topics = detect_weak_topics(results)
        weak_topics_lower = [t.lower().replace(" ", "_").strip() for t in weak_topics]

        filtered = []
        for m in all_materials:
            if m.get("target_audience") == "all":
                filtered.append(_format_material(m))
            elif m.get("target_audience") == "weak_students":
                sub_clean = m.get("subject", "").lower().replace(" ", "_").strip()
                top_clean = m.get("topic", "").lower().replace(" ", "_").strip()
                if sub_clean in weak_topics_lower or top_clean in weak_topics_lower:
                    filtered.append(_format_material(m))
            elif m.get("target_audience") == "specific":
                target_ids = m.get("target_student_ids") or []
                if current_user.id in target_ids:
                    filtered.append(_format_material(m))
        return filtered

    else:
        # Admins see everything
        materials = list(db.study_materials.find(query).sort("created_at", -1))
        return [_format_material(m) for m in materials]

@router.get("/recommended/{student_id}")
def get_recommended_materials(
    student_id: int,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    results_raw = list(db.results.find({"student_id": student_id}))
    quiz_ids = [r["quiz_id"] for r in results_raw]
    quizzes_map = {q["_id"]: q for q in db.quizzes.find({"_id": {"$in": quiz_ids}})}
    results = [
        {"topic": quizzes_map.get(r["quiz_id"], {}).get("subject"), "accuracy": r.get("accuracy")}
        for r in results_raw
    ]
    weak_topics = detect_weak_topics(results)

    if not weak_topics:
        materials = list(db.study_materials.find({"is_published": True}).limit(4))
        return [_format_material(m) for m in materials]

    weak_topics_lower = [t.lower().replace(" ", "_").strip() for t in weak_topics]

    recommended = []
    seen_ids = set()
    for sub in weak_topics_lower:
        sub_readable = sub.replace("_", " ")
        materials = list(db.study_materials.find({
            "is_published": True,
            "$or": [
                {"subject": {"$regex": sub_readable, "$options": "i"}},
                {"topic": {"$regex": sub_readable, "$options": "i"}}
            ]
        }).limit(4))
        for m in materials:
            if m["_id"] not in seen_ids:
                recommended.append(_format_material(m))
                seen_ids.add(m["_id"])
                if len(recommended) >= 4:
                    break
        if len(recommended) >= 4:
            break

    # Fill to 4
    if len(recommended) < 4:
        exclude_ids = list(seen_ids)
        additional = list(db.study_materials.find({
            "is_published": True,
            "_id": {"$nin": exclude_ids}
        }).limit(4 - len(recommended)))
        recommended.extend([_format_material(m) for m in additional])

    return recommended[:4]

@router.get("/{id}")
def get_material_details(
    id: int,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    material = db.study_materials.find_one({"_id": id})
    if not material:
        raise HTTPException(status_code=404, detail="Study material not found")

    db.study_materials.update_one({"_id": id}, {"$inc": {"view_count": 1}})
    material["view_count"] = material.get("view_count", 0) + 1
    return _format_material(material)

@router.get("/{id}/download")
def download_material(
    id: int,
    db=Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    material = db.study_materials.find_one({"_id": id})
    if not material:
        raise HTTPException(status_code=404, detail="Study material not found")

    if not material.get("file_url"):
        raise HTTPException(status_code=400, detail="This study material does not have a downloadable file")

    file_path = material["file_url"].lstrip("/")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on server storage")

    db.study_materials.update_one({"_id": id}, {"$inc": {"download_count": 1}})
    return FileResponse(file_path, filename=os.path.basename(file_path))

@router.patch("/{id}")
def update_material(
    id: int,
    subject: Optional[str] = None,
    topic: Optional[str] = None,
    title: Optional[str] = None,
    description: Optional[str] = None,
    material_type: Optional[str] = None,
    external_url: Optional[str] = None,
    thumbnail_url: Optional[str] = None,
    tags: Optional[List[str]] = None,
    is_published: Optional[bool] = None,
    target_audience: Optional[str] = None,
    target_student_ids: Optional[List[int]] = None,
    db=Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    material = db.study_materials.find_one({"_id": id})
    if not material:
        raise HTTPException(status_code=404, detail="Study material not found")

    if material.get("teacher_id") != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this material")

    updates = {}
    if subject is not None: updates["subject"] = subject.strip()
    if topic is not None: updates["topic"] = topic.strip()
    if title is not None: updates["title"] = title.strip()
    if description is not None: updates["description"] = description.strip()
    if material_type is not None: updates["material_type"] = material_type
    if external_url is not None: updates["external_url"] = external_url.strip()
    if thumbnail_url is not None: updates["thumbnail_url"] = thumbnail_url.strip()
    if tags is not None: updates["tags"] = tags
    if is_published is not None: updates["is_published"] = is_published
    if target_audience is not None: updates["target_audience"] = target_audience
    if target_student_ids is not None: updates["target_student_ids"] = target_student_ids

    if updates:
        db.study_materials.update_one({"_id": id}, {"$set": updates})

    updated = db.study_materials.find_one({"_id": id})
    return _format_material(updated)

@router.delete("/{id}")
def delete_material(
    id: int,
    db=Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    material = db.study_materials.find_one({"_id": id})
    if not material:
        raise HTTPException(status_code=404, detail="Study material not found")

    if material.get("teacher_id") != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this material")

    # Delete local file if it exists
    if material.get("file_url"):
        file_path = material["file_url"].lstrip("/")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Failed to delete file from disk: {e}")

    db.study_materials.delete_one({"_id": id})
    return {"message": "Study material deleted successfully"}
