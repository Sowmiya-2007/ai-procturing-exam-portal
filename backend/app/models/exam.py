from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Integer, String, Float, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.enums.enums import ExamStatus

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.question import Question
    from app.models.session import ExamSession
    from app.models.result import Result

class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    randomization_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    negative_marking_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    default_negative_marks: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Proctoring Configuration
    proctoring_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    webcam_monitoring_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    gaze_tracking_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    gaze_sensitivity_threshold: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_tab_switch_warnings: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    status: Mapped[ExamStatus] = mapped_column(SQLEnum(ExamStatus, name="exam_status_enum"), default=ExamStatus.DRAFT, nullable=False, index=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    creator: Mapped[Optional["User"]] = relationship("User", back_populates="exams", foreign_keys=[created_by])
    exam_questions: Mapped[List["ExamQuestion"]] = relationship("ExamQuestion", back_populates="exam", cascade="all, delete-orphan", order_by="ExamQuestion.question_order")
    sessions: Mapped[List["ExamSession"]] = relationship("ExamSession", back_populates="exam", cascade="all, delete-orphan")
    results: Mapped[List["Result"]] = relationship("Result", back_populates="exam", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Exam(id={self.id}, title='{self.title}', status='{self.status}')>"


class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    exam_id: Mapped[int] = mapped_column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("question_bank.id", ondelete="CASCADE"), nullable=False, index=True)
    question_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    marks: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    __table_args__ = (
        UniqueConstraint("exam_id", "question_id", name="uq_exam_question"),
    )

    # Relationships
    exam: Mapped["Exam"] = relationship("Exam", back_populates="exam_questions")
    question: Mapped["Question"] = relationship("Question", back_populates="exam_associations")

    def __repr__(self):
        return f"<ExamQuestion(id={self.id}, exam_id={self.exam_id}, question_id={self.question_id}, order={self.question_order})>"
