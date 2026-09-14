from datetime import datetime, timezone
from typing import Optional, Any, TYPE_CHECKING
from sqlalchemy import Integer, String, Float, Text, DateTime, ForeignKey, UniqueConstraint, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.session import ExamSession
    from app.models.question import Question

class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("question_bank.id", ondelete="CASCADE"), nullable=False, index=True)
    selected_option_ids: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    text_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Grading & Evaluation
    marks_awarded: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_suggested_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_justification: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_matched_points: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    ai_missing_points: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    examiner_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_evaluated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("session_id", "question_id", name="uq_session_question_answer"),
    )

    # Relationships
    session: Mapped["ExamSession"] = relationship("ExamSession", back_populates="answers")
    question: Mapped["Question"] = relationship("Question", back_populates="answers")

    def __repr__(self):
        return f"<Answer(id={self.id}, session_id={self.session_id}, question_id={self.question_id}, marks={self.marks_awarded})>"
