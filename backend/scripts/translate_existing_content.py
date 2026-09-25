#!/usr/bin/env python3
"""
=============================================================================
ONE-TIME AND REPEATABLE MULTILINGUAL DATA MIGRATION / BACKFILL SCRIPT
=============================================================================
This script scans all existing exams, questions, and options in the database,
ensuring all 6 languages (en, ta, te, hi, ml, kn) are fully translated and
persisted into their respective database columns.

Usage:
    python -m scripts.translate_existing_content
    python scripts/translate_existing_content.py [--force]
"""

import sys
import os
import argparse
import logging
from pathlib import Path

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

def run_migration(force_regenerate: bool = False):
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
        logger.info("STARTING 6-LANGUAGE DATABASE CONTENT MIGRATION")
        logger.info(f"Target Languages: {', '.join(SUPPORTED_LANGUAGES)}")
        logger.info(f"Force Regenerate: {force_regenerate}")
        logger.info("=" * 60)

        # -------------------------------------------------------------
        # 1. PROCESS ALL EXAMS
        # -------------------------------------------------------------
        exams = db.query(Exam).all()
        logger.info(f"Found {len(exams)} total exam(s) in database.")

        for exam in exams:
            stats["exams_processed"] += 1
            changed = False

            # Translate Exam Title
            base_title = exam.title or exam.title_en
            if base_title:
                if not exam.title_en:
                    exam.title_en = base_title
                    changed = True
                for lang in ["ta", "te", "hi", "ml", "kn"]:
                    current_val = getattr(exam, f"title_{lang}", None)
                    if not current_val or force_regenerate:
                        try:
                            trans = translate_text(base_title, source_lang="en", target_lang=lang)
                            setattr(exam, f"title_{lang}", trans)
                            stats[f"{lang}_translations"] += 1
                            changed = True
                        except Exception as ex:
                            logger.error(f"Failed to translate exam #{exam.id} title to {lang}: {ex}")
                            stats["failures"] += 1

            # Translate Exam Subject
            base_subject = exam.subject or exam.subject_en
            if base_subject:
                if not exam.subject_en:
                    exam.subject_en = base_subject
                    changed = True
                for lang in ["ta", "te", "hi", "ml", "kn"]:
                    current_val = getattr(exam, f"subject_{lang}", None)
                    if not current_val or force_regenerate:
                        try:
                            trans = translate_text(base_subject, source_lang="en", target_lang=lang)
                            setattr(exam, f"subject_{lang}", trans)
                            stats[f"{lang}_translations"] += 1
                            changed = True
                        except Exception as ex:
                            logger.error(f"Failed to translate exam #{exam.id} subject to {lang}: {ex}")
                            stats["failures"] += 1

            # Translate Exam Description
            base_desc = exam.description or exam.description_en
            if base_desc:
                if not exam.description_en:
                    exam.description_en = base_desc
                    changed = True
                for lang in ["ta", "te", "hi", "ml", "kn"]:
                    current_val = getattr(exam, f"description_{lang}", None)
                    if not current_val or force_regenerate:
                        try:
                            trans = translate_text(base_desc, source_lang="en", target_lang=lang)
                            setattr(exam, f"description_{lang}", trans)
                            stats[f"{lang}_translations"] += 1
                            changed = True
                        except Exception as ex:
                            logger.error(f"Failed to translate exam #{exam.id} description to {lang}: {ex}")
                            stats["failures"] += 1

            # Translate Exam Instructions
            base_inst = getattr(exam, "instructions_en", None) or "Read each question carefully before submitting."
            if not getattr(exam, "instructions_en", None):
                exam.instructions_en = base_inst
                changed = True
            for lang in ["ta", "te", "hi", "ml", "kn"]:
                current_val = getattr(exam, f"instructions_{lang}", None)
                if not current_val or force_regenerate:
                    try:
                        trans = translate_text(base_inst, source_lang="en", target_lang=lang)
                        setattr(exam, f"instructions_{lang}", trans)
                        stats[f"{lang}_translations"] += 1
                        changed = True
                    except Exception as ex:
                        logger.error(f"Failed to translate exam #{exam.id} instructions to {lang}: {ex}")
                        stats["failures"] += 1

            if changed and stats["exams_processed"] % 10 == 0:
                db.commit()

        db.commit()
        logger.info(f"Finished processing exams. Total: {stats['exams_processed']}")

        # -------------------------------------------------------------
        # 2. PROCESS ALL QUESTIONS
        # -------------------------------------------------------------
        questions = db.query(Question).all()
        logger.info(f"Found {len(questions)} total question(s) in question bank.")

        for q in questions:
            stats["questions_processed"] += 1
            changed = False

            # Translate Question Text
            base_qtext = q.question_text or q.question_text_en
            if base_qtext:
                if not q.question_text_en:
                    q.question_text_en = base_qtext
                    changed = True
                for lang in ["ta", "te", "hi", "ml", "kn"]:
                    current_val = getattr(q, f"question_text_{lang}", None)
                    if not current_val or force_regenerate:
                        try:
                            trans = translate_text(base_qtext, source_lang="en", target_lang=lang)
                            setattr(q, f"question_text_{lang}", trans)
                            stats[f"{lang}_translations"] += 1
                            changed = True
                        except Exception as ex:
                            logger.error(f"Failed to translate question #{q.id} text to {lang}: {ex}")
                            stats["failures"] += 1

            # Translate Explanation
            base_expl = q.explanation_en or getattr(q, "explanation", None) or getattr(q, "expected_answer", None)
            if base_expl:
                if not q.explanation_en:
                    q.explanation_en = base_expl
                    changed = True
                for lang in ["ta", "te", "hi", "ml", "kn"]:
                    current_val = getattr(q, f"explanation_{lang}", None)
                    if not current_val or force_regenerate:
                        try:
                            trans = translate_text(base_expl, source_lang="en", target_lang=lang)
                            setattr(q, f"explanation_{lang}", trans)
                            stats[f"{lang}_translations"] += 1
                            changed = True
                        except Exception as ex:
                            logger.error(f"Failed to translate question #{q.id} explanation to {lang}: {ex}")
                            stats["failures"] += 1

            # Translate Model Answer
            base_model = q.model_answer or q.model_answer_en or q.expected_answer
            if base_model:
                if not q.model_answer_en:
                    q.model_answer_en = base_model
                    changed = True
                for lang in ["ta", "te", "hi", "ml", "kn"]:
                    current_val = getattr(q, f"model_answer_{lang}", None)
                    if not current_val or force_regenerate:
                        try:
                            trans = translate_text(base_model, source_lang="en", target_lang=lang)
                            setattr(q, f"model_answer_{lang}", trans)
                            stats[f"{lang}_translations"] += 1
                            changed = True
                        except Exception as ex:
                            logger.error(f"Failed to translate question #{q.id} model answer to {lang}: {ex}")
                            stats["failures"] += 1

            if changed and stats["questions_processed"] % 25 == 0:
                db.commit()

        db.commit()
        logger.info(f"Finished processing questions. Total: {stats['questions_processed']}")

        # -------------------------------------------------------------
        # 3. PROCESS ALL OPTIONS
        # -------------------------------------------------------------
        options = db.query(Option).all()
        logger.info(f"Found {len(options)} total option(s) in options table.")

        for opt in options:
            stats["options_processed"] += 1
            changed = False

            base_opt = opt.option_text or opt.option_text_en
            if base_opt:
                if not opt.option_text_en:
                    opt.option_text_en = base_opt
                    changed = True
                for lang in ["ta", "te", "hi", "ml", "kn"]:
                    current_val = getattr(opt, f"option_text_{lang}", None)
                    if not current_val or force_regenerate:
                        try:
                            trans = translate_text(base_opt, source_lang="en", target_lang=lang)
                            setattr(opt, f"option_text_{lang}", trans)
                            stats[f"{lang}_translations"] += 1
                            changed = True
                        except Exception as ex:
                            logger.error(f"Failed to translate option #{opt.id} to {lang}: {ex}")
                            stats["failures"] += 1

            if changed and stats["options_processed"] % 50 == 0:
                db.commit()

        db.commit()
        logger.info(f"Finished processing options. Total: {stats['options_processed']}")

        # -------------------------------------------------------------
        # FINAL REPORT & VALIDATION
        # -------------------------------------------------------------
        logger.info("=" * 60)
        logger.info("MIGRATION COMPLETED SUCCESSFULLY")
        logger.info("=" * 60)
        print(f"Exams processed: {stats['exams_processed']}")
        print(f"Questions processed: {stats['questions_processed']}")
        print(f"Options processed: {stats['options_processed']}")
        print(f"Tamil translations added/verified: {stats['ta_translations']}")
        print(f"Telugu translations added/verified: {stats['te_translations']}")
        print(f"Hindi translations added/verified: {stats['hi_translations']}")
        print(f"Malayalam translations added/verified: {stats['ml_translations']}")
        print(f"Kannada translations added/verified: {stats['kn_translations']}")
        print(f"Failures: {stats['failures']}")
        logger.info("=" * 60)

    except Exception as err:
        db.rollback()
        logger.error(f"Fatal error during migration: {err}", exc_info=True)
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Multilingual Data Migration Script")
    parser.add_argument("--force", action="store_true", help="Force re-translation of all fields")
    args = parser.parse_args()
    run_migration(force_regenerate=args.force)
