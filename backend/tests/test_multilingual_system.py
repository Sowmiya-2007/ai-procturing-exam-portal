import os
import sys
from pathlib import Path

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.exam import Exam, ExamQuestion
from app.models.question import Question, Option
from app.models.session import ExamSession
from app.enums.enums import UserRole, ApprovalStatus, ExamStatus, QuestionType, DifficultyLevel
from services.translation_service import (
    SUPPORTED_LANGUAGES, LANGUAGE_NAMES, CORE_CS_DICTIONARY,
    translate_text, translate_to_all_languages,
    auto_translate_exam_payload, auto_translate_question_payload,
    _protect_technical_terms, _restore_technical_terms
)

from main import app
from app.core.database import get_db

@pytest.fixture(autouse=True)
def clean_app_overrides():
    Base.metadata.create_all(bind=engine)
    if get_db in app.dependency_overrides:
        del app.dependency_overrides[get_db]
    yield
    if get_db in app.dependency_overrides:
        del app.dependency_overrides[get_db]

@pytest.fixture(scope="function")
def db():
    session = SessionLocal()
    yield session
    session.close()

def test_supported_languages_configuration():
    """Verify exactly the 6 required languages are configured with English default."""
    assert SUPPORTED_LANGUAGES == ["en", "ta", "hi", "te", "ml", "kn"]
    assert len(SUPPORTED_LANGUAGES) == 6
    assert "en" in SUPPORTED_LANGUAGES
    assert "ta" in SUPPORTED_LANGUAGES
    assert "hi" in SUPPORTED_LANGUAGES
    assert "te" in SUPPORTED_LANGUAGES
    assert "ml" in SUPPORTED_LANGUAGES
    assert "kn" in SUPPORTED_LANGUAGES

def test_technical_term_protection():
    """Verify programming keywords, code blocks, Big-O notation are preserved."""
    sample = "What is the time complexity of O(log N) in Java using System.out.println() and SELECT * FROM table?"
    masked, token_map = _protect_technical_terms(sample)
    
    assert "O(log N)" not in masked or len(token_map) > 0
    restored = _restore_technical_terms(masked, token_map)
    assert "O(log N)" in restored
    assert "System.out.println" in restored
    assert "SELECT" in restored
    assert "FROM" in restored

def test_curated_dictionary_translations():
    """Verify curated domain dictionary provides instant high-accuracy translations."""
    for term, trans_dict in CORE_CS_DICTIONARY.items():
        for lang in ["ta", "hi", "te", "ml", "kn"]:
            if lang in trans_dict:
                result = translate_text(term, source_lang="en", target_lang=lang)
                assert result == trans_dict[lang]

def test_translate_to_all_languages():
    """Verify concurrent translation to all 6 supported languages returns complete dict."""
    res = translate_to_all_languages("Computer Science")
    assert "en" in res
    assert "ta" in res
    assert "hi" in res
    assert "te" in res
    assert "ml" in res
    assert "kn" in res
    assert res["en"] == "Computer Science"
    assert len(res["ta"]) > 0
    assert len(res["hi"]) > 0

def test_auto_translate_exam_payload():
    """Verify auto-translation enriches exam creation payload with all 6 languages."""
    payload = {
        "title": "Data Structures Comprehensive Exam 2026",
        "subject": "Computer Science",
        "description": "Midterm assessment on trees, graphs, and algorithm complexity.",
        "duration_minutes": 60
    }
    enriched = auto_translate_exam_payload(payload)
    for lang in ["en", "ta", "hi", "te", "ml", "kn"]:
        assert f"title_{lang}" in enriched
        assert f"subject_{lang}" in enriched
        assert f"description_{lang}" in enriched
        assert enriched[f"title_{lang}"] is not None

def test_auto_translate_question_payload_and_option_preservation():
    """Verify question auto-translation preserves options ordering and correct answer mappings."""
    payload = {
        "question_text": "Which data structure operates on a First-In-First-Out (FIFO) basis?",
        "question_type": "MCQ",
        "subject": "Data Structures",
        "options": [
            {"option_text": "Stack", "is_correct": False},
            {"option_text": "Queue", "is_correct": True},
            {"option_text": "Tree", "is_correct": False},
            {"option_text": "Graph", "is_correct": False}
        ]
    }
    enriched = auto_translate_question_payload(payload)
    
    # Check question text in all languages
    for lang in ["en", "ta", "hi", "te", "ml", "kn"]:
        assert f"question_text_{lang}" in enriched

    # Verify options count, order, and is_correct flags remain identical
    assert len(enriched["options"]) == 4
    assert enriched["options"][0]["is_correct"] is False
    assert enriched["options"][1]["is_correct"] is True
    assert enriched["options"][2]["is_correct"] is False
    assert enriched["options"][3]["is_correct"] is False

    # Check multilingual options text
    for opt in enriched["options"]:
        for lang in ["en", "ta", "hi", "te", "ml", "kn"]:
            assert f"option_text_{lang}" in opt
            assert opt[f"option_text_{lang}"] is not None

def test_database_models_multilingual_columns(db):
    """Verify database models have the required columns for all 6 languages."""
    # Check Exam columns
    for lang in ["en", "ta", "hi", "te", "ml", "kn"]:
        assert hasattr(Exam, f"title_{lang}")
        assert hasattr(Exam, f"subject_{lang}")
        assert hasattr(Exam, f"description_{lang}")
        assert hasattr(Exam, f"instructions_{lang}")

    # Check Question columns
    for lang in ["en", "ta", "hi", "te", "ml", "kn"]:
        assert hasattr(Question, f"question_text_{lang}")
        assert hasattr(Question, f"explanation_{lang}")
        assert hasattr(Question, f"model_answer_{lang}")

    # Check Option columns
    for lang in ["en", "ta", "hi", "te", "ml", "kn"]:
        assert hasattr(Option, f"option_text_{lang}")

def test_missing_translation_graceful_fallback():
    """Verify fallback to original text if language translation is missing or unconfigured."""
    text = "Unique bespoke technical phrase xyz123"
    result = translate_text(text, source_lang="en", target_lang="unsupported_lang")
    assert result == text

from fastapi.testclient import TestClient
from main import app
from auth import hash_password, create_access_token

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def auth_student(db):
    user = db.query(User).filter(User.email == "student.multilingual@test.edu").first()
    if not user:
        user = User(
            name="Multilingual Student",
            email="student.multilingual@test.edu",
            register_number="REG2026MULTI01",
            department="Computer Science",
            year="4th Year",
            password_hash=hash_password("Pass@123"),
            role=UserRole.STUDENT,
            approval_status=ApprovalStatus.APPROVED,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    token = create_access_token(data={"sub": str(user.id), "role": user.role.value, "user_id": user.id})
    return {"user": user, "token": token, "headers": {"Authorization": f"Bearer {token}"}}

@pytest.fixture
def sample_multilingual_exam(db, auth_student):
    examiner = db.query(User).filter(User.role == UserRole.EXAMINER).first()
    if not examiner:
        examiner = User(
            name="Prof. Multilingual",
            email="examiner.multi@test.edu",
            password_hash=hash_password("Pass@123"),
            role=UserRole.EXAMINER,
            approval_status=ApprovalStatus.APPROVED,
            is_active=True
        )
        db.add(examiner)
        db.commit()
        db.refresh(examiner)

    q = Question(
        question_text="What is a queue data structure?",
        question_text_en="What is a queue data structure?",
        question_text_ta="வரிசை தரவு அமைப்பு என்றால் என்ன?",
        question_text_hi="कतार (Queue) डेटा संरचना क्या है?",
        question_text_te="క్యూ డేటా స్ట్రక్చర్ అంటే ఏమిటి?",
        question_text_ml="ഒരു ക്യൂ ഡാറ്റാ ഘടന എന്താണ്?",
        question_text_kn="ಕ್ಯೂ ಡೇಟಾ ರಚನೆ ಎಂದರೇನು?",
        question_type=QuestionType.MCQ,
        subject="Computer Science",
        difficulty=DifficultyLevel.EASY,
        max_marks=2.0,
        model_answer="Queue is FIFO",
        model_answer_ta="வரிசை FIFO ஆகும்",
        model_answer_hi="कतार FIFO है",
        model_answer_te="క్యూ FIFO",
        model_answer_ml="ക്യൂ FIFO ആണ്",
        model_answer_kn="ಕ್ಯೂ FIFO ಆಗಿದೆ",
        created_by=examiner.id
    )
    db.add(q)
    db.commit()
    db.refresh(q)

    opt1 = Option(
        question_id=q.id,
        option_text="FIFO (First In First Out)",
        option_text_en="FIFO (First In First Out)",
        option_text_ta="FIFO (முதலில் வருபவர் முதலில் வெளியேறுவார்)",
        option_text_hi="FIFO (पहले आओ पहले पाओ)",
        option_text_te="FIFO (మొదట వచ్చినది మొదట వెళ్తుంది)",
        option_text_ml="FIFO (ആദ്യം വരുന്നത് ആദ്യം പോകുന്നു)",
        option_text_kn="FIFO (ಮೊದಲು ಬಂದದ್ದು ಮೊದಲು ಹೊರಹೋಗುತ್ತದೆ)",
        is_correct=True
    )
    opt2 = Option(
        question_id=q.id,
        option_text="LIFO (Last In First Out)",
        option_text_en="LIFO (Last In First Out)",
        option_text_ta="LIFO (கடைசியில் வருபவர் முதலில் வெளியேறுவார்)",
        option_text_hi="LIFO (अंतिम आओ पहले पाओ)",
        option_text_te="LIFO (చివరిగా వచ్చినది మొదట వెళ్తుంది)",
        option_text_ml="LIFO (അവസാനം വരുന്നത് ആദ്യം പോകുന്നു)",
        option_text_kn="LIFO (ಕೊನೆಯದಾಗಿ ಬಂದದ್ದು ಮೊದಲು ಹೊರಹೋಗುತ್ತದೆ)",
        is_correct=False
    )
    db.add_all([opt1, opt2])
    db.commit()
    db.refresh(opt1)
    db.refresh(opt2)

    exam = Exam(
        title="Data Structures Multilingual Test",
        title_en="Data Structures Multilingual Test",
        title_ta="தரவு கட்டமைப்புகள் பன்மொழி தேர்வு",
        title_hi="डेटा संरचनाएं बहुभाषी परीक्षा",
        title_te="డేటా నిర్మాణాలు బహుభాషా పరీక్ష",
        title_ml="ഡാറ്റാ സ്ട്രക്ചേഴ്സ് ബഹുഭാഷാ പരീക്ഷ",
        title_kn="ಡೇಟಾ ರಚನೆಗಳು ಬಹುಭಾಷಾ ಪರೀಕ್ಷೆ",
        subject="Computer Science",
        subject_ta="கணினி அறிவியல்",
        subject_hi="कंप्यूटर विज्ञान",
        subject_te="కంప్యూటర్ సైన్స్",
        subject_ml="കമ്പ്യൂട്ടർ സയൻസ്",
        subject_kn="ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್",
        description="Comprehensive multilingual test",
        description_ta="விரிவான பன்மொழி தேர்வு",
        description_hi="व्यापक बहुभाषी परीक्षा",
        description_te="సమగ్ర బహుభాషా పరీక్ష",
        description_ml="വിപുலമായ ബഹുഭാഷാ പരീക്ഷ",
        description_kn="ಸಮಗ್ರ ಬಹುಭಾಷಾ ಪರೀಕ್ಷೆ",
        instructions_en="Answer all questions carefully.",
        instructions_ta="அனைத்து கேள்விகளுக்கும் கவனமாக பதிலளிக்கவும்.",
        instructions_hi="सभी प्रश्नों के उत्तर ध्यानपूर्वक दें।",
        instructions_te="అన్ని ప్రశ్నలకు జాగ్రత్తగా సమాధానం ఇవ్వండి.",
        instructions_ml="എല്ലാ ചോദ്യങ്ങൾക്കും ശ്രദ്ധാപൂർവ്വം ഉത്തരം നൽകുക.",
        instructions_kn="ಎಲ್ಲಾ ಪ್ರಶ್ನೆಗಳಿಗೆ ಎಚ್ಚರಿಕೆಯಿಂದ ಉತ್ತರಿಸಿ.",
        duration_minutes=30,
        total_questions=1,
        passing_marks=1.0,
        status=ExamStatus.PUBLISHED,
        created_by=examiner.id
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)

    eq = ExamQuestion(exam_id=exam.id, question_id=q.id, question_order=1, marks=2.0)
    db.add(eq)
    db.commit()

    return {"exam": exam, "question": q, "opt1": opt1, "opt2": opt2}

def test_api_student_dashboard_multilingual(client, auth_student, sample_multilingual_exam):
    """Verify Student Dashboard API returns localized exam title, subject, and description for all 6 languages."""
    headers = auth_student["headers"]
    
    # Test Tamil
    res_ta = client.get("/api/student/dashboard?language=ta", headers=headers)
    assert res_ta.status_code == 200
    data_ta = res_ta.json()
    exam_ta = next((e for e in data_ta.get("upcoming_exams", []) if e["id"] == sample_multilingual_exam["exam"].id), None)
    assert exam_ta is not None
    assert exam_ta["title"] == "தரவு கட்டமைப்புகள் பன்மொழி தேர்வு"
    assert exam_ta["subject"] == "கணினி அறிவியல்"

    # Test Hindi
    res_hi = client.get("/api/student/dashboard?language=hi", headers=headers)
    assert res_hi.status_code == 200
    data_hi = res_hi.json()
    exam_hi = next((e for e in data_hi.get("upcoming_exams", []) if e["id"] == sample_multilingual_exam["exam"].id), None)
    assert exam_hi is not None
    assert exam_hi["title"] == "डेटा संरचनाएं बहुभाषी परीक्षा"
    assert exam_hi["subject"] == "कंप्यूटर विज्ञान"

    # Test Telugu
    res_te = client.get("/api/student/dashboard?language=te", headers=headers)
    assert res_te.status_code == 200
    data_te = res_te.json()
    exam_te = next((e for e in data_te.get("upcoming_exams", []) if e["id"] == sample_multilingual_exam["exam"].id), None)
    assert exam_te is not None
    assert exam_te["title"] == "డేటా నిర్మాణాలు బహుభాషా పరీక్ష"

    # Test Malayalam
    res_ml = client.get("/api/student/dashboard?language=ml", headers=headers)
    assert res_ml.status_code == 200
    data_ml = res_ml.json()
    exam_ml = next((e for e in data_ml.get("upcoming_exams", []) if e["id"] == sample_multilingual_exam["exam"].id), None)
    assert exam_ml is not None
    assert exam_ml["title"] == "ഡാറ്റാ സ്ട്രക്ചേഴ്സ് ബഹുഭാഷാ പരീക്ഷ"

    # Test Kannada
    res_kn = client.get("/api/student/dashboard?language=kn", headers=headers)
    assert res_kn.status_code == 200
    data_kn = res_kn.json()
    exam_kn = next((e for e in data_kn.get("upcoming_exams", []) if e["id"] == sample_multilingual_exam["exam"].id), None)
    assert exam_kn is not None
    assert exam_kn["title"] == "ಡೇಟಾ ರಚನೆಗಳು ಬಹುಭಾಷಾ ಪರೀಕ್ಷೆ"

def test_api_exam_session_multilingual_lifecycle(client, db, auth_student, sample_multilingual_exam):
    """Verify complete Exam Hall lifecycle in multiple languages: start session, active session, navigation, and results."""
    headers = auth_student["headers"]
    exam_id = sample_multilingual_exam["exam"].id
    
    # 1. Start Exam in Tamil
    start_res = client.post(
        f"/api/exams/{exam_id}/start?language=ta",
        json={},
        headers=headers
    )
    assert start_res.status_code == 200
    session_data = start_res.json()
    session_token = session_data["session_token"]
    session_id = session_data["session_id"]
    
    # Verify Tamil exam metadata and questions
    assert session_data["exam_title"] == "தரவு கட்டமைப்புகள் பன்மொழி தேர்வு"
    assert session_data["exam_subject"] == "கணினி அறிவியல்"
    assert len(session_data["questions"]) >= 1
    q_data = session_data["questions"][0]
    assert q_data["question_text"] == "வரிசை தரவு அமைப்பு என்றால் என்ன?"
    assert len(q_data["options"]) == 2
    # Verify options in Tamil
    assert any(opt["option_text"] == "FIFO (முதலில் வருபவர் முதலில் வெளியேறுவார்)" for opt in q_data["options"])
    
    # 2. Student switches language mid-session to Hindi (Active session query in Hindi)
    active_res = client.get(f"/api/exams/sessions/{session_token}/active?language=hi", headers=headers)
    assert active_res.status_code == 200
    active_data = active_res.json()
    assert active_data["exam_title"] == "डेटा संरचनाएं बहुभाषी परीक्षा"
    q_hi = active_data["questions"][0]
    assert q_hi["question_text"] == "कतार (Queue) डेटा संरचना क्या है?"
    assert any(opt["option_text"] == "FIFO (पहले आओ पहले पाओ)" for opt in q_hi["options"])

    # 3. Save Answer (Option 1 - FIFO)
    opt1_id = sample_multilingual_exam["opt1"].id
    q_id = sample_multilingual_exam["question"].id
    ans_res = client.post(
        f"/api/exams/sessions/{session_token}/answers",
        json={"question_id": q_id, "selected_option_ids": [opt1_id]},
        headers=headers
    )
    assert ans_res.status_code == 200

    # 4. Submit Exam in Telugu
    submit_res = client.post(
        f"/api/exams/sessions/{session_token}/submit?language=te",
        json={"language": "te"},
        headers=headers
    )
    assert submit_res.status_code == 200
    submit_data = submit_res.json()
    assert submit_data["status"].upper() == "SUBMITTED"
    assert submit_data["passed"] is True

    # Approve result so detailed breakdown is unmasked for student
    from app.models.result import Result
    res_obj = db.query(Result).filter(Result.session_id == session_id).first()
    if res_obj:
        res_obj.is_approved = True
        db.commit()

    # 5. Fetch Session Result in Kannada
    res_kn = client.get(f"/api/exams/sessions/{session_token}/result?language=kn", headers=headers)
    assert res_kn.status_code == 200
    result_data = res_kn.json()
    assert result_data["exam_title"] == "ಡೇಟಾ ರಚನೆಗಳು ಬಹುಭಾಷಾ ಪರೀಕ್ಷೆ"
    assert result_data["exam_subject"] == "ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್"
    assert len(result_data["question_breakdown"]) >= 1
    bd = result_data["question_breakdown"][0]
    assert bd["question_text"] == "ಕ್ಯೂ ಡೇಟಾ ರಚನೆ ಎಂದರೇನು?"
    assert bd["model_answer"] == "ಕ್ಯೂ FIFO ಆಗಿದೆ"
    assert any(opt["option_text"] == "FIFO (ಮೊದಲು ಬಂದದ್ದು ಮೊದಲು ಹೊರಹೋಗುತ್ತದೆ)" for opt in bd["options"])



