from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Integer, String, Float, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates
from app.core.database import Base
from app.enums.enums import QuestionType, DifficultyLevel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.exam import ExamQuestion
    from app.models.answer import Answer

class Question(Base):
    __tablename__ = "question_bank"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    subject: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[QuestionType] = mapped_column(SQLEnum(QuestionType, name="question_type_enum"), nullable=False, index=True)
    difficulty: Mapped[DifficultyLevel] = mapped_column(SQLEnum(DifficultyLevel, name="difficulty_level_enum"), nullable=False, index=True)
    expected_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    model_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    max_marks: Mapped[float] = mapped_column(Float, nullable=False)
    negative_marks: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    creator: Mapped[Optional["User"]] = relationship("User", back_populates="questions", foreign_keys=[created_by])
    options: Mapped[List["Option"]] = relationship("Option", back_populates="question", cascade="all, delete-orphan", lazy="selectin")
    exam_associations: Mapped[List["ExamQuestion"]] = relationship("ExamQuestion", back_populates="question", cascade="all, delete-orphan")
    answers: Mapped[List["Answer"]] = relationship("Answer", back_populates="question")

    @validates("max_marks")
    def validate_max_marks(self, key, value):
        if value is None or value <= 0:
            raise ValueError("max_marks must be greater than zero.")
        return value

    def validate_options_rule(self):
        """
        Validates domain constraints for question options depending on question_type.
        """
        if self.question_type == QuestionType.MCQ:
            correct_count = sum(1 for opt in self.options if opt.is_correct)
            if len(self.options) > 0 and correct_count != 1:
                raise ValueError("MCQ questions must have exactly one correct option.")
        elif self.question_type == QuestionType.MULTI_SELECT:
            correct_count = sum(1 for opt in self.options if opt.is_correct)
            if len(self.options) > 0 and correct_count < 1:
                raise ValueError("MULTI_SELECT questions must have at least one correct option.")

    def __repr__(self):
        return f"<Question(id={self.id}, subject='{self.subject}', type='{self.question_type}', marks={self.max_marks})>"


class Option(Base):
    __tablename__ = "options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("question_bank.id", ondelete="CASCADE"), nullable=False, index=True)
    option_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    question: Mapped["Question"] = relationship("Question", back_populates="options")

    def __repr__(self):
        return f"<Option(id={self.id}, question_id={self.question_id}, is_correct={self.is_correct})>"
