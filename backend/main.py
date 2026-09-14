import os
import sys
from contextlib import asynccontextmanager

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from seed_db import seed_database
from routers import auth_router, admin_router, questions_router, student_router, exams_router, exam_session_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for non-blocking startup and shutdown."""
    yield

app = FastAPI(
    title="AI Intelligent Examination Platform API",
    description="Full-stack AI-Driven Examination, Multi-Role Authentication, Examiner Approval Gatekeeper, and 5-Type Question Bank Engine",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend interactions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers with /api prefix
app.include_router(auth_router.router)
app.include_router(admin_router.router)
app.include_router(questions_router.router)
app.include_router(student_router.router)
app.include_router(exams_router.router)
app.include_router(exam_session_router.router)

# Also mount direct root aliases for direct API calls (/admin, /questions, /exams, /auth)
app.include_router(auth_router.router, prefix="", include_in_schema=False)
app.include_router(admin_router.router, prefix="", include_in_schema=False)
app.include_router(questions_router.router, prefix="", include_in_schema=False)
app.include_router(exams_router.router, prefix="", include_in_schema=False)
app.include_router(exam_session_router.router, prefix="", include_in_schema=False)

# Specific non-prefixed examiner and exam routes matching exact specification
direct_router = APIRouter(tags=["Root Aliases"])

# Mount without /api prefix
app.include_router(direct_router)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "AI Intelligent Examination Platform Backend API",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/auth",
            "admin": "/api/admin",
            "examiners": "/api/admin/examiners",
            "questions": "/api/questions",
            "exams": "/api/exams",
            "student": "/api/student",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)

