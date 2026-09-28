import sys
import os
import re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import SessionLocal
from app.models.exam import Exam
from app.models.question import Question, Option
from services.translation_service import (
    SUPPORTED_LANGUAGES,
    translate_to_all_languages,
    CORE_CS_DICTIONARY,
    _TRANSLATION_CACHE
)

PREFIX_REGEX = re.compile(r"^\[(தமிழ்|தெలుగు|हिन्दी|മലയാളം|ಕನ್ನಡ|ta|te|hi|ml|kn|English|Tamil|Telugu|Hindi|Malayalam|Kannada)\]\s*", re.IGNORECASE)

def strip_fake_prefix(text: str) -> str:
    if not text:
        return ""
    return PREFIX_REGEX.sub("", text).strip()

def clean_and_retranslate_database():
    db = SessionLocal()
    print("=" * 70, flush=True)
    print("STARTING HIGH-SPEED DATABASE CLEANUP & AUTHENTIC TRANSLATION", flush=True)
    print("=" * 70, flush=True)

    try:
        # Step 1: Strip fake prefixes from all tables first
        print("\n[Step 1/3] Stripping fake prefixes from PostgreSQL...", flush=True)
        exams = db.query(Exam).all()
        for ex in exams:
            ex.title = strip_fake_prefix(getattr(ex, "title_en", None) or ex.title or "")
            ex.title_en = ex.title
            ex.subject = strip_fake_prefix(getattr(ex, "subject_en", None) or ex.subject or "")
            ex.subject_en = ex.subject
            if ex.description:
                ex.description = strip_fake_prefix(getattr(ex, "description_en", None) or ex.description or "")
                ex.description_en = ex.description
            if getattr(ex, "instructions_en", None):
                ex.instructions_en = strip_fake_prefix(ex.instructions_en)

        questions = db.query(Question).all()
        for q in questions:
            q.question_text = strip_fake_prefix(getattr(q, "question_text_en", None) or q.question_text or "")
            q.question_text_en = q.question_text
            if q.model_answer:
                q.model_answer = strip_fake_prefix(getattr(q, "model_answer_en", None) or q.model_answer or "")
                q.model_answer_en = q.model_answer
            if getattr(q, "explanation_en", None):
                q.explanation_en = strip_fake_prefix(q.explanation_en)

        options = db.query(Option).all()
        for opt in options:
            opt.option_text = strip_fake_prefix(getattr(opt, "option_text_en", None) or opt.option_text or "")
            opt.option_text_en = opt.option_text

        db.commit()
        print("  -> Fake prefixes successfully removed from all database records!", flush=True)

        # Step 2: Collect distinct strings to translate
        print("\n[Step 2/3] Collecting distinct educational texts for translation...", flush=True)
        distinct_texts = set()
        for ex in exams:
            if ex.title: distinct_texts.add(ex.title)
            if ex.subject: distinct_texts.add(ex.subject)
            if ex.description: distinct_texts.add(ex.description)
            if getattr(ex, "instructions_en", None): distinct_texts.add(ex.instructions_en)

        for q in questions:
            if q.question_text: distinct_texts.add(q.question_text)
            if q.model_answer: distinct_texts.add(q.model_answer)
            if getattr(q, "explanation_en", None): distinct_texts.add(q.explanation_en)

        for opt in options:
            if opt.option_text: distinct_texts.add(opt.option_text)

        print(f"  -> Found {len(distinct_texts)} unique strings across exams, questions, and options.", flush=True)

        # Batch translate unique strings with multi-worker ThreadPool
        print("  -> Translating unique strings into all 6 languages concurrently...", flush=True)
        translated_map = {}
        with ThreadPoolExecutor(max_workers=16) as executor:
            future_to_text = {executor.submit(translate_to_all_languages, text): text for text in distinct_texts}
            completed_count = 0
            for future in as_completed(future_to_text):
                orig_text = future_to_text[future]
                try:
                    res_dict = future.result()
                    translated_map[orig_text] = res_dict
                except Exception as e:
                    translated_map[orig_text] = {l: orig_text for l in SUPPORTED_LANGUAGES}
                completed_count += 1
                if completed_count % 50 == 0 or completed_count == len(distinct_texts):
                    print(f"     Translation progress: {completed_count}/{len(distinct_texts)} strings completed.", flush=True)

        # Step 3: Apply authentic translations to all database entities
        print("\n[Step 3/3] Saving translations to PostgreSQL database...", flush=True)
        for ex in exams:
            t_title = translated_map.get(ex.title, {})
            t_subj = translated_map.get(ex.subject, {})
            t_desc = translated_map.get(ex.description, {}) if ex.description else {}
            t_inst = translated_map.get(getattr(ex, "instructions_en", ""), {}) if getattr(ex, "instructions_en", None) else {}

            for l in ["ta", "te", "hi", "ml", "kn"]:
                setattr(ex, f"title_{l}", t_title.get(l) or ex.title)
                setattr(ex, f"subject_{l}", t_subj.get(l) or ex.subject)
                if ex.description:
                    setattr(ex, f"description_{l}", t_desc.get(l) or ex.description)
                if getattr(ex, "instructions_en", None):
                    setattr(ex, f"instructions_{l}", t_inst.get(l) or ex.instructions_en)

        for q in questions:
            t_q = translated_map.get(q.question_text, {})
            t_m = translated_map.get(q.model_answer, {}) if q.model_answer else {}
            t_e = translated_map.get(getattr(q, "explanation_en", ""), {}) if getattr(q, "explanation_en", None) else {}

            for l in ["ta", "te", "hi", "ml", "kn"]:
                setattr(q, f"question_text_{l}", t_q.get(l) or q.question_text)
                if q.model_answer:
                    setattr(q, f"model_answer_{l}", t_m.get(l) or q.model_answer)
                if getattr(q, "explanation_en", None):
                    setattr(q, f"explanation_{l}", t_e.get(l) or q.explanation_en)

        for opt in options:
            t_opt = translated_map.get(opt.option_text, {})
            for l in ["ta", "te", "hi", "ml", "kn"]:
                setattr(opt, f"option_text_{l}", t_opt.get(l) or opt.option_text)

        db.commit()
        print("  -> All database records updated successfully!", flush=True)

        # Step 4: Verification of 0 prefixes
        prefix_count = 0
        for l in ["ta", "te", "hi", "ml", "kn"]:
            col_q = getattr(Question, f"question_text_{l}")
            prefix_count += db.query(Question).filter(col_q.like(f"[{l}]%")).count()
            prefix_count += db.query(Question).filter(col_q.like(f"[தமிழ்]%")).count()
            prefix_count += db.query(Question).filter(col_q.like(f"[हिन्दी]%")).count()
            prefix_count += db.query(Question).filter(col_q.like(f"[తెలుగు]%")).count()
            prefix_count += db.query(Question).filter(col_q.like(f"[മലയാളം]%")).count()
            prefix_count += db.query(Question).filter(col_q.like(f"[ಕನ್ನಡ]%")).count()

        print("\n" + "=" * 70, flush=True)
        print(f"CLEANUP VERIFICATION RESULT: Remaining fake prefixes in DB = {prefix_count}", flush=True)
        print("=" * 70, flush=True)

    except Exception as e:
        db.rollback()
        print(f"Error during cleanup and retranslation: {e}", flush=True)
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    clean_and_retranslate_database()
