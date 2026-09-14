"""create initial examination platform schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-01 22:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Enum instances
user_role_enum = sa.Enum("STUDENT", "EXAMINER", "ADMIN", name="user_role_enum")
approval_status_enum = sa.Enum("PENDING", "APPROVED", "REJECTED", name="approval_status_enum")
question_type_enum = sa.Enum("MCQ", "MULTI_SELECT", "SHORT_ANSWER", "LONG_ANSWER", "IMAGE_UPLOAD", name="question_type_enum")
difficulty_level_enum = sa.Enum("EASY", "MEDIUM", "HARD", name="difficulty_level_enum")
exam_status_enum = sa.Enum("DRAFT", "PUBLISHED", "CLOSED", name="exam_status_enum")
session_status_enum = sa.Enum("NOT_STARTED", "IN_PROGRESS", "SUBMITTED", name="session_status_enum")


def upgrade() -> None:
    # 1. users Table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role_enum, nullable=False),
        sa.Column("approval_status", approval_status_enum, nullable=False),
        sa.Column("approved_by", sa.Integer(), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email")
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"], unique=False)
    op.create_index("ix_users_approval_status", "users", ["approval_status"], unique=False)

    # 2. question_bank Table
    op.create_table(
        "question_bank",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("subject", sa.String(length=150), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("question_type", question_type_enum, nullable=False),
        sa.Column("difficulty", difficulty_level_enum, nullable=False),
        sa.Column("expected_answer", sa.Text(), nullable=True),
        sa.Column("model_answer", sa.Text(), nullable=True),
        sa.Column("max_marks", sa.Float(), nullable=False),
        sa.Column("negative_marks", sa.Float(), server_default=sa.text("0.0"), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index("ix_question_bank_subject", "question_bank", ["subject"], unique=False)
    op.create_index("ix_question_bank_question_type", "question_bank", ["question_type"], unique=False)
    op.create_index("ix_question_bank_difficulty", "question_bank", ["difficulty"], unique=False)
    op.create_index("ix_question_bank_created_by", "question_bank", ["created_by"], unique=False)

    # 3. options Table
    op.create_table(
        "options",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("option_text", sa.Text(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["question_bank.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index("ix_options_question_id", "options", ["question_id"], unique=False)

    # 4. exams Table
    op.create_table(
        "exams",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("total_questions", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("randomization_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("negative_marking_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("default_negative_marks", sa.Float(), server_default=sa.text("0.0"), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("proctoring_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("webcam_monitoring_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("gaze_tracking_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("gaze_sensitivity_threshold", sa.Float(), nullable=True),
        sa.Column("max_tab_switch_warnings", sa.Integer(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("status", exam_status_enum, server_default=sa.text("'DRAFT'"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index("ix_exams_subject", "exams", ["subject"], unique=False)
    op.create_index("ix_exams_status", "exams", ["status"], unique=False)
    op.create_index("ix_exams_created_by", "exams", ["created_by"], unique=False)

    # 5. exam_questions Table
    op.create_table(
        "exam_questions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("exam_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("question_order", sa.Integer(), nullable=True),
        sa.Column("marks", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["question_bank.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("exam_id", "question_id", name="uq_exam_question")
    )
    op.create_index("ix_exam_questions_exam_id", "exam_questions", ["exam_id"], unique=False)
    op.create_index("ix_exam_questions_question_id", "exam_questions", ["question_id"], unique=False)

    # 6. exam_sessions Table
    op.create_table(
        "exam_sessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("exam_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("session_token", sa.String(length=255), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", session_status_enum, server_default=sa.text("'NOT_STARTED'"), nullable=False),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_token")
    )
    op.create_index("ix_exam_sessions_exam_id", "exam_sessions", ["exam_id"], unique=False)
    op.create_index("ix_exam_sessions_student_id", "exam_sessions", ["student_id"], unique=False)
    op.create_index("ix_exam_sessions_session_token", "exam_sessions", ["session_token"], unique=True)

    # 7. answers Table
    op.create_table(
        "answers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("selected_option_ids", sa.JSON(), nullable=True),
        sa.Column("text_answer", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("marks_awarded", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["exam_sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["question_bank.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", "question_id", name="uq_session_question_answer")
    )
    op.create_index("ix_answers_session_id", "answers", ["session_id"], unique=False)
    op.create_index("ix_answers_question_id", "answers", ["question_id"], unique=False)

    # 8. results Table
    op.create_table(
        "results",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("exam_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("total_marks", sa.Float(), nullable=False),
        sa.Column("obtained_marks", sa.Float(), nullable=False),
        sa.Column("percentage", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("exam_id", "student_id", name="uq_exam_student_result")
    )
    op.create_index("ix_results_exam_id", "results", ["exam_id"], unique=False)
    op.create_index("ix_results_student_id", "results", ["student_id"], unique=False)

    # 9. proctor_events Table
    op.create_table(
        "proctor_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("event_data", sa.JSON(), nullable=True),
        sa.Column("suspicion_score", sa.Float(), server_default=sa.text("0.0"), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("snapshot_url", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["exam_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index("ix_proctor_events_session_id", "proctor_events", ["session_id"], unique=False)
    op.create_index("ix_proctor_events_timestamp", "proctor_events", ["timestamp"], unique=False)


def downgrade() -> None:
    op.drop_table("proctor_events")
    op.drop_table("results")
    op.drop_table("answers")
    op.drop_table("exam_sessions")
    op.drop_table("exam_questions")
    op.drop_table("exams")
    op.drop_table("options")
    op.drop_table("question_bank")
    op.drop_table("users")
    
    # Drop Enums
    session_status_enum.drop(op.get_bind(), checkfirst=True)
    exam_status_enum.drop(op.get_bind(), checkfirst=True)
    difficulty_level_enum.drop(op.get_bind(), checkfirst=True)
    question_type_enum.drop(op.get_bind(), checkfirst=True)
    approval_status_enum.drop(op.get_bind(), checkfirst=True)
    user_role_enum.drop(op.get_bind(), checkfirst=True)
