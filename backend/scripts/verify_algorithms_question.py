import sys
import os
sys.path.insert(0, os.path.abspath("."))
sys.stdout.reconfigure(encoding='utf-8')
from app.core.database import SessionLocal
from app.models.question import Question

db = SessionLocal()
q = db.query(Question).filter(Question.question_text.ilike("%binary search%")).first()

if q:
    print("=== QUESTION IN 6 LANGUAGES ===")
    for l in ["en", "ta", "hi", "te", "ml", "kn"]:
        print(f"[{l.upper()}]: {getattr(q, f'question_text_{l}')}")
    print("\n=== OPTIONS & CORRECT ANSWERS IN 6 LANGUAGES ===")
    for opt in q.options:
        print(f"Option ID: {opt.id} | Correct: {opt.is_correct}")
        for l in ["en", "ta", "hi", "te", "ml", "kn"]:
            print(f"  [{l}]: {getattr(opt, f'option_text_{l}')}")
else:
    print("Question not found")
db.close()
