import pytest
import sys
import os
import io
from openpyxl import Workbook
from docx import Document
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.database import get_db
from app.models import Base, User, Question, Option, Exam, ExamQuestion, ExamSession, Answer, Result, ProctorEvent
from app.enums.enums import UserRole, ApprovalStatus, QuestionType, DifficultyLevel
from app.core.document_extractor import DocumentExtractor
from auth import hash_password, create_access_token
from main import app

# Setup isolated in-memory SQLite database
doc_test_engine = create_engine(
    "sqlite:///:memory:", 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
DocTestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=doc_test_engine)

def override_doc_get_db():
    db = DocTestSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def setup_db():
    prev_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_doc_get_db
    Base.metadata.create_all(bind=doc_test_engine)
    db = DocTestSessionLocal()
    examiner = User(
        name="Dr. Extraction Test",
        email="examiner_doc_test@test.edu",
        password_hash=hash_password("Pass@123"),
        role=UserRole.EXAMINER,
        approval_status=ApprovalStatus.APPROVED,
        is_active=True
    )
    db.add(examiner)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=doc_test_engine)
    if prev_override is not None:
        app.dependency_overrides[get_db] = prev_override
    else:
        app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def examiner_token():
    db = DocTestSessionLocal()
    examiner = db.query(User).filter(User.email == "examiner_doc_test@test.edu").first()
    assert examiner is not None
    token = create_access_token(data={"sub": str(examiner.id), "role": examiner.role.value, "id": examiner.id})
    db.close()
    return token

def test_document_extractor_text_parsing():
    sample_text = """
    1. What is the time complexity of QuickSort in the average case? [Marks: 2] [Difficulty: MEDIUM] [Type: MCQ]
    A) O(1)
    B) O(N log N)
    C) O(N^2)
    D) O(log N)
    Answer: B
    Explanation: The average case runtime partition divides the list in half.

    2. Which of the following are ACID properties in SQL? [Marks: 3] [Type: MULTI_SELECT]
    [x] A) Atomicity
    [x] B) Consistency
    [ ] C) Redundancy
    [x] D) Durability
    Answer: A, B, D

    3. Define cache thrashing and state a remedy. [Marks: 5] [Difficulty: HARD] [Type: SHORT_ANSWER]
    Answer: Cache thrashing happens when multiple memory addresses repeatedly evict each other in the cache.
    """
    res = DocumentExtractor.extract_from_text(sample_text)
    assert res.success is True
    assert res.extracted_count == 3
    
    # Q1
    q1 = res.questions[0]
    assert "What is the time complexity of QuickSort" in q1.question_text
    assert not q1.question_text.startswith("1.")
    assert q1.question_type == QuestionType.MCQ
    assert len(q1.options) == 4
    assert q1.options[1].option_text == "O(N log N)"
    assert q1.options[1].is_correct is True
    assert q1.is_valid is True

    # Q2
    q2 = res.questions[1]
    assert q2.question_type == QuestionType.MULTI_SELECT
    correct_opts = [o.option_text for o in q2.options if o.is_correct]
    assert "Atomicity" in correct_opts
    assert "Consistency" in correct_opts
    assert "Durability" in correct_opts
    assert "Redundancy" not in correct_opts

    # Q3
    q3 = res.questions[2]
    assert q3.question_type == QuestionType.SHORT_ANSWER
    assert "Cache thrashing happens" in q3.model_answer
    assert not q3.model_answer.startswith("Answer:")

def test_data_structures_exam_question_bank_reference():
    """
    Direct test against the reference PDF format:
    'DATA STRUCTURES – EXAM QUESTION BANK'
    Part A – MCQs (1. Which data structure follows LIFO? Key: B) Stack + AI Rubric)
    Part B – Short Answer (1. Define a data structure. Key Answer: ... + AI Rubric)
    Part C – Long Answer (1. Explain arrays... Model Key / Expected Answer: ... + AI Rubric)
    Part D – Image / Diagram (Figure 1 – Array, Question: ..., Key: ...)
    Part E – General AI Rubric
    """
    raw_reference_paper = """
    DATA STRUCTURES – EXAM QUESTION BANK
    Page 1 of 4

    Part A – MCQs

    1. Which data structure follows the LIFO principle?

    A) Queue
    B) Stack
    C) Linked List
    D) Tree

    Key: B) Stack
    AI Rubric / Key Criteria:
    Identifies LIFO • Selects Stack

    2. What is the time complexity of accessing an element by index in an array?

    A) O(1)
    B) O(log n)
    C) O(n)
    D) O(n²)

    Key: A) O(1)
    AI Rubric / Key Criteria:
    Recognizes direct address calculation • Selects O(1)

    Page 2 of 4

    Part B – Short Answer Questions

    1. Define a data structure.

    Key Answer: A data structure is a method of organizing and storing data so that it can be accessed and modified efficiently.
    AI Rubric / Key Criteria: Gives a clear definition • Mentions organization/storage • Mentions efficient access or operations

    2. State the difference between Linear and Non-Linear data structures.

    Key Answer: In linear data structures, elements are arranged sequentially (e.g., Arrays, Stacks). In non-linear data structures, elements are organized hierarchically or interconnected (e.g., Trees, Graphs).
    AI Rubric / Key Criteria: Explains sequential vs hierarchical organization • Gives valid examples for each

    Page 3 of 4

    Part C – Long Answer Questions

    1. Explain arrays and their operations.

    Model Key / Expected Answer:
    An array stores elements in contiguous memory locations. Major operations include insertion, deletion, traversal, and indexed lookup with O(1) random access.

    AI Rubric / Key Criteria:
    Definition and contiguous storage • Lists major operations • Explains O(1) access

    Page 4 of 4

    Part D – Image / Diagram-Based Questions

    Figure 1 – Array

    Question:
    What is the value at index 3? State the complexity of direct access.

    Key:
    40; direct indexed access is O(1).

    AI Rubric / Key Criteria:
    Identifies index 3 correctly • States O(1) complexity

    Part E – General AI Rubric
    All student responses must be graded according to technical precision and clarity.
    """

    res = DocumentExtractor.extract_from_text(raw_reference_paper)
    assert res.success is True
    assert res.extracted_count == 6  # 2 MCQs + 2 Short Answers + 1 Long Answer + 1 Image Question

    # 1. Part A - MCQ 1
    q1 = res.questions[0]
    assert q1.question_text == "Which data structure follows the LIFO principle?"
    assert not q1.question_text.startswith("1.")
    assert "Key:" not in q1.question_text
    assert q1.question_type == QuestionType.MCQ
    assert len(q1.options) == 4
    assert q1.options[0].option_text == "Queue"
    assert q1.options[1].option_text == "Stack"
    assert q1.options[1].is_correct is True
    assert q1.options[0].is_correct is False
    assert q1.answer_key == "B"
    assert "Stack" in q1.model_answer
    assert q1.evaluation_guidelines == "Identifies LIFO • Selects Stack"
    assert "AI Rubric" not in q1.model_answer
    assert q1.is_valid is True

    # 2. Part A - MCQ 2
    q2 = res.questions[1]
    assert q2.question_text == "What is the time complexity of accessing an element by index in an array?"
    assert q2.question_type == QuestionType.MCQ
    assert len(q2.options) == 4
    assert q2.options[0].option_text == "O(1)"
    assert q2.options[0].is_correct is True
    assert q2.answer_key == "A"
    assert q2.evaluation_guidelines == "Recognizes direct address calculation • Selects O(1)"

    # 3. Part B - Short Answer 1
    q3 = res.questions[2]
    assert q3.question_text == "Define a data structure."
    assert not q3.question_text.startswith("1.")
    assert q3.question_type == QuestionType.SHORT_ANSWER
    assert q3.model_answer == "A data structure is a method of organizing and storing data so that it can be accessed and modified efficiently."
    assert not q3.model_answer.startswith("Key Answer:")
    assert "AI Rubric" not in q3.model_answer
    assert "Gives a clear definition" in q3.evaluation_guidelines

    # 4. Part B - Short Answer 2
    q4 = res.questions[3]
    assert q4.question_text == "State the difference between Linear and Non-Linear data structures."
    assert q4.question_type == QuestionType.SHORT_ANSWER
    assert "sequential" in q4.model_answer.lower()
    assert "Explains sequential vs hierarchical" in q4.evaluation_guidelines

    # 5. Part C - Long Answer 1
    q5 = res.questions[4]
    assert q5.question_text == "Explain arrays and their operations."
    assert q5.question_type == QuestionType.LONG_ANSWER
    assert "An array stores elements in contiguous memory locations." in q5.model_answer
    assert not q5.model_answer.startswith("Model Key")
    assert "AI Rubric" not in q5.model_answer
    assert "Definition and contiguous storage" in q5.evaluation_guidelines

    # 6. Part D - Image Question 1
    q6 = res.questions[5]
    assert q6.question_text == "What is the value at index 3? State the complexity of direct access."
    assert "Figure 1" not in q6.question_text
    assert q6.question_type == QuestionType.IMAGE_UPLOAD
    assert q6.model_answer == "40; direct indexed access is O(1)."
    assert not q6.model_answer.startswith("Key:")
    assert "Identifies index 3 correctly" in q6.evaluation_guidelines


def test_document_extractor_simple_excel():
    """Test standard Question | Answer format in Excel"""
    wb = Workbook()
    ws = wb.active
    ws.title = "Simple Questions"
    ws.append(["Question", "Answer", "Marks", "Subject"])
    ws.append(["What is the function of DNS?", "Domain Name System resolves IP addresses.", 2, "Networking"])
    ws.append(["What is an IP address?", "A numerical label assigned to each device connected to a network.", 3, "Networking"])
    
    buf = io.BytesIO()
    wb.save(buf)
    excel_bytes = buf.getvalue()

    res = DocumentExtractor.extract_from_excel(excel_bytes, filename="simple_q.xlsx")
    assert res.success is True
    assert res.extracted_count == 2
    assert res.questions[0].question_text == "What is the function of DNS?"
    assert res.questions[0].model_answer == "Domain Name System resolves IP addresses."
    assert res.questions[0].marks == 2.0
    assert res.questions[1].question_text == "What is an IP address?"
    assert res.questions[1].model_answer == "A numerical label assigned to each device connected to a network."

def test_document_extractor_mcq_excel():
    """Test MCQ columns: Question | Option A | Option B | Option C | Option D | Correct Answer"""
    wb = Workbook()
    ws = wb.active
    ws.title = "MCQ Sheet"
    ws.append(["Question Text", "Option A", "Option B", "Option C", "Option D", "Correct Answer"])
    ws.append(["Which language is used for web styling?", "Python", "CSS", "C++", "Java", "B"])
    ws.append(["Which protocol is secure?", "HTTP", "HTTPS", "FTP", "Telnet", "HTTPS"])
    
    buf = io.BytesIO()
    wb.save(buf)
    excel_bytes = buf.getvalue()

    res = DocumentExtractor.extract_from_excel(excel_bytes, filename="mcq.xlsx")
    assert res.success is True
    assert res.extracted_count == 2
    
    q1 = res.questions[0]
    assert q1.question_type == QuestionType.MCQ
    assert len(q1.options) == 4
    assert q1.options[1].option_text == "CSS"
    assert q1.options[1].is_correct is True

    q2 = res.questions[1]
    assert q2.question_type == QuestionType.MCQ
    assert q2.options[1].option_text == "HTTPS"
    assert q2.options[1].is_correct is True

def test_document_extractor_word_numbered_and_cleaned():
    """Test numbered Word questions like Q1. ... Ans: ..."""
    doc = Document()
    doc.add_paragraph("Q1. What is HTML?\nAns: HyperText Markup Language.")
    doc.add_paragraph("Q2. What is CSS?\nAns: Cascading Style Sheets.")
    doc.add_paragraph("Question 3: What is JavaScript?\nAnswer: A scripting language used for web development.")

    buf = io.BytesIO()
    doc.save(buf)
    docx_bytes = buf.getvalue()

    res = DocumentExtractor.extract_from_docx(docx_bytes, filename="web.docx")
    assert res.success is True
    assert res.extracted_count == 3
    
    assert res.questions[0].question_text == "What is HTML?"
    assert res.questions[0].model_answer == "HyperText Markup Language."
    
    assert res.questions[1].question_text == "What is CSS?"
    assert res.questions[1].model_answer == "Cascading Style Sheets."

    assert res.questions[2].question_text == "What is JavaScript?"
    assert res.questions[2].model_answer == "A scripting language used for web development."

def test_document_extractor_word_tables():
    """Test Word document with tables"""
    doc = Document()
    table = doc.add_table(rows=1, cols=6)
    hdr = table.rows[0].cells
    hdr[0].text = "Question"
    hdr[1].text = "Option A"
    hdr[2].text = "Option B"
    hdr[3].text = "Option C"
    hdr[4].text = "Option D"
    hdr[5].text = "Correct Answer"

    row = table.add_row().cells
    row[0].text = "What is the capital of France?"
    row[1].text = "Berlin"
    row[2].text = "Madrid"
    row[3].text = "Paris"
    row[4].text = "Rome"
    row[5].text = "C"

    buf = io.BytesIO()
    doc.save(buf)
    docx_bytes = buf.getvalue()

    res = DocumentExtractor.extract_from_docx(docx_bytes, filename="table_test.docx")
    assert res.success is True
    assert res.extracted_count == 1
    assert res.questions[0].question_text == "What is the capital of France?"
    assert res.questions[0].options[2].option_text == "Paris"
    assert res.questions[0].options[2].is_correct is True

def test_missing_answer_flagging():
    """Test question without answer marks answer_status as NOT_DETECTED"""
    raw_text = """
    1. Explain the working principle of a Transformer in electrical engineering.
    """
    res = DocumentExtractor.extract_from_text(raw_text)
    assert res.success is True
    assert res.extracted_count == 1
    q = res.questions[0]
    assert q.answer_status == "NOT_DETECTED"
    assert any("could not be detected" in w for w in q.validation_warnings)

def test_duplicate_question_detection_and_replace(examiner_token):
    client = TestClient(app)
    db = DocTestSessionLocal()
    
    # Insert an existing question in Question Bank
    existing_q = Question(
        question_text="What is the difference between TCP and UDP in computer networking?",
        question_type=QuestionType.SHORT_ANSWER,
        subject="Computer Networks",
        difficulty=DifficultyLevel.MEDIUM,
        max_marks=5.0,
        model_answer="TCP is connection oriented whereas UDP is connectionless.",
        created_by=1
    )
    db.add(existing_q)
    db.commit()
    db.refresh(existing_q)
    existing_id = existing_q.id
    db.close()

    # Extract text containing a duplicate of this question
    sample_text = """
    1. What is the difference between TCP and UDP in computer networking?
    Ans: TCP is reliable and connection-oriented, UDP is datagram-oriented.
    """
    res = DocumentExtractor.extract_from_text(sample_text, db=DocTestSessionLocal())
    assert res.success is True
    assert res.extracted_count == 1
    assert res.duplicate_count == 1
    assert res.questions[0].is_duplicate is True
    assert res.questions[0].duplicate_question_id == existing_id

    # Test Batch Create with replacement
    batch_payload = {
        "questions": [
            {
                "question_text": res.questions[0].question_text,
                "question_type": "SHORT_ANSWER",
                "subject": "Computer Networks",
                "difficulty": "HARD",
                "marks": 6.0,
                "negative_marks": 0.0,
                "model_answer": "Updated: TCP is reliable with 3-way handshake; UDP is faster without handshakes.",
                "replace_question_id": existing_id
            }
        ]
    }
    resp = client.post(
        "/api/questions/batch-create",
        json=batch_payload,
        headers={"Authorization": f"Bearer {examiner_token}"}
    )
    assert resp.status_code == 201
    resp_json = resp.json()
    assert resp_json["updated_count"] == 1

    # Verify DB question was updated in place
    db = DocTestSessionLocal()
    updated = db.query(Question).filter(Question.id == existing_id).first()
    assert updated.max_marks == 6.0
    assert "Updated: TCP is reliable" in updated.model_answer
    db.close()

def test_api_extract_document_upload(examiner_token):
    client = TestClient(app)
    excel_bytes = DocumentExtractor.generate_excel_template()

    files = {
        "file": ("test_questions.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    }
    data = {
        "default_subject": "Cybersecurity",
        "default_difficulty": "HARD",
        "default_marks": "2.0"
    }
    response = client.post(
        "/api/questions/extract-document",
        files=files,
        data=data,
        headers={"Authorization": f"Bearer {examiner_token}"}
    )
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["success"] is True
    assert res_json["extracted_count"] == 5

def test_api_batch_create_and_templates(examiner_token):
    client = TestClient(app)
    
    # Template downloads
    res_xlsx = client.get("/api/questions/templates/excel")
    assert res_xlsx.status_code == 200
    assert len(res_xlsx.content) > 1000

    res_docx = client.get("/api/questions/templates/word")
    assert res_docx.status_code == 200
    assert len(res_docx.content) > 1000

    res_csv = client.get("/api/questions/templates/csv")
    assert res_csv.status_code == 200
    assert "Question Text" in res_csv.text

def test_all_answer_extraction_formats():
    """
    Validates all answer formats requested by the user:
    1. Answer: A
    2. Ans: B
    3. Correct Answer: C
    4. Option A
    5. A)
    6. Answer: Tree (mapped to Option A)
    7. Ans: Queue (mapped to Option C)
    8. ✓ Tree (mapped to Option A)
    9. (Correct) Tree (mapped to Option A)
    10. [Correct] Tree
    11. Option with inline marker: [x] A) Tree
    12. Option with inline checkmark: ✓ A) Tree
    13. Option with trailing marker: A) Tree (Correct)
    14. Single line multiple options: A) Tree, B) Stack, C) Queue, D) Array with Answer: Tree
    """
    # 1. Text mapping: "Answer: Tree"
    t1 = """
    1. Which structure is best suited for representing hierarchical data?
    A) Tree
    B) Stack
    C) Queue
    D) Array
    Answer: Tree
    """
    res1 = DocumentExtractor.extract_from_text(t1)
    assert res1.success is True
    assert res1.extracted_count == 1
    q1 = res1.questions[0]
    assert q1.correctAnswer == "A"
    assert q1.answer_key == "A"
    assert q1.options[0].is_correct is True
    assert q1.options[1].is_correct is False
    assert q1.answer_status == "DETECTED"
    assert q1.is_valid is True
    assert len(q1.validation_warnings) == 0

    # 2. Text mapping: "Ans: Queue"
    t2 = """
    1. Which data structure operates on a FIFO basis?
    A) Tree
    B) Stack
    C) Queue
    D) Array
    Ans: Queue
    """
    res2 = DocumentExtractor.extract_from_text(t2)
    assert res2.success is True
    q2 = res2.questions[0]
    assert q2.correctAnswer == "C"
    assert q2.answer_key == "C"
    assert q2.options[2].is_correct is True
    assert q2.answer_status == "DETECTED"

    # 3. Formats: "Option A", "Ans: B", "Correct Answer: C", "A)"
    t3 = """
    1. What is question one?
    A) Opt 1
    B) Opt 2
    Option A

    2. What is question two?
    A) Opt 1
    B) Opt 2
    Ans: B

    3. What is question three?
    A) Opt 1
    B) Opt 2
    C) Opt 3
    Correct Answer: C
    """
    res3 = DocumentExtractor.extract_from_text(t3)
    assert res3.success is True
    assert res3.extracted_count == 3
    assert res3.questions[0].correctAnswer == "A"
    assert res3.questions[0].options[0].is_correct is True
    assert res3.questions[1].correctAnswer == "B"
    assert res3.questions[1].options[1].is_correct is True
    assert res3.questions[2].correctAnswer == "C"
    assert res3.questions[2].options[2].is_correct is True

    # 4. Checkmark and badge formats: "✓ Tree", "(Correct) Tree", "[Correct] Tree"
    t4 = """
    1. First checkmark question:
    A) Tree
    B) Stack
    ✓ Tree

    2. Second badge question:
    A) Tree
    B) Stack
    (Correct) Stack
    """
    res4 = DocumentExtractor.extract_from_text(t4)
    assert res4.success is True
    assert res4.questions[0].correctAnswer == "A"
    assert res4.questions[0].options[0].is_correct is True
    assert res4.questions[1].correctAnswer == "B"
    assert res4.questions[1].options[1].is_correct is True

    # 5. Inline option indicators: "✓ A) Tree", "A) Tree (Correct)", "[x] A) Tree"
    t5 = """
    1. Inline checkmark:
    ✓ A) Tree
    B) Stack

    2. Inline trailing correct:
    A) Tree
    B) Stack (Correct)

    3. Inline checkbox:
    [x] A) Tree
    [ ] B) Stack
    """
    res5 = DocumentExtractor.extract_from_text(t5)
    assert res5.success is True
    assert res5.extracted_count == 3
    assert res5.questions[0].correctAnswer == "A"
    assert res5.questions[0].options[0].is_correct is True
    assert res5.questions[0].options[0].option_text == "Tree"
    assert res5.questions[1].correctAnswer == "B"
    assert res5.questions[1].options[1].is_correct is True
    assert res5.questions[1].options[1].option_text == "Stack"
    assert res5.questions[2].correctAnswer == "A"
    assert res5.questions[2].options[0].is_correct is True
    assert res5.questions[2].options[0].option_text == "Tree"

    # 6. Single line multi-options with commas: "A) Tree, B) Stack, C) Queue, D) Array"
    t6 = """
    1. Which structure is best suited for hierarchical data?
    A) Tree, B) Stack, C) Queue, D) Array
    Answer: Tree
    """
    res6 = DocumentExtractor.extract_from_text(t6)
    assert res6.success is True
    assert res6.extracted_count == 1
    assert len(res6.questions[0].options) == 4
    assert res6.questions[0].options[0].option_text == "Tree"
    assert res6.questions[0].options[1].option_text == "Stack"
    assert res6.questions[0].correctAnswer == "A"
    assert res6.questions[0].options[0].is_correct is True

def test_ai_extract_fallback_structure():
    """
    Validates the AI extraction fallback structure:
    {
      "question": "...",
      "options": [
        {"label": "A", "text": "..."},
        {"label": "B", "text": "..."}
      ],
      "correctAnswer": "A",
      "rubric": "..."
    }
    """
    sample_text = """
    1. Which structure is best suited for representing hierarchical data? [Marks: 2]
    A) Tree
    B) Stack
    C) Queue
    D) Array
    Answer: Tree
    AI Rubric / Key Criteria: Identifies tree structure correctly
    """
    fallback_result = DocumentExtractor.ai_extract_fallback(sample_text)
    assert isinstance(fallback_result, list)
    assert len(fallback_result) == 1
    item = fallback_result[0]
    assert item["question"] == "Which structure is best suited for representing hierarchical data?"
    assert len(item["options"]) == 4
    assert item["options"][0]["label"] == "A"
    assert item["options"][0]["text"] == "Tree"
    assert item["correctAnswer"] == "A"
    assert "Identifies tree" in item["rubric"]


def test_pdf_word_excel_automatic_mcq_key_answer_selection():
    """
    Tests that key answers in ALL possible formats across Excel, Word, and PDF/Text
    automatically choose and mark the matching option (is_correct=True, correctAnswer="A", etc.)
    without requiring manual selection.
    """
    # 1. Excel with multiple key answer formats (Option letter, Option number, Option text, Prefixed key)
    wb = Workbook()
    ws = wb.active
    ws.title = "MCQ Key Selection"
    ws.append(["Question Text", "Option A", "Option B", "Option C", "Option D", "Correct Answer"])
    ws.append(["Which data structure is LIFO?", "Queue", "Stack", "Tree", "Graph", "Option B"])
    ws.append(["Which algorithm finds shortest path?", "Dijkstra", "Kruskal", "Prim", "DFS", "Dijkstra"])
    ws.append(["Which protocol is connection-oriented?", "UDP", "IP", "TCP", "ICMP", "3"])
    ws.append(["What is the base case in recursion?", "Halting condition", "Loop condition", "Memory overflow", "Stack trace", "Ans: Halting condition"])
    
    buf = io.BytesIO()
    wb.save(buf)
    excel_bytes = buf.getvalue()

    res_excel = DocumentExtractor.extract_from_excel(excel_bytes, filename="keys.xlsx")
    assert res_excel.success is True
    assert res_excel.extracted_count == 4
    
    # Q1: Correct Answer = "Option B" -> Stack (Option B) selected
    eq1 = res_excel.questions[0]
    assert eq1.correctAnswer == "B"
    assert eq1.options[1].is_correct is True
    assert eq1.options[1].option_text == "Stack"
    assert eq1.answer_status == "DETECTED"
    assert eq1.is_valid is True

    # Q2: Correct Answer = "Dijkstra" (text) -> Option A selected
    eq2 = res_excel.questions[1]
    assert eq2.correctAnswer == "A"
    assert eq2.options[0].is_correct is True
    assert eq2.options[0].option_text == "Dijkstra"
    assert eq2.answer_status == "DETECTED"

    # Q3: Correct Answer = "3" (number index) -> Option C (TCP) selected
    eq3 = res_excel.questions[2]
    assert eq3.correctAnswer == "C"
    assert eq3.options[2].is_correct is True
    assert eq3.options[2].option_text == "TCP"
    assert eq3.answer_status == "DETECTED"

    # Q4: Correct Answer = "Ans: Halting condition" -> Option A selected
    eq4 = res_excel.questions[3]
    assert eq4.correctAnswer == "A"
    assert eq4.options[0].is_correct is True
    assert eq4.answer_status == "DETECTED"

    # 2. Text / PDF / DOCX formats with embedded answer tags and trailing keys
    sample_doc_text = """
    1. Which data structure uses FIFO order? [Ans: B]
    A) Stack
    B) Queue
    C) Tree
    D) Graph

    2. Which data structure is best for hierarchical data?
    A) Tree
    B) Stack
    C) Queue
    D) Array
    Option A is correct

    3. What is the time complexity of binary search?
    A) O(1)
    B) O(N)
    C) O(log N)
    D) O(N^2)
    Ans: (C)

    4. Which sorting algorithm has worst case O(N log N)?
    A) Bubble Sort
    B) Merge Sort
    C) Quick Sort
    D) Insertion Sort
    Answer: Merge Sort
    """
    res_text = DocumentExtractor.extract_from_text(sample_doc_text)
    assert res_text.success is True
    assert res_text.extracted_count == 4

    # Q1: [Ans: B] embedded in question line
    tq1 = res_text.questions[0]
    assert tq1.correctAnswer == "B"
    assert tq1.options[1].is_correct is True
    assert tq1.options[1].option_text == "Queue"
    assert tq1.answer_status == "DETECTED"

    # Q2: "Option A is correct" trailing key
    tq2 = res_text.questions[1]
    assert tq2.correctAnswer == "A"
    assert tq2.options[0].is_correct is True
    assert tq2.options[0].option_text == "Tree"
    assert tq2.answer_status == "DETECTED"

    # Q3: "Ans: (C)" trailing key
    tq3 = res_text.questions[2]
    assert tq3.correctAnswer == "C"
    assert tq3.options[2].is_correct is True
    assert tq3.options[2].option_text == "O(log N)"
    assert tq3.answer_status == "DETECTED"

    # Q4: "Answer: Merge Sort" text key
    tq4 = res_text.questions[3]
    assert tq4.correctAnswer == "B"
    assert tq4.options[1].is_correct is True
    assert tq4.options[1].option_text == "Merge Sort"
    assert tq4.answer_status == "DETECTED"


