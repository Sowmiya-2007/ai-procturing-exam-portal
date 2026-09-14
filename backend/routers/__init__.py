# Package initialization for backend routers
from routers import auth_router, admin_router, questions_router, student_router, exams_router, exam_session_router

__all__ = [
    "auth_router",
    "admin_router",
    "questions_router",
    "student_router",
    "exams_router",
    "exam_session_router",
]
