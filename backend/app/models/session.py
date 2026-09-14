from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.enums.enums import SessionStatus

if TYPE_CHECKING:
    from app.models.exam import Exam
    from app.models.user import User
    from app.models.answer import Answer
    from app.models.proctor_event import ProctorEvent

class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    exam_id: Mapped[int] = mapped_column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[SessionStatus] = mapped_column(SQLEnum(SessionStatus, name="session_status_enum"), default=SessionStatus.NOT_STARTED, nullable=False)

    # Relationships
    exam: Mapped["Exam"] = relationship("Exam", back_populates="sessions")
    student: Mapped["User"] = relationship("User", back_populates="sessions")
    answers: Mapped[List["Answer"]] = relationship("Answer", back_populates="session", cascade="all, delete-orphan")
    proctor_events: Mapped[List["ProctorEvent"]] = relationship("ProctorEvent", back_populates="session", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ExamSession(id={self.id}, exam_id={self.exam_id}, student_id={self.student_id}, status='{self.status}')>"
