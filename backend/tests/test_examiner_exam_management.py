import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.database import Base, get_db
from app.models.user import User
from app.models.exam import Exam, ExamQuestion
from app.models.question import Question
from app.enums.enums import UserRole, ApprovalStatus, ExamStatus, QuestionType, DifficultyLevel
from auth import create_access_token, hash_password
from main import app

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    return TestClient(app)


def test_examiner_can_delete_any_exam(setup_db, client):
    """Verify that an approved examiner can delete any exam created by other examiners or admin."""
    db = setup_db
    # Examiner 1 (creator)
    examiner1 = User(
        name="Examiner One",
        email="examiner1_exam@examai.edu",
        password_hash=hash_password("pw123"),
        role=UserRole.EXAMINER,
        approval_status=ApprovalStatus.APPROVED
    )
    # Examiner 2 (deleter)
    examiner2 = User(
        name="Examiner Two",
        email="examiner2_exam@examai.edu",
        password_hash=hash_password("pw123"),
        role=UserRole.EXAMINER,
        approval_status=ApprovalStatus.APPROVED
    )
    db.add_all([examiner1, examiner2])
    db.commit()

    # Exam created by Examiner 1
    exam = Exam(
        title="Midterm Assessment",
        subject="Computer Science",
        duration_minutes=60,
        status=ExamStatus.DRAFT,
        created_by=examiner1.id
    )
    db.add(exam)
    db.commit()

    # Examiner 2 logs in and deletes Examiner 1's exam
    token = create_access_token(data={"sub": str(examiner2.id), "role": examiner2.role.value})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.delete(f"/api/exams/{exam.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Check exam deleted from DB
    deleted_exam = db.query(Exam).filter(Exam.id == exam.id).first()
    assert deleted_exam is None


def test_examiner_can_delete_system_or_unassigned_exam(setup_db, client):
    """Verify that an approved examiner can delete seeded exams with created_by=None."""
    db = setup_db
    examiner = User(
        name="Examiner Three",
        email="examiner3_exam@examai.edu",
        password_hash=hash_password("pw123"),
        role=UserRole.EXAMINER,
        approval_status=ApprovalStatus.APPROVED
    )
    db.add(examiner)
    db.commit()

    exam = Exam(
        title="Seeded Final Assessment",
        subject="Mathematics",
        duration_minutes=90,
        status=ExamStatus.DRAFT,
        created_by=None
    )
    db.add(exam)
    db.commit()

    token = create_access_token(data={"sub": str(examiner.id), "role": examiner.role.value})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.delete(f"/api/exams/{exam.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["success"] is True

    deleted_exam = db.query(Exam).filter(Exam.id == exam.id).first()
    assert deleted_exam is None


def test_student_cannot_delete_exam(setup_db, client):
    """Verify students cannot delete exams."""
    db = setup_db
    student = User(
        name="Student Exam",
        email="student_exam_del@examai.edu",
        password_hash=hash_password("pw123"),
        role=UserRole.STUDENT,
        approval_status=ApprovalStatus.APPROVED
    )
    exam = Exam(
        title="Physics Quiz",
        subject="Physics",
        duration_minutes=30,
        status=ExamStatus.DRAFT
    )
    db.add_all([student, exam])
    db.commit()

    token = create_access_token(data={"sub": str(student.id), "role": student.role.value})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.delete(f"/api/exams/{exam.id}", headers=headers)
    assert response.status_code == 403
