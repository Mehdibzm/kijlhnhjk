from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import random
import string
import base64
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    status: str = "waiting"  # waiting, connected, transferring, completed
    receiver_device_id: str
    sender_device_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

class SessionCreate(BaseModel):
    device_id: str

class SessionJoin(BaseModel):
    code: str
    device_id: str

class FileRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    filename: str
    file_type: str
    file_size: int
    data: str  # base64 encoded
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    downloaded: bool = False

class FileUpload(BaseModel):
    session_id: str
    filename: str
    file_type: str
    file_size: int
    data: str  # base64 encoded

class FileInfo(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    uploaded_at: datetime
    downloaded: bool

def generate_session_code():
    """Generate a 6-digit session code"""
    return ''.join(random.choices(string.digits, k=6))

# API Routes
@api_router.get("/")
async def root():
    return {"message": "ShareIt Clone API", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Session Management
@api_router.post("/session/create")
async def create_session(data: SessionCreate):
    """Create a new transfer session (Receiver side)"""
    # Generate unique code
    code = generate_session_code()
    
    # Ensure code is unique
    existing = await db.sessions.find_one({"code": code, "status": {"$in": ["waiting", "connected", "transferring"]}})
    while existing:
        code = generate_session_code()
        existing = await db.sessions.find_one({"code": code, "status": {"$in": ["waiting", "connected", "transferring"]}})
    
    session = Session(
        code=code,
        receiver_device_id=data.device_id,
        status="waiting"
    )
    
    await db.sessions.insert_one(session.dict())
    logger.info(f"Session created: {session.code}")
    
    return {
        "success": True,
        "session": {
            "id": session.id,
            "code": session.code,
            "status": session.status
        }
    }

@api_router.post("/session/join")
async def join_session(data: SessionJoin):
    """Join an existing session (Sender side)"""
    session = await db.sessions.find_one({
        "code": data.code,
        "status": "waiting"
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or already in use")
    
    # Update session with sender
    await db.sessions.update_one(
        {"_id": session["_id"]},
        {
            "$set": {
                "sender_device_id": data.device_id,
                "status": "connected"
            }
        }
    )
    
    logger.info(f"Session {data.code} joined by sender")
    
    return {
        "success": True,
        "session": {
            "id": session["id"],
            "code": session["code"],
            "status": "connected"
        }
    }

@api_router.get("/session/{session_id}/status")
async def get_session_status(session_id: str):
    """Get session status"""
    session = await db.sessions.find_one({"id": session_id})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Count files in session
    file_count = await db.files.count_documents({"session_id": session_id})
    
    return {
        "id": session["id"],
        "code": session["code"],
        "status": session["status"],
        "file_count": file_count,
        "has_sender": session.get("sender_device_id") is not None
    }

@api_router.post("/session/{session_id}/complete")
async def complete_session(session_id: str):
    """Mark session as completed"""
    result = await db.sessions.update_one(
        {"id": session_id},
        {"$set": {"status": "completed"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"success": True, "message": "Session completed"}

# File Transfer
@api_router.post("/file/upload")
async def upload_file(data: FileUpload):
    """Upload a file to a session"""
    # Verify session exists and is connected
    session = await db.sessions.find_one({
        "id": data.session_id,
        "status": {"$in": ["connected", "transferring"]}
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or not connected")
    
    # Update session status to transferring
    await db.sessions.update_one(
        {"id": data.session_id},
        {"$set": {"status": "transferring"}}
    )
    
    # Create file record
    file_record = FileRecord(
        session_id=data.session_id,
        filename=data.filename,
        file_type=data.file_type,
        file_size=data.file_size,
        data=data.data
    )
    
    await db.files.insert_one(file_record.dict())
    logger.info(f"File uploaded: {data.filename} to session {data.session_id}")
    
    return {
        "success": True,
        "file": {
            "id": file_record.id,
            "filename": file_record.filename,
            "file_size": file_record.file_size
        }
    }

@api_router.get("/session/{session_id}/files")
async def get_session_files(session_id: str):
    """Get list of files in a session"""
    files = await db.files.find({"session_id": session_id}).to_list(100)
    
    return {
        "files": [
            {
                "id": f["id"],
                "filename": f["filename"],
                "file_type": f["file_type"],
                "file_size": f["file_size"],
                "uploaded_at": f["uploaded_at"],
                "downloaded": f["downloaded"]
            }
            for f in files
        ]
    }

@api_router.get("/file/{file_id}")
async def get_file(file_id: str):
    """Get file data for download"""
    file_record = await db.files.find_one({"id": file_id})
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Mark as downloaded
    await db.files.update_one(
        {"id": file_id},
        {"$set": {"downloaded": True}}
    )
    
    return {
        "id": file_record["id"],
        "filename": file_record["filename"],
        "file_type": file_record["file_type"],
        "file_size": file_record["file_size"],
        "data": file_record["data"]
    }

@api_router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and its files"""
    # Delete files
    await db.files.delete_many({"session_id": session_id})
    
    # Delete session
    result = await db.sessions.delete_one({"id": session_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"success": True, "message": "Session deleted"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
