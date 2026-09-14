"""
Canonical re-export of all application models from app.models.
All models use the single canonical Base from app.core.database.
"""
from app.core.database import Base
from app.models.user import User
from app.models.question import Question, Option
from app.models.exam import Exam, ExamQuestion
from app.models.session import ExamSession
from app.models.answer import Answer
from app.models.result import Result
from app.models.proctor_event import ProctorEvent

__all__ = [
    "Base",
    "User",
    "Question",
    "Option",
    "Exam",
    "ExamQuestion",
    "ExamSession",
    "Answer",
    "Result",
    "ProctorEvent",
]
