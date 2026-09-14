import io
import re
import csv
import json
from typing import List, Dict, Any, Optional, Tuple
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from docx import Document
from pypdf import PdfReader
from sqlalchemy.orm import Session

from app.enums.enums import QuestionType, DifficultyLevel
from app.models.question import Question as DBQuestion
from schemas import (
    ExtractedQuestion, ExtractedOption, DocumentExtractionResponse
)

class DocumentExtractor:
    """
    Intelligent Question & Answer Extractor for PDF (.pdf), Word (.docx, .doc),
    Excel (.xlsx, .xls), CSV, and raw text/paste inputs.
    
    Features:
    - Structured Section Detection (Part A MCQs, Part B Short Answer, Part C Long Answer, Part D Image Questions, Part E General Rubric)
    - Clean Question Prompt (strips leading Q1., 1., Question 1:, Figure titles, metadata)
    - Clean Answer Text (strips Key:, Key Answer:, Model Key / Expected Answer:, Ans:)
    - Multi-Choice Option & Key Mapping (extracts options A-E, maps letter key 'B' and text 'Stack', sets is_correct=True)
    - Dedicated AI Rubric extraction (separates AI Rubric / Key Criteria into evaluation_guidelines without polluting answer)
    - Zero Hallucination Missing Answer Detection (flags NOT_DETECTED with warnings)
    - Database Duplicate Detection & In-Place Replacement
    """

    @staticmethod
    def _clean_str(val: Any) -> str:
        if val is None:
            return ""
        return str(val).strip()

    @staticmethod
    def normalize_text_for_comparison(text: str) -> str:
        """
        Normalizes question text for duplicate detection (lowercase, alphanumeric only).
        """
        if not text:
            return ""
        return re.sub(r'[^a-z0-9]', '', text.lower())

    @classmethod
    def clean_question_text(cls, text: str) -> str:
        """
        Cleans question prompt so it contains ONLY the question text.
        Strips leading question numbers (e.g. "Q1.", "1. ", "Question 1:", "Question 1.", "Question: ") and metadata tags.
        """
        if not text:
            return ""
        
        # Remove leading numbering and labels e.g. "1.", "1)", "(1)", "Q1.", "Q1:", "Q.1", "Q-1", "Question 1:", "Question 1.", "Question:"
        cleaned = re.sub(
            r'^(?:(?:question|q)\s*[-_.:#]?\s*\d+[-_.:#)]?|question\s*[:\.]?|\d+\s*[-_.)\]:]|\[\d+\]|\(\d+\)|prompt\s*[:\.]?)\s*', 
            '', 
            text.strip(), 
            flags=re.IGNORECASE
        )
        
        # Strip embedded metadata tags like [Marks: 2], (5 Marks), [Difficulty: HARD], [Type: MCQ], [Ans: A], (Answer: Tree)
        cleaned = re.sub(
            r'\[\s*(?:marks?|points?|pts?|difficulty|level|type|(?:the\s+)?correct\s+(?:answer|option)|expected\s+answer|key\s+answer|answer\s+key|model\s+answer|ans(?:wer)?|key|solution|sol)\s*[:=]?\s*[^\]]*\]', 
            '', 
            cleaned, 
            flags=re.IGNORECASE
        )
        cleaned = re.sub(
            r'\(\s*(?:marks?|points?|pts?|difficulty|level|type|(?:the\s+)?correct\s+(?:answer|option)|expected\s+answer|key\s+answer|answer\s+key|model\s+answer|ans(?:wer)?|key|solution|sol)\s*[:=]?\s*[^\)]*\)', 
            '', 
            cleaned, 
            flags=re.IGNORECASE
        )

        # Normalize whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    @classmethod
    def _clean_option_text_and_check_inline_markers(cls, raw_opt_text: str) -> Tuple[str, bool]:
        """
        Cleans option text and checks for inline correctness markers like:
        - "[x]", "[X]", "✓", "✔", "☑", "*", "(Correct)", "[Correct]", "(Ans)", "(Answer)", "(Key)", "(Right)", "- Correct"
        Returns (cleaned_option_text, is_correct)
        """
        if not raw_opt_text:
            return "", False

        text = raw_opt_text.strip()
        is_correct = False

        # Check leading checkmarks / indicators
        if re.match(r'^(?:\[[xX]\]|[✓✔☑\*])\s*', text):
            is_correct = True
            text = re.sub(r'^(?:\[[xX]\]|[✓✔☑\*])\s*', '', text).strip()
        elif re.match(r'^\[\s*\]\s*', text):
            text = re.sub(r'^\[\s*\]\s*', '', text).strip()

        # Check leading (Correct) / [Correct]
        if re.match(r'^(?:[\(\[]\s*(?:correct|ans|answer|key|right|true)\s*[\)\]])\s*', text, flags=re.IGNORECASE):
            is_correct = True
            text = re.sub(r'^(?:[\(\[]\s*(?:correct|ans|answer|key|right|true)\s*[\)\]])\s*', '', text, flags=re.IGNORECASE).strip()

        # Check trailing (Correct) / [Correct] / ✓ / * / - Correct
        trailing_match = re.search(r'\s*(?:[\(\[]\s*(?:correct|ans|answer|key|right|true)\s*[\)\]]|[-–—]\s*(?:correct|ans|answer|key|right|true)|[✓✔☑\*]|\bcorrect\b|\bans\b|\bkey\b)\s*$', text, flags=re.IGNORECASE)
        if trailing_match:
            is_correct = True
            text = text[:trailing_match.start()].strip()

        # Strip trailing punctuation artifacts like comma or semicolon left over from multi-option lines
        text = re.sub(r'[,;]+$', '', text).strip()
        return text, is_correct

    @classmethod
    def clean_answer_text(cls, text: str) -> str:
        """
        Cleans answer text so it contains ONLY the answer content without leading markers.
        Strips prefixes like:
        - "Model Key / Expected Answer:", "Model Key:", "Expected Answer:", "Key Answer:", "Answer Key:", "Model Answer:"
        - "Correct Answer:", "Correct Option:", "Correct Ans:", "Right Answer:", "Right Option:", "True Option:"
        - "The correct answer is:", "The correct option is:", "Answer is:", "Ans is:", "Key is:"
        - "Answer:", "Ans:", "Ans.", "Ans -", "Answer -", "Key:", "Key.", "Key -", "Solution:", "Sol:"
        - "Option ", "Choice ", "Opt "
        - "✓", "✔", "☑", "*", "(Correct)", "[Correct]", "(Ans)", "[Ans]", "(Answer)", "(Key)"
        """
        if not text:
            return ""
        
        cleaned = text.strip()

        # 0. Strip trailing explanations/reasons if prefixed by "Explanation:" or "Reason:"
        cleaned = re.sub(r'\s*(?:\bexplanation|\breason|\bnote)\s*[:=].*$', '', cleaned, flags=re.IGNORECASE)

        # 1. Strip standard label prefixes
        cleaned = re.sub(
            r'^(?:(?:the\s+)?correct\s+(?:answer|option)(?:\s+is)?|(?:model\s+key\s*[/&]\s*)?expected(?:\s+answer)?|key\s+answer|answer\s+key|model\s+answer|right\s+(?:answer|option)|true\s+option|answer\s+is|ans\s+is|key\s+is|(?:correct\s+)?ans(?:wer)?|key|solution|sol)\s*[-–—_.:#=]?\s*', 
            '', 
            cleaned, 
            flags=re.IGNORECASE
        )

        # 2. Strip leading checkmark / star / badge symbols e.g. "✓ Tree", "* B", "[Correct] Tree"
        cleaned = re.sub(r'^(?:[✓✔☑\*]|\([xX]\)|\[[xX]\]|[\(\[]\s*(?:correct|ans|answer|key|right|true)\s*[\)\]])\s*', '', cleaned, flags=re.IGNORECASE).strip()

        # 3. Strip "Option " / "Choice " / "Opt " prefix e.g. "Option A", "Choice B", "Option (A)"
        cleaned = re.sub(r'^(?:option|choice|opt)\s*[-–—_.:#=]?\s*', '', cleaned, flags=re.IGNORECASE).strip()

        # 4. Strip trailing correctness phrases e.g. "is correct", "is the correct option", "is the right answer"
        cleaned = re.sub(
            r'\s*(?:is\s+(?:the\s+)?(?:correct|right|true)\s*(?:answer|option)?|is\s+correct|is\s+right|is\s+true)\s*$', 
            '', 
            cleaned, 
            flags=re.IGNORECASE
        ).strip()

        # 5. Normalize whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    @classmethod
    def extract_mcq_key_and_text(cls, raw_ans: str, options: Optional[List[Any]] = None) -> Tuple[Optional[str], Optional[str]]:
        """
        Intelligently extracts the option letter (e.g. 'B') and clean text (e.g. 'Stack') from ANY key answer string.
        Supports all common formats:
        - "Answer: A" / "Ans: B" / "Correct Answer: C" / "Option A" / "A)" / "(A)" / "[A]" / "A." / "A"
        - "Option 1" / "1" (maps 1->A, 2->B, etc.)
        - "Answer: Tree" / "Ans: Queue" / "✓ Tree" / "(Correct) Tree" / "[Correct] Tree" / "(Ans) Tree" / "* Tree"
        - "A) Tree" / "(A) Tree" / "Option A: Tree" / "Option A - Tree" / "A - Tree"
        - Text-to-Option Letter Mapping: compares answer text with option texts and automatically sets key_letter and is_correct.
        """
        if not raw_ans:
            return None, None

        cleaned = cls.clean_answer_text(raw_ans)
        if not cleaned:
            return None, None

        key_letter = None
        clean_text = None

        # Helper to strip option prefixes from option text e.g. "A) Tree" -> "Tree"
        def strip_opt_prefix(t: str) -> str:
            if not t:
                return ""
            return re.sub(r'^(?:[\(\[]?[A-Ha-h0-9][\)\]\.\:\-\—–\s]+)\s*', '', t.strip()).strip()

        # Helper for alphanumeric normalized comparison
        def norm_alpha(t: str) -> str:
            if not t:
                return ""
            return re.sub(r'[^a-z0-9]', '', t.lower())

        # Pattern 0: Multiple option keys e.g. "A, B, D" or "A and B" or "A, B" or "A; B"
        multi_keys = [k.strip().upper() for k in re.split(r'[,;&\s]+|\band\b', cleaned) if k.strip() and len(k.strip()) == 1 and k.strip().upper() in "ABCDEFGH"]
        if len(multi_keys) > 1:
            key_letter = ", ".join(multi_keys)
            if options:
                for idx, opt in enumerate(options):
                    tag = chr(65 + idx)
                    if tag in multi_keys:
                        if hasattr(opt, "is_correct"):
                            opt.is_correct = True
                        if hasattr(opt, "label"):
                            opt.label = tag
            return key_letter, None

        # Pattern 1: Starts with letter like "B) Stack", "B. Stack", "(B) Stack", "[B] Stack", "B - Stack", "B: Stack", "B Stack"
        m_letter_text = re.match(r'^(?:[\(\[]?([A-Ha-h])[\)\]\.\:\-\—–\s]+)\s*(.*)$', cleaned)
        if m_letter_text:
            key_letter = m_letter_text.group(1).upper()
            rem = m_letter_text.group(2).strip()
            if rem:
                clean_text = rem

        # Pattern 2: Single letter e.g. "B", "(B)", "[B]", "b", "B.", "B)"
        if not key_letter:
            m_single = re.match(r'^(?:[\(\[]?([A-Ha-h])[\)\]\.]?)$', cleaned)
            if m_single:
                key_letter = m_single.group(1).upper()

        # Pattern 3: Number option e.g. "1", "2", "3", "4" -> "A", "B", "C", "D"
        if not key_letter:
            m_num = re.match(r'^(?:option\s+|choice\s+)?[\(\[]?([1-8])[\)\]\.]?$', cleaned, re.IGNORECASE)
            if m_num:
                num_idx = int(m_num.group(1)) - 1
                if 0 <= num_idx < 8:
                    key_letter = chr(65 + num_idx)

        # Pattern 4: If options are provided, perform smart matching (Key Letter OR Text-to-Option Letter Mapping)
        if options:
            if key_letter:
                # We have a key letter; find matching option and populate clean_text and is_correct
                for idx, opt in enumerate(options):
                    tag = chr(65 + idx)
                    opt_text = opt.option_text if hasattr(opt, "option_text") else (opt.get("text") or opt.get("option_text") or "")
                    if tag == key_letter:
                        if not clean_text and opt_text:
                            clean_text = strip_opt_prefix(opt_text) or opt_text
                        if hasattr(opt, "is_correct"):
                            opt.is_correct = True
                        if hasattr(opt, "label"):
                            opt.label = tag
                        break
            else:
                # Text-to-Option Letter Mapping: Compare cleaned answer text with all option texts
                target_norm = norm_alpha(cleaned)
                target_clean = strip_opt_prefix(cleaned).lower()

                # Level 1: Exact stripped match
                matched_idx = None
                for idx, opt in enumerate(options):
                    opt_raw = opt.option_text if hasattr(opt, "option_text") else (opt.get("text") or opt.get("option_text") or "")
                    opt_stripped = strip_opt_prefix(opt_raw).lower()
                    if opt_stripped and opt_stripped == target_clean:
                        matched_idx = idx
                        clean_text = opt_raw
                        break

                # Level 2: Alphanumeric normalized match
                if matched_idx is None and target_norm:
                    for idx, opt in enumerate(options):
                        opt_raw = opt.option_text if hasattr(opt, "option_text") else (opt.get("text") or opt.get("option_text") or "")
                        opt_norm = norm_alpha(strip_opt_prefix(opt_raw)) or norm_alpha(opt_raw)
                        if opt_norm and opt_norm == target_norm:
                            matched_idx = idx
                            clean_text = opt_raw
                            break

                # Level 3: Substring containment match if unambiguous
                if matched_idx is None and len(target_clean) >= 3:
                    candidate_indices = []
                    for idx, opt in enumerate(options):
                        opt_raw = opt.option_text if hasattr(opt, "option_text") else (opt.get("text") or opt.get("option_text") or "")
                        opt_clean = strip_opt_prefix(opt_raw).lower()
                        if target_clean in opt_clean or opt_clean in target_clean:
                            candidate_indices.append(idx)
                    if len(candidate_indices) == 1:
                        matched_idx = candidate_indices[0]
                        opt_raw = options[matched_idx].option_text if hasattr(options[matched_idx], "option_text") else (options[matched_idx].get("text") or "")
                        clean_text = opt_raw

                if matched_idx is not None:
                    key_letter = chr(65 + matched_idx)
                    opt = options[matched_idx]
                    if hasattr(opt, "is_correct"):
                        opt.is_correct = True
                    if hasattr(opt, "label"):
                        opt.label = key_letter

        return key_letter, (clean_text if clean_text else cleaned)

    @classmethod
    def clean_rubric_text(cls, text: str) -> str:
        """
        Cleans rubric / evaluation criteria text by stripping leading markers.
        """
        if not text:
            return ""
        cleaned = re.sub(
            r'^(?:ai\s+rubric\s*[/&]\s*key\s+criteria|ai\s+rubric|key\s+criteria|evaluation\s+(?:rubric|criteria|guidelines)|rubric|grading\s+criteria)\s*[-_.:#]?\s*',
            '',
            text.strip(),
            flags=re.IGNORECASE
        )
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    @classmethod
    def detect_section_header(cls, line: str) -> Optional[Tuple[str, Optional[QuestionType]]]:
        """
        Detects section headers and titles like:
        - "DATA STRUCTURES – EXAM QUESTION BANK" (Title - noise)
        - "Part A – MCQs" -> ("Part A", QuestionType.MCQ)
        - "Part B – Short Answer Questions" -> ("Part B", QuestionType.SHORT_ANSWER)
        - "Part C – Long Answer Questions" -> ("Part C", QuestionType.LONG_ANSWER)
        - "Part D – Image / Diagram-Based Questions" -> ("Part D", QuestionType.IMAGE_UPLOAD)
        - "Part E – General AI Rubric" -> ("Part E", None)
        """
        if not line:
            return None
        trimmed = line.strip()
        lower = trimmed.lower()

        # Document Title detection
        if any(w in lower for w in ["exam question bank", "question bank", "examination paper", "sample questions"]) and any(w in lower for w in ["data structures", "computer science", "midterm", "final", "exam"]):
            return ("DOCUMENT_TITLE", None)

        # Check Part / Section patterns e.g. "Part A – MCQs", "Part B: Short Answer", "Section 1: Multiple Choice"
        part_match = re.match(r'^(?:part|section)\s+([a-z0-9]+)\s*[-–—:]\s*(.*)$', trimmed, re.IGNORECASE)
        if part_match:
            sec_id = part_match.group(1).upper()
            sec_title = part_match.group(2).strip().lower()
            if "mcq" in sec_title or "multiple choice" in sec_title or sec_id == "A":
                return (f"Part {sec_id}", QuestionType.MCQ)
            elif "short" in sec_title or sec_id == "B":
                return (f"Part {sec_id}", QuestionType.SHORT_ANSWER)
            elif "long" in sec_title or "essay" in sec_title or "descriptive" in sec_title or sec_id == "C":
                return (f"Part {sec_id}", QuestionType.LONG_ANSWER)
            elif "image" in sec_title or "diagram" in sec_title or "figure" in sec_title or sec_id == "D":
                return (f"Part {sec_id}", QuestionType.IMAGE_UPLOAD)
            elif "rubric" in sec_title or "general" in sec_title or sec_id == "E":
                return (f"Part {sec_id}", None)
            return (f"Part {sec_id}", None)

        # Check standalone section headings e.g. "PART A", "PART B", "SECTION A"
        if re.match(r'^(?:part|section)\s+([a-z0-9]+)$', trimmed, re.IGNORECASE):
            sec_id = trimmed.split()[-1].upper()
            if sec_id == "A":
                return (f"Part {sec_id}", QuestionType.MCQ)
            elif sec_id == "B":
                return (f"Part {sec_id}", QuestionType.SHORT_ANSWER)
            elif sec_id == "C":
                return (f"Part {sec_id}", QuestionType.LONG_ANSWER)
            elif sec_id == "D":
                return (f"Part {sec_id}", QuestionType.IMAGE_UPLOAD)
            return (f"Part {sec_id}", None)

        if re.match(r'^general\s+ai\s+rubric', lower):
            return ("GENERAL_RUBRIC", None)

        return None

    @staticmethod
    def is_noise_line(line: str) -> bool:
        """
        Detects document artifacts (page numbers, headers, footers, exam instructions) in PDFs/Docs.
        """
        lower = line.strip().lower()
        if not lower:
            return True
        
        # Page numbers e.g. "Page 1 of 5", "Page 2", "- 1 -", "1 / 4", "Page 1"
        if re.match(r'^(?:page\s+\d+(?:\s+of\s+\d+)?|\-?\s*\d+\s*\-?|\d+\s*/\s*\d+)$', lower):
            return True
        
        # Common exam document noise headers
        noise_keywords = [
            "final examination", "midterm examination", "semester examination",
            "department of", "faculty of", "university of", "institute of technology",
            "time allowed:", "duration:", "maximum marks:", "total marks:",
            "course code:", "subject code:", "academic year", "all rights reserved",
            "confidential", "instructions to candidates:", "read instructions carefully"
        ]
        if any(lower.startswith(k) or lower == k for k in noise_keywords):
            return True
        
        return False

    @staticmethod
    def _parse_difficulty(val: str, default: DifficultyLevel = DifficultyLevel.MEDIUM) -> DifficultyLevel:
        if not val:
            return default
        clean = val.strip().upper()
        if "EASY" in clean or "LOW" in clean or "BASIC" in clean:
            return DifficultyLevel.EASY
        if "HARD" in clean or "HIGH" in clean or "ADVANCED" in clean or "DIFFICULT" in clean:
            return DifficultyLevel.HARD
        return DifficultyLevel.MEDIUM

    @staticmethod
    def _parse_question_type(
        val: str, 
        options: List[ExtractedOption], 
        marks: float = 1.0, 
        text: str = "",
        section_hint: Optional[QuestionType] = None
    ) -> QuestionType:
        if val:
            clean = val.strip().upper().replace(" ", "_").replace("-", "_")
            if "MULTI" in clean or "CHECKBOX" in clean or "MULTIPLE_SELECT" in clean:
                return QuestionType.MULTI_SELECT
            if "MCQ" in clean or "SINGLE" in clean or "CHOICE" in clean:
                return QuestionType.MCQ
            if "SHORT" in clean or "BRIEF" in clean:
                return QuestionType.SHORT_ANSWER
            if "LONG" in clean or "ESSAY" in clean or "DESCRIPTIVE" in clean:
                return QuestionType.LONG_ANSWER
            if "IMAGE" in clean or "UPLOAD" in clean or "DIAGRAM" in clean or "DRAW" in clean:
                return QuestionType.IMAGE_UPLOAD

        # Infer from options
        if options and len(options) >= 2:
            correct_count = sum(1 for o in options if o.is_correct)
            if correct_count > 1:
                return QuestionType.MULTI_SELECT
            return QuestionType.MCQ

        # Section hint takes precedence for subjective/image
        if section_hint is not None:
            return section_hint

        lower_text = text.lower()
        if any(w in lower_text for w in ["draw", "sketch", "upload diagram", "circuit schematic", "block diagram", "architecture diagram", "state transition diagram"]):
            return QuestionType.IMAGE_UPLOAD

        if marks >= 8.0 or len(text) > 200:
            return QuestionType.LONG_ANSWER
        
        return QuestionType.SHORT_ANSWER

    @classmethod
    def validate_and_tag_question(cls, q: ExtractedQuestion) -> ExtractedQuestion:
        warnings = []
        q.is_valid = True

        if not q.question_text or len(q.question_text.strip()) < 4:
            warnings.append("Question prompt is too short or missing.")
            q.is_valid = False

        # Tag option labels and check inline markers for MCQ/Multi-select
        if q.options:
            for idx, opt in enumerate(q.options):
                opt.label = chr(65 + idx)
                clean_t, is_inline = cls._clean_option_text_and_check_inline_markers(opt.option_text)
                opt.option_text = clean_t
                if is_inline:
                    opt.is_correct = True

        # Sync answer_key / correctAnswer
        effective_key = q.correctAnswer or q.answer_key
        if effective_key and q.options:
            keys = [k.strip().upper() for k in re.split(r'[,;&]', effective_key) if k.strip()]
            for k in keys:
                for idx, opt in enumerate(q.options):
                    tag = chr(65 + idx)
                    if tag == k:
                        opt.is_correct = True

        # If no option is marked correct yet, try inferring from expected_answer, model_answer, answer_key, or correctAnswer
        if q.options and not any(o.is_correct for o in q.options):
            for candidate in [q.expected_answer, q.model_answer, q.answer_key, q.correctAnswer]:
                if candidate:
                    inferred_key, clean_txt = cls.extract_mcq_key_and_text(candidate, q.options)
                    if inferred_key:
                        q.answer_key = inferred_key
                        q.correctAnswer = inferred_key
                        keys = [k.strip().upper() for k in re.split(r'[,;&]', inferred_key) if k.strip()]
                        for idx, opt in enumerate(q.options):
                            tag = chr(65 + idx)
                            if tag in keys:
                                opt.is_correct = True
                        break
                    else:
                        # Direct fallback: check if candidate text matches option text
                        cand_clean = cls.clean_answer_text(candidate).strip().lower()
                        if cand_clean:
                            for idx, opt in enumerate(q.options):
                                opt_clean = opt.option_text.strip().lower()
                                if opt_clean and (opt_clean == cand_clean or cand_clean == re.sub(r'[^a-z0-9]', '', opt_clean)):
                                    opt.is_correct = True
                                    tag = chr(65 + idx)
                                    q.answer_key = tag
                                    q.correctAnswer = tag
                                    break
                if any(o.is_correct for o in q.options):
                    break

        # If options now have correct options, ensure answer_key & correctAnswer are populated
        if q.options and any(o.is_correct for o in q.options):
            correct_tags = [chr(65 + idx) for idx, o in enumerate(q.options) if o.is_correct]
            q.answer_key = ", ".join(correct_tags)
            q.correctAnswer = q.answer_key
            if not q.model_answer:
                q.model_answer = ", ".join([o.option_text for o in q.options if o.is_correct])

        if q.question_type in [QuestionType.MCQ, QuestionType.MULTI_SELECT]:
            if len(q.options) < 2:
                warnings.append("Multiple choice questions require at least 2 options.")
                q.is_valid = False
            else:
                correct_count = sum(1 for o in q.options if o.is_correct)
                if correct_count == 0:
                    q.answer_status = "NOT_DETECTED"
                    warnings.append("No correct answer detected. Please choose the correct option.")
                    q.is_valid = False
                elif q.question_type == QuestionType.MCQ and correct_count > 1:
                    # Upgrade to MULTI_SELECT if multiple correct answers marked
                    q.question_type = QuestionType.MULTI_SELECT
                    q.answer_status = "DETECTED"
                    warnings.append("Multiple correct answers detected; converted to Multi-Select.")
                else:
                    q.answer_status = "DETECTED"
        else:
            # Subjective questions
            if not q.model_answer and not q.expected_answer:
                q.answer_status = "NOT_DETECTED"
                warnings.append("Answer could not be detected from document. Please review or enter answer.")
            else:
                q.answer_status = "DETECTED"

        if q.marks <= 0:
            q.marks = 1.0

        # Sync rubric field
        if q.evaluation_guidelines and not q.rubric:
            q.rubric = q.evaluation_guidelines
        elif q.rubric and not q.evaluation_guidelines:
            q.evaluation_guidelines = q.rubric

        q.validation_warnings = warnings
        return q

    @classmethod
    def check_duplicates_against_db(
        cls, 
        questions: List[ExtractedQuestion], 
        db: Optional[Session] = None
    ) -> Tuple[List[ExtractedQuestion], int]:
        """
        Checks extracted questions against existing questions in the database.
        Flags duplicates with is_duplicate=True and records existing ID.
        """
        if not db or not questions:
            return questions, 0

        duplicate_count = 0
        try:
            # Fetch existing questions
            existing_records = db.query(DBQuestion.id, DBQuestion.question_text).all()
            if not existing_records:
                return questions, 0

            # Build lookup of normalized text -> (id, original_text)
            lookup: Dict[str, Tuple[int, str]] = {}
            for eq_id, eq_text in existing_records:
                norm = cls.normalize_text_for_comparison(eq_text)
                if norm and len(norm) > 8:
                    lookup[norm] = (eq_id, eq_text)

            for q in questions:
                norm_q = cls.normalize_text_for_comparison(q.question_text)
                if norm_q and norm_q in lookup:
                    match_id, match_text = lookup[norm_q]
                    q.is_duplicate = True
                    q.duplicate_question_id = match_id
                    q.duplicate_question_text = match_text
                    q.duplicate_action = "IMPORT"  # Default
                    q.validation_warnings.append(f"Duplicate of Question #{match_id} in Question Bank.")
                    duplicate_count += 1

        except Exception as e:
            print(f"Warning: Duplicate check encountered an issue: {e}")

        return questions, duplicate_count

    # -------------------------------------------------------------
    # 1. EXCEL (.xlsx, .xls) & CSV EXTRACTION
    # -------------------------------------------------------------
    @classmethod
    def extract_from_excel(
        cls,
        file_bytes: bytes,
        filename: str = "questions.xlsx",
        default_subject: str = "Computer Science & Engineering",
        default_difficulty: DifficultyLevel = DifficultyLevel.MEDIUM,
        default_marks: float = 1.0,
        db: Optional[Session] = None
    ) -> DocumentExtractionResponse:
        questions: List[ExtractedQuestion] = []
        try:
            wb = load_workbook(filename=io.BytesIO(file_bytes), data_only=True)
            if not wb.sheetnames:
                return DocumentExtractionResponse(
                    success=False, source_format="Excel", filename=filename,
                    extracted_count=0, valid_count=0, warning_count=0, duplicate_count=0, questions=[],
                    message="The uploaded Excel workbook contains no sheets."
                )

            # Iterate through sheets, prioritizing question sheets and ignoring instruction sheets
            for sheet_name in wb.sheetnames:
                sheet_lower = sheet_name.lower()
                if any(k in sheet_lower for k in ["instruction", "guideline", "readme", "about", "help"]):
                    continue

                sheet = wb[sheet_name]
                rows = list(sheet.iter_rows(values_only=True))
                if not rows or len(rows) < 2:
                    continue

                # Find header row
                header_row_idx = 0
                header_map: Dict[str, int] = {}
                for r_idx, row in enumerate(rows[:5]):
                    row_str = [str(c).strip().lower() for c in row if c is not None]
                    if any(any(k == cell or k in cell for k in ["question text", "question", "prompt", "q_text", "problem", "q."]) for cell in row_str):
                        header_row_idx = r_idx
                        for col_idx, cell in enumerate(row):
                            if cell is not None:
                                norm_col = str(cell).strip().lower().replace(" ", "_").replace("-", "_").replace(".", "")
                                header_map[norm_col] = col_idx
                        break

                if not header_map:
                    for col_idx, cell in enumerate(rows[0]):
                        if cell is not None:
                            norm_col = str(cell).strip().lower().replace(" ", "_").replace("-", "_").replace(".", "")
                            header_map[norm_col] = col_idx

                def get_val(row_data: Tuple, *aliases: str) -> str:
                    for alias in aliases:
                        norm_alias = alias.lower().replace(" ", "_").replace("-", "_").replace(".", "")
                        for col_name, idx in header_map.items():
                            if col_name == norm_alias or (len(norm_alias) >= 3 and norm_alias in col_name):
                                if idx < len(row_data) and row_data[idx] is not None:
                                    return str(row_data[idx]).strip()
                    return ""

                for row in rows[header_row_idx + 1:]:
                    if not any(row):
                        continue

                    raw_q_text = get_val(row, "question_text", "question", "prompt", "question_prompt", "problem", "q", "q_", "title", "item")
                    if not raw_q_text or len(raw_q_text) < 3:
                        continue

                    # Ignore instruction rows like "Column Name", "Question Text", "Text (min 5 characters)"
                    if raw_q_text.strip().lower() in ["question text", "column name", "required", "description", "item"]:
                        continue

                    q_text = cls.clean_question_text(raw_q_text)
                    if not q_text or len(q_text) < 3:
                        continue

                    q_type_str = get_val(row, "question_type", "type", "format", "category", "q_type")
                    subject_str = get_val(row, "subject", "topic", "discipline", "course", "module") or default_subject
                    diff_str = get_val(row, "difficulty", "diff", "level")
                    marks_str = get_val(row, "marks", "mark", "max_marks", "points", "pts", "score")
                    neg_marks_str = get_val(row, "negative_marks", "negative", "penalty", "minus_marks")
                    raw_model_ans = get_val(row, "model_answer", "answer_key", "explanation", "solution", "rationale", "expected_answer")
                    raw_rubric = get_val(row, "evaluation_guidelines", "guidelines", "rubric", "ai_rubric", "key_criteria")

                    # Parse marks
                    try:
                        marks = float(marks_str) if marks_str else default_marks
                    except ValueError:
                        marks = default_marks

                    try:
                        neg_marks = float(neg_marks_str) if neg_marks_str else 0.0
                    except ValueError:
                        neg_marks = 0.0

                    diff = cls._parse_difficulty(diff_str, default_difficulty)

                    # Options extraction (A - E)
                    opt_a = get_val(row, "option_a", "option_1", "opt_a", "opt_1", "choice_a", "choice_1", "a", "opt1", "choice1")
                    opt_b = get_val(row, "option_b", "option_2", "opt_b", "opt_2", "choice_b", "choice_2", "b", "opt2", "choice2")
                    opt_c = get_val(row, "option_c", "option_3", "opt_c", "opt_3", "choice_c", "choice_3", "c", "opt3", "choice3")
                    opt_d = get_val(row, "option_d", "option_4", "opt_d", "opt_4", "choice_d", "choice_4", "d", "opt4", "choice4")
                    opt_e = get_val(row, "option_e", "option_5", "opt_e", "opt_5", "choice_e", "choice_5", "e", "opt5", "choice5")

                    correct_ans_raw = get_val(row, "correct_answer", "correct_option", "answer", "ans", "key", "solution", "correct")

                    options_list: List[ExtractedOption] = []
                    raw_opts = [("A", opt_a), ("B", opt_b), ("C", opt_c), ("D", opt_d), ("E", opt_e)]
                    
                    # Combined options column fallback
                    if not any([opt_a, opt_b, opt_c, opt_d]):
                        combined_opts = get_val(row, "options", "choices", "all_options")
                        if combined_opts:
                            split_opts = re.split(r'[;\n|]', combined_opts)
                            for idx, opt_item in enumerate(split_opts):
                                clean_opt = opt_item.strip()
                                if clean_opt:
                                    options_list.append(ExtractedOption(option_text=clean_opt, is_correct=False))

                    if not options_list:
                        for tag, text_opt in raw_opts:
                            if text_opt:
                                options_list.append(ExtractedOption(option_text=text_opt, is_correct=False))

                    ans_key_letter = None
                    extracted_correct_text = None
                    # Identify correct options
                    if options_list and correct_ans_raw:
                        key_letter, clean_text = cls.extract_mcq_key_and_text(correct_ans_raw, options_list)
                        if key_letter:
                            ans_key_letter = key_letter
                            extracted_correct_text = clean_text
                            for idx, opt in enumerate(options_list):
                                tag = chr(65 + idx)
                                opt.is_correct = (tag == key_letter)
                        else:
                            extracted_correct_text = clean_text or correct_ans_raw
                            for idx, opt in enumerate(options_list):
                                tag = chr(65 + idx)
                                if clean_text and opt.option_text.strip().lower() == clean_text.strip().lower():
                                    opt.is_correct = True
                                    ans_key_letter = tag
                                elif any(k.strip().upper() == tag for k in re.split(r'[,;&]', correct_ans_raw)):
                                    opt.is_correct = True
                                    if not ans_key_letter:
                                        ans_key_letter = tag

                    # Subjective model answer cleaning
                    model_ans = cls.clean_answer_text(raw_model_ans)
                    if not options_list and not model_ans and correct_ans_raw:
                        model_ans = cls.clean_answer_text(correct_ans_raw)

                    q_type = cls._parse_question_type(q_type_str, options_list, marks, q_text)

                    eq = ExtractedQuestion(
                        question_text=q_text,
                        question_type=q_type,
                        subject=subject_str,
                        difficulty=diff,
                        marks=marks,
                        negative_marks=neg_marks,
                        answer_key=ans_key_letter,
                        expected_answer=model_ans if model_ans else (correct_ans_raw if correct_ans_raw else None),
                        model_answer=model_ans if model_ans else None,
                        evaluation_guidelines=cls.clean_rubric_text(raw_rubric) if raw_rubric else None,
                        options=options_list
                    )
                    eq = cls.validate_and_tag_question(eq)
                    questions.append(eq)

            # Check duplicates against DB
            questions, dup_count = cls.check_duplicates_against_db(questions, db)

            valid_count = sum(1 for q in questions if q.is_valid)
            warning_count = len(questions) - valid_count

            return DocumentExtractionResponse(
                success=True,
                source_format="Excel Spreadsheet (.xlsx / .xls)",
                filename=filename,
                extracted_count=len(questions),
                valid_count=valid_count,
                warning_count=warning_count,
                duplicate_count=dup_count,
                questions=questions,
                message=f"Successfully extracted {len(questions)} question(s) from Excel file '{filename}'."
            )

        except Exception as e:
            return DocumentExtractionResponse(
                success=False,
                source_format="Excel",
                filename=filename,
                extracted_count=0,
                valid_count=0,
                warning_count=0,
                duplicate_count=0,
                questions=[],
                message=f"Error parsing Excel file: {str(e)}"
            )

    # -------------------------------------------------------------
    # 2. WORD (.docx, .doc) EXTRACTION
    # -------------------------------------------------------------
    @classmethod
    def extract_from_docx(
        cls,
        file_bytes: bytes,
        filename: str = "questions.docx",
        default_subject: str = "Computer Science & Engineering",
        default_difficulty: DifficultyLevel = DifficultyLevel.MEDIUM,
        default_marks: float = 1.0,
        db: Optional[Session] = None
    ) -> DocumentExtractionResponse:
        try:
            doc = Document(io.BytesIO(file_bytes))
            questions_from_tables: List[ExtractedQuestion] = []

            # Check if Word document has structured tables
            for table in doc.tables:
                if len(table.rows) >= 2:
                    header_cells = [c.text.strip().lower() for c in table.rows[0].cells]
                    if any("question" in h or "q" in h for h in header_cells):
                        # Map table columns
                        q_col = next((i for i, h in enumerate(header_cells) if "question" in h or h == "q"), 0)
                        ans_col = next((i for i, h in enumerate(header_cells) if "ans" in h or "correct" in h or "key" in h), None)
                        rubric_col = next((i for i, h in enumerate(header_cells) if "rubric" in h or "criteria" in h or "guideline" in h), None)
                        
                        opt_cols = {}
                        for tag in ["a", "b", "c", "d", "e"]:
                            col_i = next((i for i, h in enumerate(header_cells) if f"opt" in h and tag in h or h == tag), None)
                            if col_i is not None:
                                opt_cols[tag.upper()] = col_i

                        for row in table.rows[1:]:
                            cells = [c.text.strip() for c in row.cells]
                            if not any(cells) or q_col >= len(cells):
                                continue
                            
                            raw_q = cells[q_col]
                            if not raw_q or len(raw_q) < 3:
                                continue
                            
                            q_text = cls.clean_question_text(raw_q)
                            ans_raw = cells[ans_col] if ans_col is not None and ans_col < len(cells) else ""
                            rubric_raw = cells[rubric_col] if rubric_col is not None and rubric_col < len(cells) else ""
                            
                            options: List[ExtractedOption] = []
                            for tag, c_idx in opt_cols.items():
                                if c_idx < len(cells) and cells[c_idx]:
                                    options.append(ExtractedOption(option_text=cells[c_idx], is_correct=False))

                            ans_key_letter = None
                            extracted_correct_text = None
                            if options and ans_raw:
                                key_letter, clean_text = cls.extract_mcq_key_and_text(ans_raw, options)
                                if key_letter:
                                    ans_key_letter = key_letter
                                    extracted_correct_text = clean_text
                                    for idx, opt in enumerate(options):
                                        tag = chr(65 + idx)
                                        opt.is_correct = (tag == key_letter)
                                else:
                                    extracted_correct_text = clean_text or ans_raw
                                    for idx, opt in enumerate(options):
                                        tag = chr(65 + idx)
                                        if clean_text and opt.option_text.strip().lower() == clean_text.strip().lower():
                                            opt.is_correct = True
                                            ans_key_letter = tag
                                        elif any(k.strip().upper() == tag for k in re.split(r'[,;&]', ans_raw)):
                                            opt.is_correct = True
                                            if not ans_key_letter:
                                                ans_key_letter = tag

                            model_ans = cls.clean_answer_text(ans_raw) if not options and ans_raw else None
                            q_type = cls._parse_question_type("", options, default_marks, q_text)

                            eq = ExtractedQuestion(
                                question_text=q_text,
                                question_type=q_type,
                                subject=default_subject,
                                difficulty=default_difficulty,
                                marks=default_marks,
                                answer_key=ans_key_letter,
                                expected_answer=model_ans if model_ans else (ans_raw if ans_raw else None),
                                model_answer=model_ans,
                                evaluation_guidelines=cls.clean_rubric_text(rubric_raw) if rubric_raw else None,
                                options=options
                            )
                            questions_from_tables.append(cls.validate_and_tag_question(eq))

            # If tables provided structured questions, return them
            if questions_from_tables:
                questions_from_tables, dup_count = cls.check_duplicates_against_db(questions_from_tables, db)
                valid_count = sum(1 for q in questions_from_tables if q.is_valid)
                return DocumentExtractionResponse(
                    success=True,
                    source_format="Word Document (Tables)",
                    filename=filename,
                    extracted_count=len(questions_from_tables),
                    valid_count=valid_count,
                    warning_count=len(questions_from_tables) - valid_count,
                    duplicate_count=dup_count,
                    questions=questions_from_tables,
                    message=f"Successfully extracted {len(questions_from_tables)} question(s) from Word tables."
                )

            # Otherwise, read paragraph text blocks
            full_text_blocks = []
            for p in doc.paragraphs:
                t = p.text.strip()
                if t and not cls.is_noise_line(t):
                    full_text_blocks.append(t)

            joined_text = "\n".join(full_text_blocks)
            return cls.extract_from_text(
                raw_text=joined_text,
                source_format="Word Document (.docx)",
                filename=filename,
                default_subject=default_subject,
                default_difficulty=default_difficulty,
                default_marks=default_marks,
                db=db
            )
        except Exception as e:
            return DocumentExtractionResponse(
                success=False,
                source_format="Word Document (.docx)",
                filename=filename,
                extracted_count=0,
                valid_count=0,
                warning_count=0,
                duplicate_count=0,
                questions=[],
                message=f"Error parsing Word document: {str(e)}"
            )

    # -------------------------------------------------------------
    # 3. PDF (.pdf) EXTRACTION
    # -------------------------------------------------------------
    @classmethod
    def extract_from_pdf(
        cls,
        file_bytes: bytes,
        filename: str = "questions.pdf",
        default_subject: str = "Computer Science & Engineering",
        default_difficulty: DifficultyLevel = DifficultyLevel.MEDIUM,
        default_marks: float = 1.0,
        db: Optional[Session] = None
    ) -> DocumentExtractionResponse:
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            pages_text = []
            for page in reader.pages:
                raw_page_text = page.extract_text()
                if raw_page_text:
                    clean_page_lines = []
                    for line in raw_page_text.splitlines():
                        trimmed = line.strip()
                        if trimmed and not cls.is_noise_line(trimmed):
                            clean_page_lines.append(trimmed)
                    if clean_page_lines:
                        pages_text.append("\n".join(clean_page_lines))

            # Join pages with newlines to stream text seamlessly across page breaks
            joined_text = "\n\n".join(pages_text)
            return cls.extract_from_text(
                raw_text=joined_text,
                source_format="PDF Document (.pdf)",
                filename=filename,
                default_subject=default_subject,
                default_difficulty=default_difficulty,
                default_marks=default_marks,
                db=db
            )
        except Exception as e:
            return DocumentExtractionResponse(
                success=False,
                source_format="PDF Document (.pdf)",
                filename=filename,
                extracted_count=0,
                valid_count=0,
                warning_count=0,
                duplicate_count=0,
                questions=[],
                message=f"Error parsing PDF document: {str(e)}"
            )

    # -------------------------------------------------------------
    # 4. RAW TEXT & PASTE / NLP TOKENIZER EXTRACTION
    # -------------------------------------------------------------
    @classmethod
    def extract_from_text(
        cls,
        raw_text: str,
        source_format: str = "Text Document / Paste",
        filename: Optional[str] = None,
        default_subject: str = "Computer Science & Engineering",
        default_difficulty: DifficultyLevel = DifficultyLevel.MEDIUM,
        default_marks: float = 1.0,
        db: Optional[Session] = None
    ) -> DocumentExtractionResponse:
        if not raw_text or len(raw_text.strip()) < 5:
            return DocumentExtractionResponse(
                success=False,
                source_format=source_format,
                filename=filename,
                extracted_count=0,
                valid_count=0,
                warning_count=0,
                duplicate_count=0,
                questions=[],
                message="No readable text found to extract questions from."
            )

        lines = [line.rstrip() for line in raw_text.splitlines()]

        # Regex matchers
        q_start_pattern = re.compile(
            r'^(?:(?:q|question)\s*[-_.:#]?\s*\d+\s*[-_.:#)]?|\d+\s*[-_.)\]:]|\[\d+\]|\(\d+\))\s*', 
            re.IGNORECASE
        )
        explicit_q_label = re.compile(r'^(?:question|prompt)\s*[:\.]\s*(.*)$', re.IGNORECASE)
        fig_label_pattern = re.compile(r'^(?:figure|fig\.?|diagram)\s*\d+\s*[-–—:]?\s*(.*)$', re.IGNORECASE)
        
        opt_pattern = re.compile(r'^(?:\(?([A-Ha-h])\)?[\.\:\)\-\]]|\[([xX\s])\]\s*([A-Ha-h])?[\.\)]?)\s*(.+)$')
        
        ans_label_pattern = re.compile(
            r'^(?:(?:the\s+)?correct\s+(?:answer|option)(?:\s+is)?|(?:model\s+key\s*[/&]\s*)?expected(?:\s+answer)?|key\s+answer|answer\s+key|model\s+answer|right\s+(?:answer|option)|true\s+option|answer\s+is|ans\s+is|key\s+is|(?:correct\s+)?ans(?:wer)?|key|solution|sol)\s*[-–—_.:#=]?\s*(.*)$', 
            re.IGNORECASE
        )
        
        rubric_label_pattern = re.compile(
            r'^(?:ai\s+rubric\s*[/&]\s*key\s+criteria|ai\s+rubric|key\s+criteria|evaluation\s+(?:rubric|criteria|guidelines)|rubric|grading\s+criteria)\s*[-_.:#]?\s*(.*)$', 
            re.IGNORECASE
        )

        marks_pattern = re.compile(r'(?:\[|\()?\s*(?:marks?|points?|pts?|score)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:marks?|points?|pts?|m)?\s*(?:\]|\))?|(?:\[|\()\s*(\d+(?:\.\d+)?)\s*(?:marks?|points?|pts?|m)\s*(?:\]|\))', re.IGNORECASE)
        diff_pattern = re.compile(r'(?:\[|\()?\s*(?:difficulty|level)\s*[:=]?\s*(EASY|MEDIUM|HARD|LOW|HIGH|BASIC|ADVANCED)\s*(?:\]|\))?', re.IGNORECASE)
        type_pattern = re.compile(r'(?:\[|\()?\s*(?:type)\s*[:=]?\s*(MCQ|MULTI_SELECT|SHORT_ANSWER|LONG_ANSWER|IMAGE_UPLOAD)\s*(?:\]|\))?', re.IGNORECASE)

        # Active parsing context
        current_section_name: Optional[str] = None
        current_section_type: Optional[QuestionType] = None

        extracted_raw_items: List[Dict[str, Any]] = []

        def create_empty_item(section_type: Optional[QuestionType], section_name: Optional[str]) -> Dict[str, Any]:
            sec_marks = default_marks
            if section_type == QuestionType.MCQ:
                sec_marks = 2.0
            elif section_type == QuestionType.SHORT_ANSWER:
                sec_marks = 5.0
            elif section_type in [QuestionType.LONG_ANSWER, QuestionType.IMAGE_UPLOAD]:
                sec_marks = 10.0

            return {
                "question_lines": [],
                "options": [],
                "answer_lines": [],
                "rubric_lines": [],
                "section_name": section_name,
                "section_type": section_type,
                "explicit_type": None,
                "marks": sec_marks,
                "difficulty": default_difficulty,
                "has_figure": False,
                "figure_desc": "",
                "mode": "QUESTION" # 'QUESTION', 'OPTIONS', 'ANSWER', 'RUBRIC'
            }

        current_item: Optional[Dict[str, Any]] = None

        def finalize_item(item: Optional[Dict[str, Any]]):
            if not item:
                return
            sec_name = (item.get("section_name") or "").lower()
            if "rubric" in sec_name or item.get("section_name") == "GENERAL_RUBRIC" or item.get("section_name") == "Part E":
                return
            q_text = cls.clean_question_text(" ".join(item["question_lines"]))
            if q_text and len(q_text) >= 3:
                extracted_raw_items.append(item)

        for line in lines:
            trimmed = line.strip()
            if not trimmed or cls.is_noise_line(trimmed):
                continue

            # 1. Check Section Header or Document Title
            section_res = cls.detect_section_header(trimmed)
            if section_res:
                sec_name, sec_type = section_res
                if sec_name == "DOCUMENT_TITLE":
                    continue
                
                finalize_item(current_item)
                current_item = None
                current_section_name = sec_name
                current_section_type = sec_type
                continue

            # 2. Check New Question start
            is_numbered_start = bool(q_start_pattern.match(trimmed))
            is_fig_start = bool(fig_label_pattern.match(trimmed))
            is_explicit_q = bool(explicit_q_label.match(trimmed))

            should_start_new = False
            if is_numbered_start:
                should_start_new = True
            elif is_fig_start:
                should_start_new = True
            elif is_explicit_q and (current_item is not None and (current_item["answer_lines"] or current_item["options"] or current_item["rubric_lines"])):
                should_start_new = True

            if should_start_new:
                finalize_item(current_item)
                current_item = create_empty_item(current_section_type, current_section_name)

            if current_item is None:
                current_item = create_empty_item(current_section_type, current_section_name)

            # 3. Extract metadata tags
            if "marks" in trimmed.lower() or "points" in trimmed.lower() or "pts" in trimmed.lower():
                marks_m = marks_pattern.search(trimmed)
                if marks_m:
                    try:
                        val = marks_m.group(1) or marks_m.group(2)
                        if val:
                            current_item["marks"] = float(val)
                    except ValueError:
                        pass

            diff_m = diff_pattern.search(trimmed)
            if diff_m:
                current_item["difficulty"] = cls._parse_difficulty(diff_m.group(1), default_difficulty)

            type_m = type_pattern.search(trimmed)
            if type_m:
                current_item["explicit_type"] = type_m.group(1)

            # Check for embedded answer tag in question line e.g. [Ans: A] or (Answer: Tree)
            emb_ans_m = re.search(
                r'(?:\[|\()\s*(?:(?:the\s+)?correct\s+(?:answer|option)|expected\s+answer|key\s+answer|answer\s+key|model\s+answer|ans(?:wer)?|key|solution|sol)\s*[:=]\s*([^\)\]]+)\s*(?:\]|\))', 
                trimmed, 
                re.IGNORECASE
            )
            if emb_ans_m:
                emb_ans_val = emb_ans_m.group(1).strip()
                if emb_ans_val and not current_item["answer_lines"]:
                    current_item["answer_lines"].append(emb_ans_val)

            # 4. Check Figure label
            fig_m = fig_label_pattern.match(trimmed)
            if fig_m:
                current_item["has_figure"] = True
                current_item["figure_desc"] = fig_m.group(1).strip()
                current_item["mode"] = "QUESTION"
                continue

            # 5. Check Rubric Line
            rubric_m = rubric_label_pattern.match(trimmed)
            if rubric_m:
                current_item["mode"] = "RUBRIC"
                rubric_content = rubric_m.group(1).strip()
                if rubric_content:
                    current_item["rubric_lines"].append(rubric_content)
                continue

            # 6. Check Answer / Key Line
            ans_m = ans_label_pattern.match(trimmed)
            if ans_m:
                current_item["mode"] = "ANSWER"
                ans_content = ans_m.group(1).strip()
                if ans_content:
                    current_item["answer_lines"].append(ans_content)
                continue

            # 7. Check Option Line (Single or Multiple on one line)
            opt_delim_pattern = re.compile(
                r'(?:^|(?<=[,;\s]))(?:\[([xX\s])\]\s*|\(?([✓✔☑\*])\)?\s*)?(?:\(?([A-Ha-h1-8])\)?[\.\:\)\-\]]|\[([A-Ha-h1-8])\])\s*',
                re.IGNORECASE
            )
            delim_matches = list(opt_delim_pattern.finditer(trimmed))
            
            is_valid_opt_line = False
            if delim_matches and not ans_m and not rubric_m:
                first_tag_digit = (delim_matches[0].group(3) or delim_matches[0].group(4) or "").isdigit()
                if not first_tag_digit or (current_item["question_lines"]):
                    is_valid_opt_line = True

            if is_valid_opt_line:
                current_item["mode"] = "OPTIONS"
                for i, m in enumerate(delim_matches):
                    opt_letter_raw = (m.group(3) or m.group(4) or "").upper()
                    if opt_letter_raw.isdigit():
                        num_i = int(opt_letter_raw) - 1
                        opt_letter = chr(65 + num_i) if 0 <= num_i < 8 else opt_letter_raw
                    else:
                        opt_letter = opt_letter_raw

                    checkbox = m.group(1)
                    symbol = m.group(2)
                    start_pos = m.end()
                    end_pos = delim_matches[i + 1].start() if i + 1 < len(delim_matches) else len(trimmed)
                    raw_opt_text = trimmed[start_pos:end_pos].strip()

                    clean_opt_t, is_inline_marked = cls._clean_option_text_and_check_inline_markers(raw_opt_text)
                    is_correct = bool((checkbox and checkbox.lower() == 'x') or symbol or is_inline_marked)

                    if clean_opt_t and opt_letter:
                        current_item["options"].append({
                            "tag": opt_letter,
                            "text": clean_opt_t,
                            "is_correct": is_correct
                        })
                continue

            # 7b. Check if line is an isolated answer key after options have been populated
            if len(current_item.get("options", [])) >= 2:
                # e.g. "Option A", "Option A is correct", "Option A) Tree", "(A)", "A)", "A.", "✓ Tree", "[Correct] Tree"
                is_isolated_ans = False
                if re.match(r'^(?:option|choice)?\s*[\(\[]?([A-Ha-h1-8])[\)\]\.]?(?:\s+is\s+(?:the\s+)?(?:correct|right|true)(?:\s+(?:answer|option))?|\s*[-–—:].*|\s+correct|\s+right)?$', trimmed, re.IGNORECASE):
                    is_isolated_ans = True
                elif re.match(r'^(?:[✓✔☑\*]|\[[xX]\]|[\(\[]\s*(?:correct|ans|answer|key|right|true)\s*[\)\]])\s*', trimmed, re.IGNORECASE):
                    is_isolated_ans = True

                if is_isolated_ans:
                    current_item["mode"] = "ANSWER"
                    current_item["answer_lines"].append(trimmed)
                    continue

            # 8. Content routing based on active mode
            if current_item["mode"] == "QUESTION":
                eq_m = explicit_q_label.match(trimmed)
                if eq_m:
                    cleaned_q = cls.clean_question_text(eq_m.group(1).strip())
                    if cleaned_q:
                        current_item["question_lines"].append(cleaned_q)
                else:
                    cleaned_q = cls.clean_question_text(trimmed)
                    if cleaned_q:
                        current_item["question_lines"].append(cleaned_q)

            elif current_item["mode"] == "OPTIONS":
                if current_item["options"]:
                    current_item["options"][-1]["text"] += f" {trimmed}"
                else:
                    current_item["question_lines"].append(trimmed)

            elif current_item["mode"] == "ANSWER":
                current_item["answer_lines"].append(trimmed)

            elif current_item["mode"] == "RUBRIC":
                current_item["rubric_lines"].append(trimmed)

        # Finalize the last item
        finalize_item(current_item)

        # ---------------------------------------------------------
        # Build Structured ExtractedQuestion instances
        # ---------------------------------------------------------
        questions: List[ExtractedQuestion] = []

        for item in extracted_raw_items:
            q_text = cls.clean_question_text(" ".join(item["question_lines"]))
            if not q_text or len(q_text) < 3:
                continue

            raw_ans_str = cls.clean_answer_text(" ".join(item["answer_lines"]))
            raw_rubric_str = cls.clean_rubric_text(" ".join(item["rubric_lines"]))

            # Convert options
            options_list: List[ExtractedOption] = []
            for opt_idx, opt_dict in enumerate(item["options"]):
                options_list.append(ExtractedOption(
                    option_text=opt_dict["text"],
                    is_correct=opt_dict["is_correct"],
                    label=opt_dict.get("tag") or chr(65 + opt_idx)
                ))

            ans_key_letter: Optional[str] = None
            extracted_correct_text: Optional[str] = None

            # Parse MCQ Key & Option Mapping
            if options_list and raw_ans_str:
                key_letter, clean_text = cls.extract_mcq_key_and_text(raw_ans_str, options_list)
                if key_letter:
                    ans_key_letter = key_letter
                    extracted_correct_text = clean_text
                    keys = [k.strip().upper() for k in re.split(r'[,;&]', key_letter) if k.strip()]
                    for idx, opt in enumerate(options_list):
                        tag = chr(65 + idx)
                        if tag in keys:
                            opt.is_correct = True
                else:
                    extracted_correct_text = clean_text or raw_ans_str
                    matched = False
                    for idx, opt in enumerate(options_list):
                        tag = chr(65 + idx)
                        if clean_text and opt.option_text.strip().lower() == clean_text.strip().lower():
                            opt.is_correct = True
                            ans_key_letter = tag
                            matched = True
                    if not matched:
                        for idx, opt in enumerate(options_list):
                            tag = chr(65 + idx)
                            if any(k.strip().upper() == tag for k in re.split(r'[,;&]', raw_ans_str)):
                                opt.is_correct = True
                                if not ans_key_letter:
                                    ans_key_letter = tag

            # Fallback: if no ans_key_letter yet but options_list has an option marked correct
            if not ans_key_letter and options_list:
                correct_tags = [chr(65 + idx) for idx, opt in enumerate(options_list) if opt.is_correct]
                if correct_tags:
                    ans_key_letter = ", ".join(correct_tags)
                    first_correct = next(opt for opt in options_list if opt.is_correct)
                    if not extracted_correct_text:
                        extracted_correct_text = first_correct.option_text

            # Determine Question Type
            effective_section_type = item["section_type"]
            if item["has_figure"]:
                effective_section_type = QuestionType.IMAGE_UPLOAD

            q_type = cls._parse_question_type(
                val=item["explicit_type"],
                options=options_list,
                marks=item["marks"],
                text=q_text,
                section_hint=effective_section_type
            )

            # Determine Model Answer & Expected Answer
            model_ans = None
            expected_ans = None
            if q_type in [QuestionType.MCQ, QuestionType.MULTI_SELECT]:
                if extracted_correct_text:
                    model_ans = extracted_correct_text
                elif raw_ans_str:
                    model_ans = raw_ans_str
                expected_ans = raw_ans_str if raw_ans_str else (ans_key_letter if ans_key_letter else None)
            else:
                model_ans = raw_ans_str if raw_ans_str else None
                expected_ans = raw_ans_str if raw_ans_str else None

            # Rubric
            eval_guidelines = raw_rubric_str if raw_rubric_str else None

            eq = ExtractedQuestion(
                question_text=q_text,
                question_type=q_type,
                subject=default_subject,
                difficulty=item["difficulty"],
                marks=item["marks"],
                negative_marks=0.25 if (q_type == QuestionType.MCQ and item["difficulty"] == DifficultyLevel.HARD) else 0.0,
                answer_key=ans_key_letter,
                correctAnswer=ans_key_letter,
                expected_answer=expected_ans,
                model_answer=model_ans,
                evaluation_guidelines=eval_guidelines,
                rubric=eval_guidelines,
                options=options_list
            )
            eq = cls.validate_and_tag_question(eq)
            questions.append(eq)

        # Check duplicates against DB
        questions, dup_count = cls.check_duplicates_against_db(questions, db)

        valid_count = sum(1 for q in questions if q.is_valid)
        warning_count = len(questions) - valid_count

        return DocumentExtractionResponse(
            success=True,
            source_format=source_format,
            filename=filename,
            extracted_count=len(questions),
            valid_count=valid_count,
            warning_count=warning_count,
            duplicate_count=dup_count,
            questions=questions,
            message=f"Successfully extracted {len(questions)} question(s) from {source_format}."
        )

    @classmethod
    def ai_extract_fallback(
        cls, 
        raw_text: str,
        default_subject: str = "Computer Science & Engineering",
        default_difficulty: DifficultyLevel = DifficultyLevel.MEDIUM,
        default_marks: float = 1.0
    ) -> List[Dict[str, Any]]:
        """
        AI Fallback structured question extractor that returns structured JSON in the exact schema:
        [
            {
                "question": "...",
                "options": [
                    {"label": "A", "text": "..."},
                    {"label": "B", "text": "..."},
                    {"label": "C", "text": "..."},
                    {"label": "D", "text": "..."}
                ],
                "correctAnswer": "A",
                "rubric": "..."
            }
        ]
        """
        res = cls.extract_from_text(
            raw_text=raw_text,
            default_subject=default_subject,
            default_difficulty=default_difficulty,
            default_marks=default_marks
        )
        output = []
        for q in res.questions:
            options_data = []
            for idx, opt in enumerate(q.options):
                tag = opt.label or chr(65 + idx)
                options_data.append({
                    "label": tag,
                    "text": opt.option_text
                })
            
            output.append({
                "question": q.question_text,
                "options": options_data,
                "correctAnswer": q.correctAnswer or q.answer_key or ("A" if options_data else None),
                "rubric": q.rubric or q.evaluation_guidelines or ""
            })
        return output

    # -------------------------------------------------------------
    # 5. TEMPLATE GENERATION (.xlsx, .docx, .csv)
    # -------------------------------------------------------------
    @classmethod
    def generate_excel_template(cls) -> bytes:
        wb = Workbook()
        ws = wb.active
        ws.title = "Question Bank Template"

        headers = [
            "Question Text", "Question Type", "Subject", "Difficulty", 
            "Marks", "Negative Marks", "Option A", "Option B", "Option C", 
            "Option D", "Option E", "Correct Answer", "Model Answer / Explanation", "Evaluation Guidelines"
        ]

        header_fill = PatternFill(start_color="1E1B4B", end_color="1E1B4B", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
        left_align = Alignment(horizontal="left", vertical="center", wrap_text=True)
        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )

        ws.append(headers)
        ws.row_dimensions[1].height = 28

        for col_num, cell in enumerate(ws[1], 1):
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center_align

        # Sample rows covering all 5 Question Types
        samples = [
            [
                "What is the average time complexity of finding an element in a balanced Binary Search Tree (AVL Tree)?",
                "MCQ",
                "Computer Science & Engineering",
                "MEDIUM",
                2.0,
                0.5,
                "O(1)",
                "O(log N)",
                "O(N)",
                "O(N log N)",
                "",
                "B",
                "AVL trees maintain logarithmic height, ensuring O(log N) lookup complexity.",
                "Award 2 marks for option B."
            ],
            [
                "Which of the following are ACID properties in Database Management Systems? (Select all that apply)",
                "MULTI_SELECT",
                "Database Management Systems",
                "HARD",
                3.0,
                0.5,
                "Atomicity",
                "Consistency",
                "Isolation",
                "Durability",
                "Indexing",
                "A, B, C, D",
                "ACID stands for Atomicity, Consistency, Isolation, and Durability.",
                "Award 3 marks if all 4 are selected; partial 1.5 marks for 2 or 3 correct."
            ],
            [
                "Explain the primary difference between Process and Thread in modern Operating Systems.",
                "SHORT_ANSWER",
                "Operating Systems",
                "EASY",
                5.0,
                0.0,
                "", "", "", "", "",
                "",
                "A process is an executing program instance with dedicated virtual memory space, whereas a thread is a lightweight execution unit inside a process sharing memory and file descriptors.",
                "Award 3 marks for memory distinction, 2 marks for concurrency / switching overhead comparison."
            ],
            [
                "Analyze the trade-offs between Monolithic and Microservices architectures. Provide a design blueprint for high-throughput payment gateways.",
                "LONG_ANSWER",
                "Software Engineering",
                "HARD",
                10.0,
                0.0,
                "", "", "", "", "",
                "",
                "1. Monolith: simple deploy, shared DB, single failure point.\n2. Microservices: independent scaling, event-driven (Kafka/RabbitMQ), distributed transactions (Saga pattern).\n3. Payment Blueprint: Idempotency keys, Circuit breakers, PCI-DSS compliance.",
                "Award 4 marks for architectural trade-offs, 3 marks for reliability patterns (Saga/circuit breaker), 3 marks for security & observability."
            ],
            [
                "Draw the architectural circuit schematic of a 4-bit Carry Lookahead Adder (CLA). Upload a clear diagram showing generate/propagate units and carry logic.",
                "IMAGE_UPLOAD",
                "Computer Architecture",
                "HARD",
                15.0,
                0.0,
                "", "", "", "", "",
                "",
                "Expected schematic must clearly show:\n1. Bit propagate P_i = A_i ^ B_i and generate G_i = A_i & B_i stages.\n2. Carry Lookahead Generator equations for C1, C2, C3, C4.\n3. Sum generation S_i = P_i ^ C_i.",
                "Award 5 marks for P & G stages, 5 marks for CLA carry generator network, 5 marks for correct sum logic & pin labeling."
            ]
        ]

        for r_idx, row_data in enumerate(samples, 2):
            ws.append(row_data)
            ws.row_dimensions[r_idx].height = 40
            for col_idx, cell in enumerate(ws[r_idx], 1):
                cell.font = Font(name="Calibri", size=10)
                cell.alignment = left_align
                cell.border = thin_border
                if r_idx % 2 == 0:
                    cell.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

        col_widths = [45, 16, 25, 14, 10, 14, 18, 18, 18, 18, 15, 16, 40, 30]
        for idx, width in enumerate(col_widths, 1):
            col_letter = chr(64 + idx) if idx <= 26 else f"A{chr(64 + idx - 26)}"
            ws.column_dimensions[col_letter].width = width

        # Second instructions sheet
        ws_info = wb.create_sheet(title="Format Instructions")
        ws_info.append(["Exam Question Bank Import Guidelines"])
        ws_info["A1"].font = Font(name="Calibri", size=14, bold=True, color="1E1B4B")
        
        guidelines = [
            ["Column Name", "Required", "Supported Values / Format", "Description"],
            ["Question Text", "YES", "Text (min 5 characters)", "The full examination question prompt."],
            ["Question Type", "YES", "MCQ, MULTI_SELECT, SHORT_ANSWER, LONG_ANSWER, IMAGE_UPLOAD", "Item classification format."],
            ["Subject", "YES", "e.g. Artificial Intelligence, Operating Systems", "Discipline or subject area."],
            ["Difficulty", "NO", "EASY, MEDIUM, HARD", "Item cognitive difficulty level (default: MEDIUM)."],
            ["Marks", "YES", "Numeric (e.g. 1, 2.5, 5, 10)", "Maximum marks awarded for correct answer."],
            ["Negative Marks", "NO", "Numeric (e.g. 0.25, 0.5, 0)", "Penalty subtracted for wrong answer in MCQs."],
            ["Option A - E", "For MCQs", "Text choices", "Option choices for MCQ and Multi-Select formats."],
            ["Correct Answer", "For MCQs", "e.g. 'A', 'B', 'A, B', '1, 3', or Option Text", "Identifies the correct option key(s)."],
            ["Model Answer", "Subjective", "Text answer / key explanation", "Ground truth reference answer for AI grading."],
            ["Evaluation Guidelines", "NO", "Rubric / scoring criteria", "AI grading rubric and criteria."]
        ]

        for row in guidelines:
            ws_info.append(row)

        for col_num, cell in enumerate(ws_info[2], 1):
            cell.font = Font(name="Calibri", size=11, bold=True, color="1E1B4B")
            cell.fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")

        output = io.BytesIO()
        wb.save(output)
        return output.getvalue()

    @classmethod
    def generate_docx_template(cls) -> bytes:
        doc = Document()
        doc.add_heading("Standard Examination Question Bank Template", level=1)
        doc.add_paragraph("You can author multiple-choice, subjective, and diagram upload questions using the structured formats below.")

        doc.add_heading("Part A – Multiple Choice Questions", level=2)
        p1 = doc.add_paragraph()
        p1.add_run("1. Which data structure operates on a First-In, First-Out (FIFO) ordering principle? [Marks: 2] [Difficulty: EASY]\n")
        p1.add_run("A) Stack\n")
        p1.add_run("B) Queue\n")
        p1.add_run("C) Priority Queue\n")
        p1.add_run("D) Binary Tree\n")
        p1.add_run("Key: B) Queue\n")
        p1.add_run("AI Rubric / Key Criteria: Identifies FIFO • Selects Queue")

        p2 = doc.add_paragraph()
        p2.add_run("2. Which of the following are valid transport layer protocols in the TCP/IP stack? (Select all that apply) [Marks: 3] [Difficulty: MEDIUM]\n")
        p2.add_run("A) Transmission Control Protocol (TCP)\n")
        p2.add_run("B) User Datagram Protocol (UDP)\n")
        p2.add_run("C) Internet Protocol (IP)\n")
        p2.add_run("D) Hypertext Transfer Protocol (HTTP)\n")
        p2.add_run("Key: A, B\n")
        p2.add_run("AI Rubric / Key Criteria: Selects both Layer 4 protocols")

        doc.add_heading("Part B – Short Answer Questions", level=2)
        p3 = doc.add_paragraph()
        p3.add_run("1. Explain the difference between optimistic and pessimistic concurrency control in DBMS transactions. [Marks: 5] [Difficulty: MEDIUM]\n")
        p3.add_run("Key Answer: Pessimistic concurrency control assumes conflicts will occur and locks database resources immediately, whereas optimistic concurrency control allows transactions to proceed without locking and validates serializability at commit time.\n")
        p3.add_run("AI Rubric / Key Criteria: Distinguishes locking vs validation at commit time.")

        doc.add_heading("Part C – Long Answer Questions", level=2)
        p4 = doc.add_paragraph()
        p4.add_run("1. Analyze the trade-offs between Monolithic and Microservices architectures.\n")
        p4.add_run("Model Key / Expected Answer:\nMonoliths offer simplicity and shared database access but suffer from single points of failure. Microservices enable independent scaling and fault isolation via event streams.\n")
        p4.add_run("AI Rubric / Key Criteria:\nDiscusses scalability, deployment overhead, network latency, and distributed state.")

        doc.add_heading("Part D – Image / Diagram-Based Questions", level=2)
        p5 = doc.add_paragraph()
        p5.add_run("Figure 1 – Process States\n")
        p5.add_run("Question:\nDraw the complete state transition diagram of an operating system process. [Marks: 10]\n")
        p5.add_run("Key:\nThe diagram must include all 5 process states with transition triggers (admit, dispatch, interrupt, I/O wait, exit).")

        output = io.BytesIO()
        doc.save(output)
        return output.getvalue()

    @classmethod
    def generate_csv_template(cls) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Question Text", "Question Type", "Subject", "Difficulty",
            "Marks", "Negative Marks", "Option A", "Option B", "Option C",
            "Option D", "Correct Answer", "Model Answer / Explanation", "Evaluation Guidelines"
        ])
        writer.writerow([
            "Which sorting algorithm has the best average-case time complexity of O(N log N)?",
            "MCQ", "Data Structures & Algorithms", "MEDIUM", 2.0, 0.5,
            "Bubble Sort", "Merge Sort", "Insertion Sort", "Selection Sort",
            "B", "Merge sort divides the array in halves recursively yielding guaranteed O(N log N) performance.",
            "Award 2 marks for option B."
        ])
        writer.writerow([
            "What is the function of the ARP (Address Resolution Protocol) in computer networks?",
            "SHORT_ANSWER", "Computer Networks", "EASY", 5.0, 0.0,
            "", "", "", "",
            "", "ARP maps an IPv4 address to a physical MAC address on a local area network.",
            "Award 3 marks for IPv4 to MAC mapping, 2 marks for local network context."
        ])
        return output.getvalue()
