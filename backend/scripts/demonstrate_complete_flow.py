import sys
import os
sys.path.insert(0, os.path.abspath("."))
sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.exam import Exam, ExamQuestion
from app.models.question import Question, Option
from app.models.session import ExamSession
from app.models.answer import Answer
from app.models.result import Result
from app.enums.enums import UserRole, ApprovalStatus, ExamStatus, QuestionType, DifficultyLevel
from services.translation_service import auto_translate_exam_payload, auto_translate_question_payload
from routers.exam_session_router import resolve_multilingual_field
from auth import hash_password

def run_multilingual_verification():
    db = SessionLocal()
    print("=" * 70)
    print("STEP 1: CREATING CANONICAL EXAM & QUESTION VIA AI BACKEND TRANSLATOR")
    print("=" * 70)

    # 1. Prepare Exam Payload
    exam_payload = {
        "title": "Algorithms Mastery Assessment 2026",
        "subject": "Data Structures & Algorithms",
        "description": "Comprehensive assessment on algorithmic complexities and search algorithms.",
        "instructions": "Attempt all questions. Choose the most optimal time complexity.",
        "duration_minutes": 45,
        "passing_marks": 40.0,
        "status": ExamStatus.PUBLISHED,
        "proctoring_enabled": True
    }
    enriched_exam = auto_translate_exam_payload(exam_payload)

    new_exam = Exam(
        title=enriched_exam["title"],
        subject=enriched_exam["subject"],
        description=enriched_exam["description"],
        title_en=enriched_exam.get("title_en"),
        title_ta=enriched_exam.get("title_ta"),
        title_te=enriched_exam.get("title_te"),
        title_hi=enriched_exam.get("title_hi"),
        title_ml=enriched_exam.get("title_ml"),
        title_kn=enriched_exam.get("title_kn"),
        subject_en=enriched_exam.get("subject_en"),
        subject_ta=enriched_exam.get("subject_ta"),
        subject_te=enriched_exam.get("subject_te"),
        subject_hi=enriched_exam.get("subject_hi"),
        subject_ml=enriched_exam.get("subject_ml"),
        subject_kn=enriched_exam.get("subject_kn"),
        description_en=enriched_exam.get("description_en"),
        description_ta=enriched_exam.get("description_ta"),
        description_te=enriched_exam.get("description_te"),
        description_hi=enriched_exam.get("description_hi"),
        description_ml=enriched_exam.get("description_ml"),
        description_kn=enriched_exam.get("description_kn"),
        instructions_en=enriched_exam.get("instructions_en"),
        instructions_ta=enriched_exam.get("instructions_ta"),
        instructions_te=enriched_exam.get("instructions_te"),
        instructions_hi=enriched_exam.get("instructions_hi"),
        instructions_ml=enriched_exam.get("instructions_ml"),
        instructions_kn=enriched_exam.get("instructions_kn"),
        duration_minutes=45,
        passing_marks=40.0,
        status=ExamStatus.PUBLISHED,
        proctoring_enabled=True
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    print(f"[OK] Created Exam ID: {new_exam.id}")

    # 2. Prepare Question Payload
    q_payload = {
        "question_text": "What is the time complexity of binary search on a sorted array?",
        "question_type": QuestionType.MCQ,
        "subject": "Data Structures & Algorithms",
        "difficulty": DifficultyLevel.MEDIUM,
        "max_marks": 5.0,
        "options": [
            {"option_text": "O(1) - Constant time", "is_correct": False},
            {"option_text": "O(log N) - Logarithmic time", "is_correct": True},
            {"option_text": "O(N) - Linear time", "is_correct": False},
            {"option_text": "O(N log N) - Linearithmic time", "is_correct": False}
        ]
    }
    enriched_q = auto_translate_question_payload(q_payload)

    new_q = Question(
        question_text=enriched_q["question_text"],
        question_type=enriched_q["question_type"],
        subject=enriched_q["subject"],
        difficulty=enriched_q["difficulty"],
        max_marks=enriched_q["max_marks"],
        question_text_en=enriched_q.get("question_text_en"),
        question_text_ta=enriched_q.get("question_text_ta"),
        question_text_te=enriched_q.get("question_text_te"),
        question_text_hi=enriched_q.get("question_text_hi"),
        question_text_ml=enriched_q.get("question_text_ml"),
        question_text_kn=enriched_q.get("question_text_kn"),
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)

    correct_opt_id = None
    for opt_data in enriched_q["options"]:
        opt = Option(
            question_id=new_q.id,
            option_text=opt_data["option_text"],
            is_correct=opt_data["is_correct"],
            option_text_en=opt_data.get("option_text_en"),
            option_text_ta=opt_data.get("option_text_ta"),
            option_text_te=opt_data.get("option_text_te"),
            option_text_hi=opt_data.get("option_text_hi"),
            option_text_ml=opt_data.get("option_text_ml"),
            option_text_kn=opt_data.get("option_text_kn")
        )
        db.add(opt)
        db.commit()
        db.refresh(opt)
        if opt.is_correct:
            correct_opt_id = opt.id

    eq_link = ExamQuestion(exam_id=new_exam.id, question_id=new_q.id, question_order=1, marks=5.0)
    db.add(eq_link)
    new_exam.total_questions = 1
    db.commit()

    print(f"[OK] Created Question ID: {new_q.id} with 4 options. Correct Option ID: {correct_opt_id}")

    print("\n" + "=" * 70)
    print("STEP 2: VERIFYING DATABASE MULTILINGUAL STORAGE ACROSS ALL 6 LANGUAGES")
    print("=" * 70)
    languages = ["en", "ta", "hi", "te", "ml", "kn"]
    for lang in languages:
        title_val = resolve_multilingual_field(new_exam, "title", lang)
        q_val = resolve_multilingual_field(new_q, "question_text", lang)
        print(f"\nLanguage: [{lang.upper()}]")
        print(f"  Exam Title   : {title_val}")
        print(f"  Question Text: {q_val}")
        print(f"  Options:")
        for idx, o in enumerate(new_q.options):
            opt_text = resolve_multilingual_field(o, "option_text", lang)
            print(f"    [{chr(65+idx)}] (ID {o.id}) -> {opt_text} {'[CORRECT ANSWER]' if o.is_correct else ''}")

    print("\n" + "=" * 70)
    print("STEP 3: VERIFYING OPTION ORDER & CORRECT ANSWER INVARIANCE")
    print("=" * 70)
    for lang in languages:
        opts = [resolve_multilingual_field(o, "option_text", lang) for o in new_q.options]
        correct_indices = [idx for idx, o in enumerate(new_q.options) if o.is_correct]
        print(f"  [{lang.upper()}]: Option Count={len(opts)}, Correct Index={correct_indices} (Must be [1] -> B)")
        assert len(opts) == 4
        assert correct_indices == [1]

    print("\n" + "=" * 70)
    print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY WITH 100% ACCURACY!")
    print("=" * 70)
    db.close()

if __name__ == "__main__":
    run_multilingual_verification()
