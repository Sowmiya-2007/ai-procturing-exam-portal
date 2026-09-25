import os
import sys
import sqlite3

sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import engine, Base
import app.models

def sync_database_schema():
    print("Synchronizing database schema...")
    Base.metadata.create_all(bind=engine)

    # For SQLite, check and add missing columns dynamically
    db_path = os.path.join(os.path.dirname(__file__), "examination.db")
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check users table
        cursor.execute("PRAGMA table_info(users)")
        user_cols = {row[1] for row in cursor.fetchall()}
        if "register_number" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN register_number VARCHAR(100)")
            print("Added register_number to users")
        if "department" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN department VARCHAR(150)")
            print("Added department to users")
        if "year" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN year VARCHAR(50)")
            print("Added year to users")

        # Check question_bank table
        cursor.execute("PRAGMA table_info(question_bank)")
        q_cols = {row[1] for row in cursor.fetchall()}
        if "topic" not in q_cols:
            cursor.execute("ALTER TABLE question_bank ADD COLUMN topic VARCHAR(150)")
            print("Added topic to question_bank")
        if "evaluation_guidelines" not in q_cols:
            cursor.execute("ALTER TABLE question_bank ADD COLUMN evaluation_guidelines TEXT")
            print("Added evaluation_guidelines to question_bank")
            
        # Multilingual columns for question_bank
        for lang in ["en", "ta", "te", "hi", "ml", "kn"]:
            col = f"question_text_{lang}"
            if col not in q_cols:
                cursor.execute(f"ALTER TABLE question_bank ADD COLUMN {col} TEXT")
                print(f"Added {col} to question_bank")
            exp_col = f"explanation_{lang}"
            if exp_col not in q_cols:
                cursor.execute(f"ALTER TABLE question_bank ADD COLUMN {exp_col} TEXT")
                print(f"Added {exp_col} to question_bank")
            model_col = f"model_answer_{lang}"
            if model_col not in q_cols:
                cursor.execute(f"ALTER TABLE question_bank ADD COLUMN {model_col} TEXT")
                print(f"Added {model_col} to question_bank")

        # Check options table
        cursor.execute("PRAGMA table_info(options)")
        opt_cols = {row[1] for row in cursor.fetchall()}
        for lang in ["en", "ta", "te", "hi", "ml", "kn"]:
            col = f"option_text_{lang}"
            if col not in opt_cols:
                cursor.execute(f"ALTER TABLE options ADD COLUMN {col} TEXT")
                print(f"Added {col} to options")

        # Check exams table
        cursor.execute("PRAGMA table_info(exams)")
        exam_cols = {row[1] for row in cursor.fetchall()}
        if "passing_marks" not in exam_cols:
            cursor.execute("ALTER TABLE exams ADD COLUMN passing_marks FLOAT DEFAULT 40.0")
            print("Added passing_marks to exams")
        
        for lang in ["en", "ta", "te", "hi", "ml", "kn"]:
            for prefix in ["title", "subject", "description", "instructions"]:
                col = f"{prefix}_{lang}"
                if col not in exam_cols:
                    cursor.execute(f"ALTER TABLE exams ADD COLUMN {col} TEXT")
                    print(f"Added {col} to exams")

        # Check answers table
        cursor.execute("PRAGMA table_info(answers)")
        ans_cols = {row[1] for row in cursor.fetchall()}
        if "is_flagged" not in ans_cols:
            cursor.execute("ALTER TABLE answers ADD COLUMN is_flagged BOOLEAN DEFAULT 0")
            print("Added is_flagged to answers")
        if "ai_suggested_score" not in ans_cols:
            cursor.execute("ALTER TABLE answers ADD COLUMN ai_suggested_score FLOAT")
            print("Added ai_suggested_score to answers")
        if "ai_justification" not in ans_cols:
            cursor.execute("ALTER TABLE answers ADD COLUMN ai_justification TEXT")
            print("Added ai_justification to answers")
        if "ai_matched_points" not in ans_cols:
            cursor.execute("ALTER TABLE answers ADD COLUMN ai_matched_points JSON")
            print("Added ai_matched_points to answers")
        if "ai_missing_points" not in ans_cols:
            cursor.execute("ALTER TABLE answers ADD COLUMN ai_missing_points JSON")
            print("Added ai_missing_points to answers")
        if "examiner_feedback" not in ans_cols:
            cursor.execute("ALTER TABLE answers ADD COLUMN examiner_feedback TEXT")
            print("Added examiner_feedback to answers")
        if "is_evaluated" not in ans_cols:
            cursor.execute("ALTER TABLE answers ADD COLUMN is_evaluated BOOLEAN DEFAULT 0")
            print("Added is_evaluated to answers")

        # Check results table
        cursor.execute("PRAGMA table_info(results)")
        res_cols = {row[1] for row in cursor.fetchall()}
        if "session_id" not in res_cols:
            cursor.execute("ALTER TABLE results ADD COLUMN session_id INTEGER")
            print("Added session_id to results")
        if "passing_status" not in res_cols:
            cursor.execute("ALTER TABLE results ADD COLUMN passing_status BOOLEAN DEFAULT 0")
            print("Added passing_status to results")
        if "correct_answers_count" not in res_cols:
            cursor.execute("ALTER TABLE results ADD COLUMN correct_answers_count INTEGER DEFAULT 0")
            print("Added correct_answers_count to results")
        if "wrong_answers_count" not in res_cols:
            cursor.execute("ALTER TABLE results ADD COLUMN wrong_answers_count INTEGER DEFAULT 0")
            print("Added wrong_answers_count to results")
        if "unanswered_count" not in res_cols:
            cursor.execute("ALTER TABLE results ADD COLUMN unanswered_count INTEGER DEFAULT 0")
            print("Added unanswered_count to results")
        if "subjective_marks" not in res_cols:
            cursor.execute("ALTER TABLE results ADD COLUMN subjective_marks FLOAT DEFAULT 0.0")
            print("Added subjective_marks to results")
        if "suspicion_score" not in res_cols:
            cursor.execute("ALTER TABLE results ADD COLUMN suspicion_score FLOAT DEFAULT 0.0")
            print("Added suspicion_score to results")
        if "is_approved" not in res_cols:
            cursor.execute("ALTER TABLE results ADD COLUMN is_approved BOOLEAN DEFAULT 0")
            print("Added is_approved to results")
        if "approved_by" not in res_cols:
            cursor.execute("ALTER TABLE results ADD COLUMN approved_by INTEGER")
            print("Added approved_by to results")
        if "approved_at" not in res_cols:
            cursor.execute("ALTER TABLE results ADD COLUMN approved_at TIMESTAMP")
            print("Added approved_at to results")
        if "approval_notes" not in res_cols:
            cursor.execute("ALTER TABLE results ADD COLUMN approval_notes TEXT")
            print("Added approval_notes to results")
        if "is_published" not in res_cols:
            cursor.execute("ALTER TABLE results ADD COLUMN is_published BOOLEAN DEFAULT 0")
            print("Added is_published to results")
        if "published_at" not in res_cols:
            cursor.execute("ALTER TABLE results ADD COLUMN published_at TIMESTAMP")
            print("Added published_at to results")

        # Populate student default register numbers and departments if missing
        cursor.execute("UPDATE users SET register_number = 'REG2026' || printf('%04d', id) WHERE role = 'STUDENT' AND (register_number IS NULL OR register_number = '')")
        cursor.execute("UPDATE users SET department = 'Computer Science & Engineering' WHERE department IS NULL OR department = ''")
        cursor.execute("UPDATE users SET year = '3rd Year' WHERE role = 'STUDENT' AND (year IS NULL OR year = '')")

        conn.commit()
        conn.close()
        print("Database schema synchronization complete!")

if __name__ == "__main__":
    sync_database_schema()
