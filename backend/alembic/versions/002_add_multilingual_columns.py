"""add multilingual columns for 6 languages (en, ta, te, hi, ml, kn)

Revision ID: 002_multilingual_columns
Revises: 001_initial_schema
Create Date: 2026-09-27 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = "002_multilingual_columns"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LANG_CODES = ["en", "ta", "te", "hi", "ml", "kn"]

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. Add multilingual columns to exams table
    existing_exam_cols = [c["name"] for c in inspector.get_columns("exams")]
    for lang in LANG_CODES:
        col_title = f"title_{lang}"
        if col_title not in existing_exam_cols:
            op.add_column("exams", sa.Column(col_title, sa.String(length=255), nullable=True))
        
        col_subject = f"subject_{lang}"
        if col_subject not in existing_exam_cols:
            op.add_column("exams", sa.Column(col_subject, sa.String(length=150), nullable=True))

        col_desc = f"description_{lang}"
        if col_desc not in existing_exam_cols:
            op.add_column("exams", sa.Column(col_desc, sa.Text(), nullable=True))

        col_inst = f"instructions_{lang}"
        if col_inst not in existing_exam_cols:
            op.add_column("exams", sa.Column(col_inst, sa.Text(), nullable=True))

    # 2. Add multilingual columns to question_bank table
    existing_q_cols = [c["name"] for c in inspector.get_columns("question_bank")]
    for lang in LANG_CODES:
        col_q = f"question_text_{lang}"
        if col_q not in existing_q_cols:
            op.add_column("question_bank", sa.Column(col_q, sa.Text(), nullable=True))

        col_exp = f"explanation_{lang}"
        if col_exp not in existing_q_cols:
            op.add_column("question_bank", sa.Column(col_exp, sa.Text(), nullable=True))

        col_ans = f"model_answer_{lang}"
        if col_ans not in existing_q_cols:
            op.add_column("question_bank", sa.Column(col_ans, sa.Text(), nullable=True))

    # 3. Add multilingual columns to options table
    existing_opt_cols = [c["name"] for c in inspector.get_columns("options")]
    for lang in LANG_CODES:
        col_opt = f"option_text_{lang}"
        if col_opt not in existing_opt_cols:
            op.add_column("options", sa.Column(col_opt, sa.Text(), nullable=True))

    # 4. Safe backfill for English columns from existing base fields
    try:
        conn.execute(text("UPDATE exams SET title_en = title WHERE title_en IS NULL AND title IS NOT NULL"))
        conn.execute(text("UPDATE exams SET subject_en = subject WHERE subject_en IS NULL AND subject IS NOT NULL"))
        conn.execute(text("UPDATE exams SET description_en = description WHERE description_en IS NULL AND description IS NOT NULL"))
        conn.execute(text("UPDATE question_bank SET question_text_en = question_text WHERE question_text_en IS NULL AND question_text IS NOT NULL"))
        conn.execute(text("UPDATE question_bank SET model_answer_en = model_answer WHERE model_answer_en IS NULL AND model_answer IS NOT NULL"))
        conn.execute(text("UPDATE options SET option_text_en = option_text WHERE option_text_en IS NULL AND option_text IS NOT NULL"))
    except Exception:
        pass


def downgrade() -> None:
    # Drop columns in reverse
    for lang in reversed(LANG_CODES):
        op.drop_column("options", f"option_text_{lang}")

    for lang in reversed(LANG_CODES):
        op.drop_column("question_bank", f"model_answer_{lang}")
        op.drop_column("question_bank", f"explanation_{lang}")
        op.drop_column("question_bank", f"question_text_{lang}")

    for lang in reversed(LANG_CODES):
        op.drop_column("exams", f"instructions_{lang}")
        op.drop_column("exams", f"description_{lang}")
        op.drop_column("exams", f"subject_{lang}")
        op.drop_column("exams", f"title_{lang}")
