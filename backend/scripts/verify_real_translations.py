import sys
import os
from pathlib import Path
import json
import urllib.request

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import SessionLocal
from app.models.question import Question, Option
from app.models.exam import Exam

def verify_all():
    db = SessionLocal()
    print("=" * 80)
    print("1. DATABASE DIRECT QUERY VERIFICATION FOR BINARY SEARCH QUESTION")
    print("=" * 80)
    
    q = db.query(Question).filter(Question.question_text.ilike("%binary search%")).first()
    if not q:
        print("ERROR: Question not found!")
        return

    print(f"Question ID: {q.id}")
    for lang in ["en", "ta", "hi", "te", "ml", "kn"]:
        q_text = getattr(q, f"question_text_{lang}")
        print(f"[{lang.upper()}]: {q_text}")

    print("\nOPTIONS:")
    for opt in q.options:
        print(f"\n  Option ID {opt.id} (Correct={opt.is_correct}):")
        for lang in ["en", "ta", "hi", "te", "ml", "kn"]:
            opt_text = getattr(opt, f"option_text_{lang}")
            print(f"    [{lang.upper()}]: {opt_text}")

    print("\n" + "=" * 80)
    print("2. DATABASE FAKE PREFIX SCAN ACROSS ENTIRE DB")
    print("=" * 80)
    prefix_count = 0
    for l in ["ta", "te", "hi", "ml", "kn"]:
        col_q = getattr(Question, f"question_text_{l}")
        prefix_count += db.query(Question).filter(col_q.like(f"[{l}]%")).count()
        prefix_count += db.query(Question).filter(col_q.like(f"[தமிழ்]%")).count()
        prefix_count += db.query(Question).filter(col_q.like(f"[हिन्दी]%")).count()
        prefix_count += db.query(Question).filter(col_q.like(f"[తెలుగు]%")).count()
        prefix_count += db.query(Question).filter(col_q.like(f"[മലയാളം]%")).count()
        prefix_count += db.query(Question).filter(col_q.like(f"[ಕನ್ನಡ]%")).count()

    print(f"Total fake prefixes remaining across all questions in PostgreSQL: {prefix_count}")

    print("\n" + "=" * 80)
    print("3. LIVE FASTAPI ENDPOINT RESPONSE ACROSS ALL 6 LANGUAGES")
    print("=" * 80)
    # Find exam that includes this question
    exam = db.query(Exam).first()
    if exam:
        print(f"Testing Exam #{exam.id} via HTTP API:")
        for lang in ["en", "ta", "hi", "te", "ml", "kn"]:
            url = f"http://localhost:8001/api/exams/{exam.id}?language={lang}"
            try:
                req = urllib.request.Request(url, headers={"Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = json.loads(response.read().decode("utf-8"))
                    print(f"  [{lang.upper()}] Title: {data.get('title')}")
                    if data.get("exam_questions") and len(data["exam_questions"]) > 0:
                        first_q = data["exam_questions"][0]["question"]
                        print(f"        Q1: {first_q.get('question_text')}")
            except Exception as e:
                print(f"  [{lang.upper()}] API Request Error: {e}")

    db.close()

if __name__ == "__main__":
    verify_all()
