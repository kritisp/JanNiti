import os
import shutil
import uuid
from fastapi import UploadFile

# Configure upload directory relative to root workspace or mountable Render path
UPLOAD_BASE_DIR = os.getenv("UPLOADS_DIR", "uploads")
IMAGES_DIR = os.path.join(UPLOAD_BASE_DIR, "images")
VOICE_DIR = os.path.join(UPLOAD_BASE_DIR, "voice")


def save_upload(file: UploadFile, category: str) -> str:
    """Saves a FastAPI UploadFile to local relative storage under a category.

    Args:
        file: FastAPI UploadFile object containing upload stream.
        category: Sub-folder name (e.g. 'images' or 'voice').
    Returns:
        The web-accessible relative path with forward slashes (e.g. '/uploads/images/uuid.png').
    """
    # Ensure folders exist on disk
    target_dir = os.path.join(UPLOAD_BASE_DIR, category)
    os.makedirs(target_dir, exist_ok=True)

    # Generate unique filename using uuid
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    dest_path = os.path.join(target_dir, unique_filename)

    # Copy files efficiently via chunk streams
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Normalize relative path to forward slashes for cross-platform static routing
    return f"/uploads/{category}/{unique_filename}"
