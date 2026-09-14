import os
import sys
from contextlib import asynccontextmanager

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from routers import auth_router, admin_router, questions_router, student_router, exams_router, exam_session_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for non-blocking startup and shutdown."""
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Full-stack AI-Driven Examination, Multi-Role Authentication, Examiner Approval Gatekeeper, and 5-Type Question Bank Engine",
    lifespan=lifespan
)

# Configure CORS
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

@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
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
