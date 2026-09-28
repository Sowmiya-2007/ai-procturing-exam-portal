import sys
import os
sys.path.insert(0, os.path.abspath("."))
sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import SessionLocal
from app.models.question import Question

db = SessionLocal()
qs = db.query(Question).filter(Question.question_text.ilike("%binary search%")).all()
print(f"Found {len(qs)} questions with binary search:")
for q in qs:
    print(f"\nQuestion ID: {q.id}")
    for l in ["en", "ta", "hi", "te", "ml", "kn"]:
        print(f"  [{l.upper()}]: {getattr(q, f'question_text_{l}')}")

db.close()
