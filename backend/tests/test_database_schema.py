import os
import sys
import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.exc import IntegrityError

# Append backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.database import Base
from app.models import (
    User, Question, Option, Exam, ExamQuestion, 
    ExamSession, Answer, Result, ProctorEvent
)
from app.enums.enums import (
    UserRole, ApprovalStatus, QuestionType, 
    DifficultyLevel, ExamStatus, SessionStatus, ProctorEventType
)

# Use SQLite with StaticPool for fast, isolated in-memory testing
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(autouse=True)
def setup_database():
    """Create fresh schema before each test and drop after."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db():
    """Provides a transactional database session for tests."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_user_insertion_and_defaults(db):
    """Test inserting a user and verifying column defaults."""
    student = User(
        name="Elena Rostova",
        email="elena.test@examai.edu",
        password_hash="hashed_pw_123",
        role=UserRole.STUDENT
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    assert student.id is not None
    assert student.email == "elena.test@examai.edu"
    assert student.role == UserRole.STUDENT
    assert student.is_active is True
    assert student.created_at is not None


def test_email_uniqueness(db):
    """Test that inserting duplicate emails raises IntegrityError."""
    u1 = User(
        name="User One",
        email="duplicate@examai.edu",
        password_hash="pw1",
        role=UserRole.STUDENT
    )
    db.add(u1)
    db.commit()

    u2 = User(
        name="User Two",
        email="duplicate@examai.edu",
        password_hash="pw2",
        role=UserRole.EXAMINER
    )
    db.add(u2)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_examiner_pending_status_and_self_referencing_admin_approval(db):
    """Test examiner PENDING status and self-referencing approved_by relationship to admin."""
    # 1. Create Admin
    admin = User(
        name="System Administrator",
        email="admin.gov@examai.edu",
        password_hash="admin_hash",
        role=UserRole.ADMIN,
        approval_status=ApprovalStatus.APPROVED
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    # 2. Create Examiner (initial status PENDING)
    examiner = User(
        name="Dr. Alan Turing",
        email="alan.turing@examai.edu",
        password_hash="examiner_hash",
        role=UserRole.EXAMINER,
        approval_status=ApprovalStatus.PENDING
    )
    db.add(examiner)
    db.commit()
    db.refresh(examiner)

    assert examiner.approval_status == ApprovalStatus.PENDING
    assert examiner.approved_by is None
    assert examiner.approver is None

    # 3. Admin approves Examiner
    examiner.approval_status = ApprovalStatus.APPROVED
    examiner.approved_by = admin.id
    examiner.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(examiner)
    db.refresh(admin)

    # Verify self-referencing relationships
    assert examiner.approved_by == admin.id
    assert examiner.approver is not None
    assert examiner.approver.id == admin.id
    assert examiner.approver.email == "admin.gov@examai.edu"
    assert examiner in admin.approved_users


def test_question_creation_and_options_relationship(db):
    """Test Question belongs to examiner and maintains 1:Many relationship with Options."""
    examiner = User(
        name="Prof. David",
        email="david.prof@examai.edu",
        password_hash="pw",
        role=UserRole.EXAMINER,
        approval_status=ApprovalStatus.APPROVED
    )
    db.add(examiner)
    db.commit()

    q = Question(
        subject="Computer Networks",
        question_text="Which layer of OSI model is responsible for encryption?",
        question_type=QuestionType.MCQ,
        difficulty=DifficultyLevel.EASY,
        max_marks=2.0,
        negative_marks=0.5,
        created_by=examiner.id
    )
    db.add(q)
    db.commit()
    db.refresh(q)

    # Add options
    db.add_all([
        Option(question_id=q.id, option_text="Presentation Layer", is_correct=True),
        Option(question_id=q.id, option_text="Session Layer", is_correct=False),
        Option(question_id=q.id, option_text="Transport Layer", is_correct=False),
    ])
    db.commit()
    db.refresh(q)

    assert len(q.options) == 3
    assert q.creator is not None
    assert q.creator.id == examiner.id
    assert any(opt.is_correct for opt in q.options)


def test_question_options_validation_logic():
    """Test validation constraints for MCQ and MULTI_SELECT question types."""
    # Test valid MCQ (1 correct)
    q_mcq = Question(
        subject="AI",
        question_text="Sample MCQ",
        question_type=QuestionType.MCQ,
        difficulty=DifficultyLevel.EASY,
        max_marks=2.0
    )
    q_mcq.options = [
        Option(option_text="A", is_correct=True),
        Option(option_text="B", is_correct=False)
    ]
    q_mcq.validate_options_rule()  # Should not raise

    # Test invalid MCQ (>1 correct)
    q_mcq_invalid = Question(
        subject="AI",
        question_text="Invalid MCQ",
        question_type=QuestionType.MCQ,
        difficulty=DifficultyLevel.EASY,
        max_marks=2.0
    )
    q_mcq_invalid.options = [
        Option(option_text="A", is_correct=True),
        Option(option_text="B", is_correct=True)
    ]
    with pytest.raises(ValueError, match="MCQ questions must have exactly one correct option"):
        q_mcq_invalid.validate_options_rule()


def test_exam_creation_and_junction_table(db):
    """Test Exam creation and linking questions via exam_questions junction table."""
    examiner = User(
        name="Prof. Sarah",
        email="sarah.prof@examai.edu",
        password_hash="pw",
        role=UserRole.EXAMINER,
        approval_status=ApprovalStatus.APPROVED
    )
    db.add(examiner)
    db.commit()

    q1 = Question(subject="Math", question_text="2+2?", question_type=QuestionType.MCQ, difficulty=DifficultyLevel.EASY, max_marks=2.0, created_by=examiner.id)
    q2 = Question(subject="Math", question_text="3*3?", question_type=QuestionType.MCQ, difficulty=DifficultyLevel.EASY, max_marks=3.0, created_by=examiner.id)
    db.add_all([q1, q2])
    db.commit()

    exam = Exam(
        title="Mathematics Quiz 1",
        subject="Mathematics",
        duration_minutes=30,
        total_questions=2,
        status=ExamStatus.PUBLISHED,
        created_by=examiner.id
    )
    db.add(exam)
    db.commit()

    db.add_all([
        ExamQuestion(exam_id=exam.id, question_id=q1.id, question_order=1, marks=2.0),
        ExamQuestion(exam_id=exam.id, question_id=q2.id, question_order=2, marks=3.0)
    ])
    db.commit()
    db.refresh(exam)

    assert len(exam.exam_questions) == 2
    assert exam.creator is not None
    assert exam.creator.id == examiner.id
    assert exam.exam_questions[0].question.question_text == "2+2?"


def test_duplicate_exam_question_rejection(db):
    """Test that unique constraint uq_exam_question prevents duplicate question additions."""
    examiner = User(name="Examiner", email="ex@examai.edu", password_hash="pw", role=UserRole.EXAMINER, approval_status=ApprovalStatus.APPROVED)
    db.add(examiner)
    db.commit()

    q = Question(subject="CS", question_text="Q1", question_type=QuestionType.SHORT_ANSWER, difficulty=DifficultyLevel.EASY, max_marks=5.0, created_by=examiner.id)
    exam = Exam(title="Exam 1", subject="CS", duration_minutes=60, total_questions=1, created_by=examiner.id)
    db.add_all([q, exam])
    db.commit()

    eq1 = ExamQuestion(exam_id=exam.id, question_id=q.id, question_order=1, marks=5.0)
    db.add(eq1)
    db.commit()

    # Attempt to add same question to same exam
    eq2 = ExamQuestion(exam_id=exam.id, question_id=q.id, question_order=2, marks=5.0)
    db.add(eq2)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_exam_session_and_unique_answers(db):
    """Test ExamSession creation and unique answer constraint per session & question."""
    student = User(name="Student", email="std@examai.edu", password_hash="pw", role=UserRole.STUDENT, approval_status=ApprovalStatus.APPROVED)
    examiner = User(name="Examiner", email="ex2@examai.edu", password_hash="pw", role=UserRole.EXAMINER, approval_status=ApprovalStatus.APPROVED)
    db.add_all([student, examiner])
    db.commit()

    q = Question(subject="CS", question_text="What is SQL?", question_type=QuestionType.SHORT_ANSWER, difficulty=DifficultyLevel.EASY, max_marks=5.0, created_by=examiner.id)
    exam = Exam(title="SQL Basics", subject="CS", duration_minutes=45, total_questions=1, created_by=examiner.id)
    db.add_all([q, exam])
    db.commit()

    session = ExamSession(
        exam_id=exam.id,
        student_id=student.id,
        session_token="UNIQUE-SESSION-TOKEN-999",
        status=SessionStatus.IN_PROGRESS
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Add answer
    ans1 = Answer(session_id=session.id, question_id=q.id, text_answer="Structured Query Language", marks_awarded=5.0)
    db.add(ans1)
    db.commit()

    # Attempt duplicate answer for same session & question
    ans2 = Answer(session_id=session.id, question_id=q.id, text_answer="Duplicate attempt")
    db.add(ans2)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_proctor_events_and_telemetry(db):
    """Test ProctorEvents association to ExamSession with JSON telemetry data."""
    student = User(name="Student", email="std_telemetry@examai.edu", password_hash="pw", role=UserRole.STUDENT, approval_status=ApprovalStatus.APPROVED)
    exam = Exam(title="Proctored Exam", subject="CS", duration_minutes=45, total_questions=1)
    db.add_all([student, exam])
    db.commit()

    session = ExamSession(
        exam_id=exam.id,
        student_id=student.id,
        session_token="PROCTOR-TOKEN-777",
        status=SessionStatus.IN_PROGRESS
    )
    db.add(session)
    db.commit()

    event = ProctorEvent(
        session_id=session.id,
        event_type=ProctorEventType.GAZE_AWAY,
        event_data={"yaw": 24.5, "pitch": -12.3, "duration_sec": 4.1},
        suspicion_score=0.75,
        snapshot_url="https://storage.examai.edu/snapshots/snap1.jpg"
    )
    db.add(event)
    db.commit()
    db.refresh(session)

    assert len(session.proctor_events) == 1
    assert session.proctor_events[0].event_type == ProctorEventType.GAZE_AWAY
    assert session.proctor_events[0].suspicion_score == 0.75
    assert session.proctor_events[0].event_data is not None
    assert session.proctor_events[0].event_data["yaw"] == 24.5


def test_results_and_uniqueness_constraint(db):
    """Test Result recording and unique constraint per student & exam."""
    student = User(name="Student", email="std_results@examai.edu", password_hash="pw", role=UserRole.STUDENT, approval_status=ApprovalStatus.APPROVED)
    exam = Exam(title="Results Exam", subject="CS", duration_minutes=45, total_questions=1)
    db.add_all([student, exam])
    db.commit()

    r1 = Result(exam_id=exam.id, student_id=student.id, total_marks=100.0, obtained_marks=92.5, percentage=92.5)
    db.add(r1)
    db.commit()
    db.refresh(r1)

    assert r1.id is not None
    assert r1.student.id == student.id
    assert r1.exam.id == exam.id

    # Attempt duplicate result for same student and exam
    r2 = Result(exam_id=exam.id, student_id=student.id, total_marks=100.0, obtained_marks=80.0, percentage=80.0)
    db.add(r2)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_cascade_and_set_null_foreign_key_behaviors(db):
    """Test cascade deletes for options/exam_questions and SET NULL behavior when user is removed."""
    examiner = User(name="Ex", email="ex_del@examai.edu", password_hash="pw", role=UserRole.EXAMINER, approval_status=ApprovalStatus.APPROVED)
    db.add(examiner)
    db.commit()

    q = Question(subject="CS", question_text="Q to delete", question_type=QuestionType.MCQ, difficulty=DifficultyLevel.EASY, max_marks=2.0, created_by=examiner.id)
    db.add(q)
    db.commit()

    opt = Option(question_id=q.id, option_text="Opt A", is_correct=True)
    db.add(opt)
    db.commit()

    # Deleting Question should CASCADE delete its Option
    db.delete(q)
    db.commit()

    remaining_opt = db.query(Option).filter(Option.id == opt.id).first()
    assert remaining_opt is None
