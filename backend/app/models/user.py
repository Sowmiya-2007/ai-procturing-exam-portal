from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.enums.enums import UserRole, ApprovalStatus

if TYPE_CHECKING:
    from app.models.question import Question
    from app.models.exam import Exam
    from app.models.session import ExamSession
    from app.models.result import Result

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole, name="user_role_enum"), default=UserRole.STUDENT, nullable=False, index=True)
    approval_status: Mapped[ApprovalStatus] = mapped_column(SQLEnum(ApprovalStatus, name="approval_status_enum"), default=ApprovalStatus.PENDING, nullable=False, index=True)
    
    # Self-referencing Admin Approval relationship
    approved_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    approver: Mapped[Optional["User"]] = relationship(
        "User",
        remote_side="User.id",
        back_populates="approved_users",
        foreign_keys=[approved_by]
    )
    approved_users: Mapped[List["User"]] = relationship(
        "User",
        back_populates="approver",
        foreign_keys=[approved_by]
    )
    questions: Mapped[List["Question"]] = relationship("Question", back_populates="creator", foreign_keys="Question.created_by")
    exams: Mapped[List["Exam"]] = relationship("Exam", back_populates="creator", foreign_keys="Exam.created_by")
    sessions: Mapped[List["ExamSession"]] = relationship("ExamSession", back_populates="student", foreign_keys="ExamSession.student_id")
    results: Mapped[List["Result"]] = relationship("Result", back_populates="student", foreign_keys="Result.student_id")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}', status='{self.approval_status}')>"
