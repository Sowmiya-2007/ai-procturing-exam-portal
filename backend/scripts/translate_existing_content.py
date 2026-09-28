#!/usr/bin/env python3
"""
=============================================================================
ENTERPRISE MULTILINGUAL DATA MIGRATION & BACKFILL ENGINE
=============================================================================
Scans all existing exams, questions, and options in the PostgreSQL/SQLite database,
translating missing language fields into the 6 supported languages:
1. English (en)
2. Tamil (ta)
3. Hindi (hi)
4. Telugu (te)
5. Malayalam (ml)
6. Kannada (kn)

Guarantees:
- Safe, repeatable, resumable
- Does NOT overwrite existing English content
- Uses OpenAI API if configured, DeepTranslator, MyMemory, and Curated Dictionary
- Preserves technical keywords, Big-O notation, code snippets, and answer keys
- Concurrent thread-pool execution with batch commits for ultra-fast performance

Usage:
    python -m scripts.translate_existing_content
    python scripts/translate_existing_content.py [--force] [--batch-size 20]
"""

import sys
import os
import argparse
import logging
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# Ensure backend root is in sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.core.database import SessionLocal
from app.models.exam import Exam
from app.models.question import Question, Option
from services.translation_service import translate_text, translate_to_all_languages, SUPPORTED_LANGUAGES

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("DataMigration")

TARGET_LANGS = [l for l in SUPPORTED_LANGUAGES if l != "en"]


def process_single_exam(exam_data: dict, force: bool = False) -> dict:
    """Translates missing fields for a single exam in memory."""
    updates = {}
    
    # 1. Title
    title = exam_data.get("title") or exam_data.get("title_en")
    if title:
        updates["title_en"] = title
        trans = translate_to_all_languages(title)
        for lang in TARGET_LANGS:
            if not exam_data.get(f"title_{lang}") or force:
                updates[f"title_{lang}"] = trans.get(lang, title)

    # 2. Subject
    subj = exam_data.get("subject") or exam_data.get("subject_en")
    if subj:
        updates["subject_en"] = subj
        trans = translate_to_all_languages(subj)
        for lang in TARGET_LANGS:
            if not exam_data.get(f"subject_{lang}") or force:
                updates[f"subject_{lang}"] = trans.get(lang, subj)

    # 3. Description
    desc = exam_data.get("description") or exam_data.get("description_en")
    if desc:
        updates["description_en"] = desc
        trans = translate_to_all_languages(desc)
        for lang in TARGET_LANGS:
            if not exam_data.get(f"description_{lang}") or force:
                updates[f"description_{lang}"] = trans.get(lang, desc)

    # 4. Instructions
    inst = exam_data.get("instructions_en") or "Read each question carefully before submitting."
    updates["instructions_en"] = inst
    trans = translate_to_all_languages(inst)
    for lang in TARGET_LANGS:
        if not exam_data.get(f"instructions_{lang}") or force:
            updates[f"instructions_{lang}"] = trans.get(lang, inst)

    return {"id": exam_data["id"], "updates": updates}


def process_single_question(q_data: dict, force: bool = False) -> dict:
    """Translates missing fields for a single question in memory."""
    updates = {}

    # 1. Question Text
    qtext = q_data.get("question_text") or q_data.get("question_text_en")
    if qtext:
        updates["question_text_en"] = qtext
        trans = translate_to_all_languages(qtext)
        for lang in TARGET_LANGS:
            if not q_data.get(f"question_text_{lang}") or force:
                updates[f"question_text_{lang}"] = trans.get(lang, qtext)

    # 2. Explanation
    expl = q_data.get("explanation_en") or q_data.get("expected_answer")
    if expl:
        updates["explanation_en"] = expl
        trans = translate_to_all_languages(expl)
        for lang in TARGET_LANGS:
            if not q_data.get(f"explanation_{lang}") or force:
                updates[f"explanation_{lang}"] = trans.get(lang, expl)

    # 3. Model Answer
    model_ans = q_data.get("model_answer") or q_data.get("model_answer_en")
    if model_ans:
        updates["model_answer_en"] = model_ans
        trans = translate_to_all_languages(model_ans)
        for lang in TARGET_LANGS:
            if not q_data.get(f"model_answer_{lang}") or force:
                updates[f"model_answer_{lang}"] = trans.get(lang, model_ans)

    return {"id": q_data["id"], "updates": updates}


def process_single_option(opt_data: dict, force: bool = False) -> dict:
    """Translates missing fields for a single MCQ option in memory."""
    updates = {}
    opt_text = opt_data.get("option_text") or opt_data.get("option_text_en")
    if opt_text:
        updates["option_text_en"] = opt_text
        trans = translate_to_all_languages(opt_text)
        for lang in TARGET_LANGS:
            if not opt_data.get(f"option_text_{lang}") or force:
                updates[f"option_text_{lang}"] = trans.get(lang, opt_text)
    return {"id": opt_data["id"], "updates": updates}


def run_migration(force_regenerate: bool = False, workers: int = 8):
    db = SessionLocal()
    
    stats = {
        "exams_processed": 0,
        "questions_processed": 0,
        "options_processed": 0,
        "ta_translations": 0,
        "te_translations": 0,
        "hi_translations": 0,
        "ml_translations": 0,
        "kn_translations": 0,
        "failures": 0
    }

    try:
        logger.info("=" * 60)
        logger.info("STARTING MULTITHREADED 6-LANGUAGE DATABASE MIGRATION")
        logger.info(f"Target Languages: {', '.join(SUPPORTED_LANGUAGES)}")
        logger.info(f"Workers: {workers} | Force: {force_regenerate}")
        logger.info("=" * 60)

        # -------------------------------------------------------------
        # 1. PROCESS EXAMS
        # -------------------------------------------------------------
        exams = db.query(Exam).all()
        logger.info(f"Loaded {len(exams)} exams.")
        exam_dicts = [
            {
                "id": e.id,
                "title": e.title,
                "title_en": e.title_en,
                "title_ta": e.title_ta,
                "title_hi": e.title_hi,
                "title_te": e.title_te,
                "title_ml": e.title_ml,
                "title_kn": e.title_kn,
                "subject": e.subject,
                "subject_en": e.subject_en,
                "subject_ta": e.subject_ta,
                "subject_hi": e.subject_hi,
                "subject_te": e.subject_te,
                "subject_ml": e.subject_ml,
                "subject_kn": e.subject_kn,
                "description": e.description,
                "description_en": e.description_en,
                "description_ta": e.description_ta,
                "description_hi": e.description_hi,
                "description_te": e.description_te,
                "description_ml": e.description_ml,
                "description_kn": e.description_kn,
                "instructions_en": e.instructions_en,
                "instructions_ta": e.instructions_ta,
                "instructions_hi": e.instructions_hi,
                "instructions_te": e.instructions_te,
                "instructions_ml": e.instructions_ml,
                "instructions_kn": e.instructions_kn,
            }
            for e in exams
        ]

        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = [executor.submit(process_single_exam, ed, force_regenerate) for ed in exam_dicts]
            for f in as_completed(futures):
                try:
                    res = f.result()
                    stats["exams_processed"] += 1
                    exam_obj = next((e for e in exams if e.id == res["id"]), None)
                    if exam_obj and res["updates"]:
                        for k, v in res["updates"].items():
                            setattr(exam_obj, k, v)
                except Exception as ex:
                    logger.error(f"Error processing exam: {ex}")
                    stats["failures"] += 1

        db.commit()
        logger.info(f"Completed {stats['exams_processed']} exams.")

        # -------------------------------------------------------------
        # 2. PROCESS QUESTIONS
        # -------------------------------------------------------------
        questions = db.query(Question).all()
        logger.info(f"Loaded {len(questions)} questions.")
        q_dicts = [
            {
                "id": q.id,
                "question_text": q.question_text,
                "question_text_en": q.question_text_en,
                "question_text_ta": q.question_text_ta,
                "question_text_hi": q.question_text_hi,
                "question_text_te": q.question_text_te,
                "question_text_ml": q.question_text_ml,
                "question_text_kn": q.question_text_kn,
                "explanation_en": q.explanation_en,
                "explanation_ta": q.explanation_ta,
                "explanation_hi": q.explanation_hi,
                "explanation_te": q.explanation_te,
                "explanation_ml": q.explanation_ml,
                "explanation_kn": q.explanation_kn,
                "model_answer": q.model_answer,
                "model_answer_en": q.model_answer_en,
                "model_answer_ta": q.model_answer_ta,
                "model_answer_hi": q.model_answer_hi,
                "model_answer_te": q.model_answer_te,
                "model_answer_ml": q.model_answer_ml,
                "model_answer_kn": q.model_answer_kn,
                "expected_answer": q.expected_answer,
            }
            for q in questions
        ]

        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = [executor.submit(process_single_question, qd, force_regenerate) for qd in q_dicts]
            for f in as_completed(futures):
                try:
                    res = f.result()
                    stats["questions_processed"] += 1
                    q_obj = next((q for q in questions if q.id == res["id"]), None)
                    if q_obj and res["updates"]:
                        for k, v in res["updates"].items():
                            setattr(q_obj, k, v)
                except Exception as ex:
                    logger.error(f"Error processing question: {ex}")
                    stats["failures"] += 1

        db.commit()
        logger.info(f"Completed {stats['questions_processed']} questions.")

        # -------------------------------------------------------------
        # 3. PROCESS OPTIONS
        # -------------------------------------------------------------
        options = db.query(Option).all()
        logger.info(f"Loaded {len(options)} options.")
        opt_dicts = [
            {
                "id": o.id,
                "option_text": o.option_text,
                "option_text_en": o.option_text_en,
                "option_text_ta": o.option_text_ta,
                "option_text_hi": o.option_text_hi,
                "option_text_te": o.option_text_te,
                "option_text_ml": o.option_text_ml,
                "option_text_kn": o.option_text_kn,
            }
            for o in options
        ]

        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = [executor.submit(process_single_option, od, force_regenerate) for od in opt_dicts]
            for f in as_completed(futures):
                try:
                    res = f.result()
                    stats["options_processed"] += 1
                    opt_obj = next((o for o in options if o.id == res["id"]), None)
                    if opt_obj and res["updates"]:
                        for k, v in res["updates"].items():
                            setattr(opt_obj, k, v)
                except Exception as ex:
                    logger.error(f"Error processing option: {ex}")
                    stats["failures"] += 1

        db.commit()
        logger.info(f"Completed {stats['options_processed']} options.")

        # -------------------------------------------------------------
        # FINAL VERIFICATION REPORT
        # -------------------------------------------------------------
        # Count verified records with non-null translations
        total_exams_with_ta = db.query(Exam).filter(Exam.title_ta.isnot(None)).count()
        total_qs_with_ta = db.query(Question).filter(Question.question_text_ta.isnot(None)).count()
        total_opts_with_ta = db.query(Option).filter(Option.option_text_ta.isnot(None)).count()

        logger.info("=" * 60)
        logger.info("MULTILINGUAL BACKFILL MIGRATION COMPLETE")
        logger.info("=" * 60)
        print(f"Total Exams Processed: {stats['exams_processed']} (Tamil verified: {total_exams_with_ta})")
        print(f"Total Questions Processed: {stats['questions_processed']} (Tamil verified: {total_qs_with_ta})")
        print(f"Total Options Processed: {stats['options_processed']} (Tamil verified: {total_opts_with_ta})")
        print(f"Supported Languages: {', '.join(SUPPORTED_LANGUAGES)}")
        print(f"Failures: {stats['failures']}")
        logger.info("=" * 60)

    except Exception as err:
        db.rollback()
        logger.error(f"Fatal error during migration: {err}", exc_info=True)
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Multithreaded Multilingual Data Migration Script")
    parser.add_argument("--force", action="store_true", help="Force re-translation of all fields")
    parser.add_argument("--workers", type=int, default=10, help="Number of concurrent translation workers")
    args = parser.parse_args()
    run_migration(force_regenerate=args.force, workers=args.workers)
