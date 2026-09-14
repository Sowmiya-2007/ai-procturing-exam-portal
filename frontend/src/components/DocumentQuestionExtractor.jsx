import React, { useState, useRef } from "react";
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  File, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  CheckSquare, 
  Square, 
  Radio, 
  HelpCircle, 
  Layers, 
  Sliders, 
  RefreshCw,
  Database,
  ArrowRight,
  BookOpen,
  Info,
  Copy,
  AlertCircle,
  XCircle,
  Check
} from "lucide-react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import { TypeBadge, DifficultyBadge } from "./StatusBadge";

export const DocumentQuestionExtractor = ({
  onAddToExam = null,
  onSaveToBankAndAdd = null,
  onQuestionsSavedToBank = null,
  currentSubject = "Computer Science & Engineering",
  isModal = false,
  onClose = null
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  // Tab mode: 'file' or 'paste'
  const [inputMode, setInputMode] = useState("file"); // 'file' | 'paste'

  // Form Configuration
  const [selectedFile, setSelectedFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  const [subject, setSubject] = useState(currentSubject);
  const [defaultDifficulty, setDefaultDifficulty] = useState("MEDIUM");
  const [defaultMarks, setDefaultMarks] = useState(2.0);

  // Extraction State
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [filterMode, setFilterMode] = useState("ALL"); // 'ALL' | 'READY' | 'WARNINGS' | 'DUPLICATES'
  const [hasExtracted, setHasExtracted] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const subjectsList = [
    "Computer Science & Engineering",
    "Artificial Intelligence",
    "Data Structures",
    "Computer Networks",
    "Database Management Systems",
    "Computer Architecture",
    "Cybersecurity",
    "Operating Systems",
    "Software Engineering"
  ];

  // Template Downloader
  const handleDownloadTemplate = async (type) => {
    try {
      showToast(`Generating and downloading ${type.toUpperCase()} template...`, "info");
      await api.downloadQuestionTemplate(type);
      showToast(`Sample ${type.toUpperCase()} template downloaded!`, "success");
    } catch (err) {
      showToast(err.message || "Failed to download template", "error");
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Re-validate question in-place
  const revalidateQuestion = (q) => {
    const warnings = [];
    let isValid = true;
    let answerStatus = "DETECTED";

    if (!q.question_text || q.question_text.trim().length < 4) {
      warnings.push("Question prompt is too short.");
      isValid = false;
    }

    if (q.question_type === "MCQ" || q.question_type === "MULTI_SELECT") {
      if (!q.options || q.options.length < 2) {
        warnings.push("Requires at least 2 options.");
        isValid = false;
        answerStatus = "NOT_DETECTED";
      } else {
        const correctCount = q.options.filter(o => o.is_correct).length;
        if (correctCount === 0) {
          warnings.push("No correct option selected. Click a radio button to select the answer.");
          isValid = false;
          answerStatus = "NOT_DETECTED";
        } else if (q.question_type === "MCQ" && correctCount > 1) {
          warnings.push("Single-choice MCQ has multiple correct answers. Converted to Multi-Select or choose one.");
          answerStatus = "DETECTED";
        } else {
          answerStatus = "DETECTED";
        }
      }
    } else {
      if (!q.model_answer && !q.expected_answer) {
        warnings.push("Answer could not be detected. Please review or enter answer.");
        answerStatus = "NOT_DETECTED";
      } else {
        answerStatus = "DETECTED";
      }
    }

    if (q.is_duplicate) {
      warnings.push(`Duplicate of Question #${q.duplicate_question_id} in Question Bank.`);
    }

    return { 
      ...q, 
      validation_warnings: warnings, 
      is_valid: isValid,
      answer_status: answerStatus
    };
  };

  // Normalizes extracted questions from backend ensuring correct answer selection
  const normalizeExtractedQuestion = (rawQ) => {
    let q = { ...rawQ };
    const effectiveKey = (q.correctAnswer || q.answer_key || "").trim();
    
    if (q.options && q.options.length > 0) {
      let hasCorrect = q.options.some(o => o.is_correct);

      // 1. If key letter is present (e.g. "A", "B", "C")
      if (effectiveKey) {
        const keys = effectiveKey.split(/[,;&]/).map(k => k.trim().toUpperCase()).filter(Boolean);
        q.options = q.options.map((opt, idx) => {
          const tag = String.fromCharCode(65 + idx);
          const isMatch = keys.includes(tag) || (keys.length === 1 && String(idx + 1) === keys[0]);
          return {
            ...opt,
            is_correct: opt.is_correct || isMatch
          };
        });
        hasCorrect = q.options.some(o => o.is_correct);
      }

      // 2. If answer text matches an option text
      const lookupAns = (q.model_answer || q.expected_answer || "").trim();
      if (!hasCorrect && lookupAns) {
        const cleanLookup = lookupAns.replace(/^(?:(?:the\s+)?correct\s+(?:answer|option)(?:\s+is)?|(?:model\s+key\s*[/&]\s*)?expected(?:\s+answer)?|key\s+answer|answer\s+key|model\s+answer|ans(?:wer)?|key|solution|sol|option)\s*[-–—_.:#=]?\s*/i, '').trim().toLowerCase();
        
        q.options = q.options.map((opt, idx) => {
          const cleanOpt = (opt.option_text || "").replace(/^[\(\[]?[A-Ha-h0-9][\)\]\.\:\-\—–\s]+\s*/, '').trim().toLowerCase();
          const isMatch = cleanOpt && (cleanOpt === cleanLookup || cleanOpt.replace(/[^a-z0-9]/g, '') === cleanLookup.replace(/[^a-z0-9]/g, ''));
          if (isMatch) {
            hasCorrect = true;
            return { ...opt, is_correct: true };
          }
          return opt;
        });
      }

      // 3. Synchronize answer_key, correctAnswer, and status
      if (hasCorrect) {
        const correctTags = q.options.map((o, idx) => o.is_correct ? String.fromCharCode(65 + idx) : null).filter(Boolean);
        q.answer_key = correctTags.join(", ");
        q.correctAnswer = q.answer_key;
        q.answer_status = "DETECTED";
        if (!q.model_answer) {
          q.model_answer = q.options.filter(o => o.is_correct).map(o => o.option_text).join(", ");
        }
      }
    }

    return revalidateQuestion(q);
  };

  // Perform Document Extraction
  const handleExtract = async () => {
    if (inputMode === "file") {
      if (!selectedFile) {
        showToast("Please select an Excel (.xlsx/.xls), Word (.docx), PDF, or CSV file to extract.", "warning");
        return;
      }
      setIsExtracting(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("default_subject", subject);
        formData.append("default_difficulty", defaultDifficulty);
        formData.append("default_marks", defaultMarks.toString());

        const res = await api.extractQuestionsFromDocument(formData);
        if (res.success && res.questions) {
          const normalized = res.questions.map(normalizeExtractedQuestion);
          setExtractedQuestions(normalized);
          setSelectedIndices(normalized.map((_, i) => i)); // Select all by default
          setHasExtracted(true);
          showToast(res.message || `Successfully extracted ${res.extracted_count} question(s)!`, "success");
        } else {
          showToast(res.message || "No questions could be extracted from the file.", "warning");
        }
      } catch (err) {
        showToast(err.message || "Failed to extract questions from file", "error");
      } finally {
        setIsExtracting(false);
      }
    } else {
      // Paste Mode
      if (!pastedText.trim() || pastedText.trim().length < 10) {
        showToast("Please paste question paper text before extracting.", "warning");
        return;
      }
      setIsExtracting(true);
      try {
        const payload = {
          raw_text: pastedText.trim(),
          default_subject: subject,
          default_difficulty: defaultDifficulty,
          default_marks: parseFloat(defaultMarks) || 1.0
        };
        const res = await api.extractQuestionsFromText(payload);
        if (res.success && res.questions) {
          const normalized = res.questions.map(normalizeExtractedQuestion);
          setExtractedQuestions(normalized);
          setSelectedIndices(normalized.map((_, i) => i));
          setHasExtracted(true);
          showToast(res.message || `Successfully parsed ${res.extracted_count} question(s)!`, "success");
        } else {
          showToast(res.message || "No questions recognized in pasted text.", "warning");
        }
      } catch (err) {
        showToast(err.message || "Failed to parse question text", "error");
      } finally {
        setIsExtracting(false);
      }
    }
  };

  // Modify Extracted Question In-Place
  const handleUpdateQuestion = (index, field, value) => {
    setExtractedQuestions(prev => {
      const updated = [...prev];
      updated[index] = revalidateQuestion({
        ...updated[index],
        [field]: value
      });
      return updated;
    });
  };

  // Duplicate Action change: 'IMPORT', 'SKIP', 'REPLACE'
  const handleSetDuplicateAction = (qIndex, action) => {
    setExtractedQuestions(prev => {
      const updated = [...prev];
      updated[qIndex] = {
        ...updated[qIndex],
        duplicate_action: action
      };
      return updated;
    });
  };

  // Option text change
  const handleUpdateOptionText = (qIndex, optIndex, text) => {
    setExtractedQuestions(prev => {
      const updated = [...prev];
      const newOpts = [...updated[qIndex].options];
      newOpts[optIndex] = { ...newOpts[optIndex], option_text: text };
      updated[qIndex] = revalidateQuestion({
        ...updated[qIndex],
        options: newOpts
      });
      return updated;
    });
  };

  // Option correct toggle (Select ONE for MCQ radio, or toggle for Multi-Select)
  const handleToggleOptionCorrect = (qIndex, optIndex) => {
    setExtractedQuestions(prev => {
      const updated = [...prev];
      const currentQ = updated[qIndex];
      const newOpts = currentQ.options.map((opt, idx) => {
        if (currentQ.question_type === "MCQ") {
          return { ...opt, is_correct: idx === optIndex };
        } else {
          return idx === optIndex ? { ...opt, is_correct: !opt.is_correct } : opt;
        }
      });
      const chosenTag = String.fromCharCode(65 + optIndex);
      const chosenText = newOpts[optIndex]?.option_text || "";
      const allCorrectTags = newOpts.map((o, i) => o.is_correct ? String.fromCharCode(65 + i) : null).filter(Boolean).join(", ");

      updated[qIndex] = revalidateQuestion({
        ...currentQ,
        options: newOpts,
        answer_key: currentQ.question_type === "MCQ" ? chosenTag : allCorrectTags,
        correctAnswer: currentQ.question_type === "MCQ" ? chosenTag : allCorrectTags,
        model_answer: currentQ.question_type === "MCQ" ? chosenText : currentQ.model_answer
      });
      return updated;
    });
  };

  // Add new option to question
  const handleAddOption = (qIndex) => {
    setExtractedQuestions(prev => {
      const updated = [...prev];
      const currentQ = updated[qIndex];
      const newOpts = [...(currentQ.options || []), { option_text: "New Option", is_correct: false }];
      updated[qIndex] = revalidateQuestion({
        ...currentQ,
        options: newOpts
      });
      return updated;
    });
  };

  // Delete option from question
  const handleDeleteOption = (qIndex, optIndex) => {
    setExtractedQuestions(prev => {
      const updated = [...prev];
      const currentQ = updated[qIndex];
      const newOpts = currentQ.options.filter((_, idx) => idx !== optIndex);
      updated[qIndex] = revalidateQuestion({
        ...currentQ,
        options: newOpts
      });
      return updated;
    });
  };

  // Delete question from extracted list
  const handleDeleteQuestion = (qIndex) => {
    setExtractedQuestions(prev => prev.filter((_, idx) => idx !== qIndex));
    setSelectedIndices(prev => prev.filter(i => i !== qIndex).map(i => i > qIndex ? i - 1 : i));
  };

  // Toggle selection
  const handleToggleSelect = (qIndex) => {
    if (selectedIndices.includes(qIndex)) {
      setSelectedIndices(prev => prev.filter(i => i !== qIndex));
    } else {
      setSelectedIndices(prev => [...prev, qIndex]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIndices.length === extractedQuestions.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(extractedQuestions.map((_, i) => i));
    }
  };

  // Filtered Questions List
  const displayedQuestions = extractedQuestions.filter(q => {
    if (filterMode === "READY") return q.is_valid && (q.validation_warnings || []).length === 0;
    if (filterMode === "WARNINGS") return !q.is_valid || q.answer_status === "NOT_DETECTED" || (q.validation_warnings || []).length > 0;
    if (filterMode === "DUPLICATES") return q.is_duplicate;
    return true;
  });

  const validCount = extractedQuestions.filter(q => q.is_valid && (q.validation_warnings || []).length === 0).length;
  const warningCount = extractedQuestions.filter(q => !q.is_valid || q.answer_status === "NOT_DETECTED" || (q.validation_warnings || []).length > 0).length;
  const duplicateCount = extractedQuestions.filter(q => q.is_duplicate).length;

  // Primary Action: Add to Exam Blueprint Directly
  const handleAddDirectlyToExam = () => {
    if (selectedIndices.length === 0) {
      showToast("Please select at least 1 question to add to the exam.", "warning");
      return;
    }
    const chosen = selectedIndices.map(idx => extractedQuestions[idx]);
    if (onAddToExam) {
      onAddToExam(chosen);
      showToast(`Added ${chosen.length} extracted question(s) to the exam blueprint!`, "success");
      if (onClose) onClose();
    }
  };

  // Primary Action: Save to DB and Add to Exam
  const handleSaveToBankAndAddToExam = async () => {
    if (selectedIndices.length === 0) {
      showToast("Please select at least 1 question to save and add.", "warning");
      return;
    }
    setIsSaving(true);
    try {
      const chosen = selectedIndices.map(idx => extractedQuestions[idx]);
      const payload = {
        questions: chosen.map(q => ({
          question_text: q.question_text,
          question_type: q.question_type,
          subject: q.subject || subject,
          difficulty: q.difficulty || "MEDIUM",
          marks: parseFloat(q.marks) || 1.0,
          negative_marks: parseFloat(q.negative_marks) || 0.0,
          model_answer: q.model_answer || undefined,
          evaluation_guidelines: q.evaluation_guidelines || undefined,
          replace_question_id: q.duplicate_action === "REPLACE" ? q.duplicate_question_id : undefined,
          skip: q.duplicate_action === "SKIP",
          options: (q.options || []).map(o => ({
            option_text: o.option_text,
            is_correct: o.is_correct
          }))
        }))
      };

      const res = await api.batchCreateQuestions(payload);
      if (res.success && res.questions) {
        showToast(res.message || `Saved ${res.created_count} question(s) to Question Bank!`, "success");
        if (onSaveToBankAndAdd) {
          onSaveToBankAndAdd(res.questions);
        } else if (onAddToExam) {
          onAddToExam(res.questions);
        }
        if (onQuestionsSavedToBank) {
          onQuestionsSavedToBank(res.questions);
        }
        if (onClose) onClose();
      }
    } catch (err) {
      showToast(err.message || "Failed to save questions to database", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Primary Action: Save to Question Bank Only (For QuestionBank.jsx)
  const handleSaveToQuestionBank = async () => {
    if (selectedIndices.length === 0) {
      showToast("Please select at least 1 question to save to the Question Bank.", "warning");
      return;
    }
    setIsSaving(true);
    try {
      const chosen = selectedIndices.map(idx => extractedQuestions[idx]);
      const payload = {
        questions: chosen.map(q => ({
          question_text: q.question_text,
          question_type: q.question_type,
          subject: q.subject || subject,
          difficulty: q.difficulty || "MEDIUM",
          marks: parseFloat(q.marks) || 1.0,
          negative_marks: parseFloat(q.negative_marks) || 0.0,
          model_answer: q.model_answer || undefined,
          evaluation_guidelines: q.evaluation_guidelines || undefined,
          replace_question_id: q.duplicate_action === "REPLACE" ? q.duplicate_question_id : undefined,
          skip: q.duplicate_action === "SKIP",
          options: (q.options || []).map(o => ({
            option_text: o.option_text,
            is_correct: o.is_correct
          }))
        }))
      };

      const res = await api.batchCreateQuestions(payload);
      if (res.success && res.questions) {
        showToast(res.message || `Successfully processed questions in Question Bank!`, "success");
        if (onQuestionsSavedToBank) {
          onQuestionsSavedToBank(res.questions);
        }
        if (onClose) onClose();
      }
    } catch (err) {
      showToast(err.message || "Failed to batch create questions", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Insert sample text in paste mode
  const handleInsertSampleText = () => {
    setPastedText(`DATA STRUCTURES – EXAM QUESTION BANK

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

Part B – Short Answer Questions

1. Define a data structure.

Key Answer: A data structure is a method of organizing and storing data so that it can be accessed and modified efficiently.
AI Rubric / Key Criteria: Gives a clear definition • Mentions organization/storage • Mentions efficient access or operations

2. State the difference between Linear and Non-Linear data structures.

Key Answer: In linear data structures, elements are arranged sequentially (e.g., Arrays, Stacks). In non-linear data structures, elements are organized hierarchically or interconnected (e.g., Trees, Graphs).
AI Rubric / Key Criteria: Explains sequential vs hierarchical organization • Gives valid examples for each

Part C – Long Answer Questions

1. Explain arrays and their operations.

Model Key / Expected Answer:
An array stores elements in contiguous memory locations. Major operations include insertion, deletion, traversal, and indexed lookup with O(1) random access.

AI Rubric / Key Criteria:
Definition and contiguous storage • Lists major operations • Explains O(1) access

Part D – Image / Diagram-Based Questions

Figure 1 – Array

Question:
What is the value at index 3? State the complexity of direct access.

Key:
40; direct indexed access is O(1).

AI Rubric / Key Criteria:
Identifies index 3 correctly • States O(1) complexity

Part E – General AI Rubric
All student responses must be graded according to technical precision and clarity.`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      
      {/* Top Banner / Template Download Helper Bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.12))",
        border: "1px solid rgba(99, 102, 241, 0.3)",
        borderRadius: "var(--radius-md)",
        padding: "0.85rem 1.25rem",
        flexWrap: "wrap",
        gap: "0.75rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Sparkles size={18} color="#c084fc" />
          <div>
            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-main)" }}>
              Intelligent Multi-Format Question & Answer Extractor
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Extracts questions, options, answer keys, marks & difficulty from Excel, Word, PDF, CSV, or pasted text
            </div>
          </div>
        </div>

        {/* Download sample templates */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", fontWeight: 600 }}>Templates:</span>
          <button
            type="button"
            onClick={() => handleDownloadTemplate("excel")}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
            title="Download formatted Excel spreadsheet template (.xlsx)"
          >
            <Download size={12} /> Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => handleDownloadTemplate("word")}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
            title="Download formatted Word document template (.docx)"
          >
            <Download size={12} /> Word (.docx)
          </button>
          <button
            type="button"
            onClick={() => handleDownloadTemplate("csv")}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
            title="Download CSV template (.csv)"
          >
            <Download size={12} /> CSV
          </button>
        </div>
      </div>

      {/* STEP 1: Upload & Input Config Section */}
      {!hasExtracted && (
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          
          {/* Input Method Selector (File vs Paste) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
              Step 1: Choose Document Source
            </div>
            
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setInputMode("file")}
                style={{
                  padding: "0.4rem 0.85rem",
                  borderRadius: "6px",
                  border: inputMode === "file" ? "1px solid rgba(99, 102, 241, 0.5)" : "1px solid var(--border-color)",
                  background: inputMode === "file" ? "rgba(99, 102, 241, 0.25)" : "rgba(30, 41, 59, 0.4)",
                  color: inputMode === "file" ? "#ffffff" : "var(--text-muted)",
                  fontWeight: 700,
                  fontSize: "0.825rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}
              >
                <FileSpreadsheet size={15} color="#818cf8" /> Upload File (Excel / Word / PDF / CSV)
              </button>
              <button
                type="button"
                onClick={() => setInputMode("paste")}
                style={{
                  padding: "0.4rem 0.85rem",
                  borderRadius: "6px",
                  border: inputMode === "paste" ? "1px solid rgba(168, 85, 247, 0.5)" : "1px solid var(--border-color)",
                  background: inputMode === "paste" ? "rgba(168, 85, 247, 0.25)" : "rgba(30, 41, 59, 0.4)",
                  color: inputMode === "paste" ? "#ffffff" : "var(--text-muted)",
                  fontWeight: 700,
                  fontSize: "0.825rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}
              >
                <Sparkles size={15} color="#c084fc" /> Direct Text Paste & NLP Extractor
              </button>
            </div>
          </div>

          {/* Config Defaults row */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.25rem" }}>
                Target Subject / Discipline
              </label>
              <select
                className="form-control"
                style={{ fontSize: "0.825rem", padding: "0.4rem 0.6rem" }}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {subjectsList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.25rem" }}>
                Default Difficulty
              </label>
              <select
                className="form-control"
                style={{ fontSize: "0.825rem", padding: "0.4rem 0.6rem" }}
                value={defaultDifficulty}
                onChange={(e) => setDefaultDifficulty(e.target.value)}
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.25rem" }}>
                Default Marks per Item
              </label>
              <input
                type="number"
                step={0.5}
                min={0.5}
                className="form-control"
                style={{ fontSize: "0.825rem", padding: "0.4rem 0.6rem" }}
                value={defaultMarks}
                onChange={(e) => setDefaultMarks(e.target.value)}
              />
            </div>
          </div>

          {/* Tab 1: File Dropzone */}
          {inputMode === "file" && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".xlsx,.xls,.docx,.doc,.pdf,.csv,.txt,.json"
                onChange={handleFileChange}
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                style={{
                  border: dragOver ? "2px dashed #6366f1" : "2px dashed rgba(99, 102, 241, 0.35)",
                  borderRadius: "var(--radius-md)",
                  padding: "2rem 1.5rem",
                  textAlign: "center",
                  background: dragOver ? "rgba(99, 102, 241, 0.15)" : "rgba(15, 23, 42, 0.4)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  marginBottom: "1rem"
                }}
              >
                <UploadCloud size={36} color="#818cf8" style={{ margin: "0 auto 0.6rem" }} />
                
                {selectedFile ? (
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#34d399", marginBottom: "0.25rem" }}>
                      Selected File: {selectedFile.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB • Click to choose a different file
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.25rem" }}>
                      Drag & Drop Question Document Here, or Click to Browse
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Supported formats: Excel (.xlsx, .xls), Word (.docx, .doc), PDF (.pdf), CSV (.csv), Plain Text (.txt)
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Text Paste Mode */}
          {inputMode === "paste" && (
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-subtle)", fontWeight: 600 }}>
                  Paste Raw Question Document Text
                </label>
                <button
                  type="button"
                  onClick={handleInsertSampleText}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}
                >
                  Load Sample Paper
                </button>
              </div>
              <textarea
                rows={7}
                className="form-control"
                placeholder="Paste formatted questions here (e.g. 1. What is Java? A) ... B) ... Answer: B)..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono)", resize: "vertical" }}
              />
            </div>
          )}

          {/* Extract Button */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleExtract}
              disabled={isExtracting || (inputMode === "file" && !selectedFile) || (inputMode === "paste" && !pastedText.trim())}
              className="btn btn-primary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.6rem 1.5rem",
                fontWeight: 700,
                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)"
              }}
            >
              <Sparkles size={16} className={isExtracting ? "animate-spin" : ""} />
              {isExtracting ? "Parsing & Extracting Q&A..." : "Process Document & Extract Q&A"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Interactive Staging & Validation Preview Screen */}
      {hasExtracted && (
        <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          
          {/* Header Stats Banner */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: "0.75rem",
            borderBottom: "1px solid var(--border-color)",
            flexWrap: "wrap",
            gap: "0.75rem"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={20} color="#34d399" />
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)" }}>
                  Extraction Preview ({extractedQuestions.length} Questions Found)
                </h3>
              </div>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Review, edit question prompts & answer keys, resolve duplicates, and verify before importing.
              </p>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{
                display: "flex",
                background: "rgba(15, 23, 42, 0.7)",
                padding: "0.2rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)"
              }}>
                <button
                  type="button"
                  onClick={() => setFilterMode("ALL")}
                  style={{
                    padding: "0.25rem 0.6rem",
                    borderRadius: "4px",
                    border: "none",
                    background: filterMode === "ALL" ? "rgba(99, 102, 241, 0.3)" : "transparent",
                    color: filterMode === "ALL" ? "#ffffff" : "var(--text-muted)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  All ({extractedQuestions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("READY")}
                  style={{
                    padding: "0.25rem 0.6rem",
                    borderRadius: "4px",
                    border: "none",
                    background: filterMode === "READY" ? "rgba(52, 211, 153, 0.25)" : "transparent",
                    color: filterMode === "READY" ? "#34d399" : "var(--text-muted)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Ready ({validCount})
                </button>
                {warningCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterMode("WARNINGS")}
                    style={{
                      padding: "0.25rem 0.6rem",
                      borderRadius: "4px",
                      border: "none",
                      background: filterMode === "WARNINGS" ? "rgba(251, 191, 36, 0.25)" : "transparent",
                      color: filterMode === "WARNINGS" ? "#fbbf24" : "var(--text-muted)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Needs Review ({warningCount})
                  </button>
                )}
                {duplicateCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterMode("DUPLICATES")}
                    style={{
                      padding: "0.25rem 0.6rem",
                      borderRadius: "4px",
                      border: "none",
                      background: filterMode === "DUPLICATES" ? "rgba(168, 85, 247, 0.3)" : "transparent",
                      color: filterMode === "DUPLICATES" ? "#c084fc" : "var(--text-muted)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Duplicates ({duplicateCount})
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setHasExtracted(false);
                  setExtractedQuestions([]);
                  setSelectedIndices([]);
                  setSelectedFile(null);
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
              >
                <RefreshCw size={13} /> Extract Another
              </button>
            </div>
          </div>

          {/* Select All Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 0.5rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.825rem", color: "var(--text-main)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={selectedIndices.length === extractedQuestions.length && extractedQuestions.length > 0}
                onChange={handleSelectAll}
                style={{ width: "16px", height: "16px", accentColor: "#6366f1" }}
              />
              <span>Select All ({selectedIndices.length} of {extractedQuestions.length} selected)</span>
            </label>
          </div>

          {/* Extracted Questions Cards List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "460px", overflowY: "auto", paddingRight: "0.35rem" }}>
            {displayedQuestions.map((q, idx) => {
              const realIndex = extractedQuestions.indexOf(q);
              const isSelected = selectedIndices.includes(realIndex);
              const isMCQ = q.question_type === "MCQ" || q.question_type === "MULTI_SELECT";
              const hasCorrectOption = q.options && q.options.length > 0 && q.options.some(o => o.is_correct);
              const hasSubjectiveAnswer = Boolean((q.model_answer || q.expected_answer || "").trim());
              const isMissingAnswer = isMCQ ? !hasCorrectOption : !hasSubjectiveAnswer;

              return (
                <div
                  key={`ext-q-${realIndex}`}
                  className="glass-card"
                  style={{
                    padding: "1.1rem 1.25rem",
                    background: isSelected ? "rgba(15, 23, 42, 0.75)" : "rgba(15, 23, 42, 0.4)",
                    border: q.is_duplicate 
                      ? "1px solid rgba(168, 85, 247, 0.5)" 
                      : isMissingAnswer 
                      ? "1px solid rgba(251, 191, 36, 0.5)" 
                      : isSelected 
                      ? "1px solid rgba(99, 102, 241, 0.4)" 
                      : "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem"
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(realIndex)}
                        style={{ width: "16px", height: "16px", accentColor: "#6366f1", cursor: "pointer" }}
                      />
                      <span style={{
                        background: "rgba(99, 102, 241, 0.25)",
                        color: "#c7d2fe",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        fontFamily: "var(--font-mono)"
                      }}>
                        Question #{realIndex + 1}
                      </span>

                      {/* Type Dropdown */}
                      <select
                        value={q.question_type}
                        onChange={(e) => handleUpdateQuestion(realIndex, "question_type", e.target.value)}
                        style={{
                          background: "rgba(30, 41, 59, 0.8)",
                          border: "1px solid var(--border-color)",
                          color: "var(--text-main)",
                          borderRadius: "4px",
                          padding: "0.15rem 0.4rem",
                          fontSize: "0.75rem",
                          fontWeight: 700
                        }}
                      >
                        <option value="MCQ">MCQ (Single)</option>
                        <option value="MULTI_SELECT">Multi-Select</option>
                        <option value="SHORT_ANSWER">Short Answer</option>
                        <option value="LONG_ANSWER">Long Essay</option>
                        <option value="IMAGE_UPLOAD">Diagram Upload</option>
                      </select>

                      {/* Difficulty Dropdown */}
                      <select
                        value={q.difficulty}
                        onChange={(e) => handleUpdateQuestion(realIndex, "difficulty", e.target.value)}
                        style={{
                          background: "rgba(30, 41, 59, 0.8)",
                          border: "1px solid var(--border-color)",
                          color: q.difficulty === "HARD" ? "#f43f5e" : q.difficulty === "MEDIUM" ? "#fbbf24" : "#34d399",
                          borderRadius: "4px",
                          padding: "0.15rem 0.4rem",
                          fontSize: "0.75rem",
                          fontWeight: 700
                        }}
                      >
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                      </select>
                    </div>

                    {/* Right controls: Marks, Delete */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>Marks:</span>
                        <input
                          type="number"
                          step={0.5}
                          min={0.5}
                          value={q.marks}
                          onChange={(e) => handleUpdateQuestion(realIndex, "marks", parseFloat(e.target.value) || 1.0)}
                          style={{
                            width: "50px",
                            padding: "0.15rem 0.35rem",
                            fontSize: "0.8rem",
                            background: "rgba(15, 23, 42, 0.9)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "4px",
                            color: "#34d399",
                            fontWeight: 700,
                            textAlign: "center"
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(realIndex)}
                        title="Remove question from staging list"
                        style={{
                          background: "rgba(244, 63, 94, 0.15)",
                          border: "1px solid rgba(244, 63, 94, 0.3)",
                          color: "#fda4af",
                          borderRadius: "4px",
                          padding: "0.25rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center"
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Duplicate Question Action Banner */}
                  {q.is_duplicate && (
                    <div style={{
                      background: "rgba(168, 85, 247, 0.15)",
                      border: "1px solid rgba(168, 85, 247, 0.4)",
                      borderRadius: "6px",
                      padding: "0.5rem 0.75rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      flexWrap: "wrap"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Copy size={15} color="#c084fc" />
                        <span style={{ fontSize: "0.75rem", color: "#e9d5ff", fontWeight: 600 }}>
                          Duplicate Question Detected (Matches Question #{q.duplicate_question_id} in Question Bank)
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button
                          type="button"
                          onClick={() => handleSetDuplicateAction(realIndex, "IMPORT")}
                          style={{
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            border: q.duplicate_action === "IMPORT" ? "1px solid #c084fc" : "1px solid var(--border-color)",
                            background: q.duplicate_action === "IMPORT" ? "rgba(168, 85, 247, 0.4)" : "rgba(30, 41, 59, 0.5)",
                            color: q.duplicate_action === "IMPORT" ? "#ffffff" : "var(--text-muted)",
                            cursor: "pointer"
                          }}
                        >
                          Import Anyway
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetDuplicateAction(realIndex, "REPLACE")}
                          style={{
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            border: q.duplicate_action === "REPLACE" ? "1px solid #34d399" : "1px solid var(--border-color)",
                            background: q.duplicate_action === "REPLACE" ? "rgba(52, 211, 153, 0.3)" : "rgba(30, 41, 59, 0.5)",
                            color: q.duplicate_action === "REPLACE" ? "#34d399" : "var(--text-muted)",
                            cursor: "pointer"
                          }}
                        >
                          Replace Existing (#{q.duplicate_question_id})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetDuplicateAction(realIndex, "SKIP")}
                          style={{
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            border: q.duplicate_action === "SKIP" ? "1px solid #f43f5e" : "1px solid var(--border-color)",
                            background: q.duplicate_action === "SKIP" ? "rgba(244, 63, 94, 0.3)" : "rgba(30, 41, 59, 0.5)",
                            color: q.duplicate_action === "SKIP" ? "#fda4af" : "var(--text-muted)",
                            cursor: "pointer"
                          }}
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 1. Question Box (Clean prompt without Q1.) */}
                  <div>
                    <label style={{ fontSize: "0.7rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>
                      Question Prompt:
                    </label>
                    <textarea
                      rows={2}
                      value={q.question_text}
                      onChange={(e) => handleUpdateQuestion(realIndex, "question_text", e.target.value)}
                      className="form-control"
                      style={{ fontSize: "0.85rem", padding: "0.4rem 0.6rem", resize: "vertical" }}
                      placeholder="Enter question text..."
                    />
                  </div>

                  {/* 2. MCQ / Multi-Select Options vs Subjective Answer Field */}
                  {(q.question_type === "MCQ" || q.question_type === "MULTI_SELECT") ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase" }}>
                          {q.question_type === "MCQ" ? "MCQ Options (Select ONE Correct Radio Button):" : "Options (Select Correct Checkboxes):"}
                        </div>
                        {q.answer_key && (
                          <span style={{ fontSize: "0.75rem", color: "#34d399", background: "rgba(52, 211, 153, 0.15)", padding: "0.15rem 0.5rem", borderRadius: "4px", fontWeight: 700 }}>
                            Key: Option {q.answer_key}
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                        {(q.options || []).map((opt, optIdx) => {
                          const optTag = String.fromCharCode(65 + optIdx);
                          return (
                            <div
                              key={`opt-${optIdx}`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.6rem",
                                background: opt.is_correct ? "rgba(52, 211, 153, 0.12)" : "rgba(30, 41, 59, 0.4)",
                                border: opt.is_correct ? "1px solid rgba(52, 211, 153, 0.5)" : "1px solid var(--border-color)",
                                borderRadius: "6px",
                                padding: "0.4rem 0.65rem",
                                transition: "all 0.15s ease"
                              }}
                            >
                              {/* Real Radio Button / Checkbox */}
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.4rem",
                                  cursor: "pointer",
                                  color: opt.is_correct ? "#34d399" : "var(--text-main)",
                                  fontWeight: 800,
                                  fontSize: "0.825rem",
                                  fontFamily: "var(--font-mono)",
                                  userSelect: "none"
                                }}
                              >
                                {q.question_type === "MCQ" ? (
                                  <input
                                    type="radio"
                                    name={`mcq_radio_${realIndex}`}
                                    checked={opt.is_correct}
                                    onChange={() => handleToggleOptionCorrect(realIndex, optIdx)}
                                    style={{
                                      accentColor: "#10b981",
                                      width: "17px",
                                      height: "17px",
                                      cursor: "pointer"
                                    }}
                                  />
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={opt.is_correct}
                                    onChange={() => handleToggleOptionCorrect(realIndex, optIdx)}
                                    style={{
                                      accentColor: "#10b981",
                                      width: "17px",
                                      height: "17px",
                                      cursor: "pointer"
                                    }}
                                  />
                                )}
                                <span>{optTag})</span>
                              </label>

                              {/* Editable Option Text Input */}
                              <input
                                type="text"
                                value={opt.option_text}
                                onChange={(e) => handleUpdateOptionText(realIndex, optIdx, e.target.value)}
                                className="form-control"
                                placeholder={`Option ${optTag} text...`}
                                style={{
                                  fontSize: "0.825rem",
                                  padding: "0.25rem 0.5rem",
                                  flex: 1,
                                  background: "transparent",
                                  border: "none",
                                  color: opt.is_correct ? "#a7f3d0" : "var(--text-main)",
                                  fontWeight: opt.is_correct ? 600 : 400
                                }}
                              />

                              {opt.is_correct && (
                                <span style={{ fontSize: "0.65rem", color: "#34d399", fontWeight: 700, padding: "0.15rem 0.4rem", background: "rgba(52, 211, 153, 0.2)", borderRadius: "4px", whiteSpace: "nowrap" }}>
                                  ✓ CORRECT
                                </span>
                              )}

                              {(q.options || []).length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOption(realIndex, optIdx)}
                                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0.15rem" }}
                                  title="Delete option"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add option button */}
                      <button
                        type="button"
                        onClick={() => handleAddOption(realIndex)}
                        style={{
                          background: "transparent",
                          border: "1px dashed var(--border-color)",
                          color: "var(--text-muted)",
                          borderRadius: "4px",
                          padding: "0.25rem 0.6rem",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          alignSelf: "flex-start",
                          marginTop: "0.2rem"
                        }}
                      >
                        <Plus size={12} /> Add Option
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontSize: "0.7rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>
                        Answer Field / Model Answer:
                      </label>
                      <textarea
                        rows={2}
                        value={q.model_answer || ""}
                        onChange={(e) => handleUpdateQuestion(realIndex, "model_answer", e.target.value)}
                        className="form-control"
                        style={{ fontSize: "0.8rem", padding: "0.35rem 0.5rem", resize: "vertical" }}
                        placeholder="Enter the corresponding answer / solution..."
                      />
                    </div>
                  )}

                  {/* 3. AI Rubric / Key Criteria (Dedicated Field) */}
                  <div style={{ marginTop: "0.1rem" }}>
                    <label style={{ fontSize: "0.7rem", color: "#c084fc", fontWeight: 700, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.25rem" }}>
                      <Sparkles size={12} color="#c084fc" /> AI Rubric / Key Criteria (Evaluation Guidelines):
                    </label>
                    <textarea
                      rows={1}
                      value={q.evaluation_guidelines || ""}
                      onChange={(e) => handleUpdateQuestion(realIndex, "evaluation_guidelines", e.target.value)}
                      className="form-control"
                      style={{ fontSize: "0.775rem", padding: "0.3rem 0.5rem", resize: "vertical", borderColor: q.evaluation_guidelines ? "rgba(168, 85, 247, 0.4)" : "var(--border-color)", background: "rgba(15, 23, 42, 0.4)" }}
                      placeholder="e.g. Identifies LIFO • Selects Stack (Optional grading criteria for AI auto-evaluation)"
                    />
                  </div>

                  {/* Missing Answer Alert Flag */}
                  {isMissingAnswer && (
                    <div style={{
                      background: "rgba(251, 191, 36, 0.12)",
                      border: "1px solid rgba(251, 191, 36, 0.35)",
                      borderRadius: "4px",
                      padding: "0.35rem 0.6rem",
                      fontSize: "0.75rem",
                      color: "#fbbf24",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem"
                    }}>
                      <AlertTriangle size={14} />
                      <span>Answer could not be automatically detected. Please enter or select the answer.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons Footer */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--border-color)",
            flexWrap: "wrap",
            gap: "0.75rem"
          }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {selectedIndices.length} question(s) selected for import
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              {/* Option to add directly to exam blueprint */}
              {onAddToExam && (
                <button
                  type="button"
                  onClick={handleAddDirectlyToExam}
                  disabled={selectedIndices.length === 0}
                  className="btn btn-secondary"
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700 }}
                  title="Adds extracted questions directly into active exam selection"
                >
                  <CheckCircle2 size={16} color="#818cf8" /> Add Selected to Exam Blueprint
                </button>
              )}

              {/* Option to save to Question Bank DB & Add to exam */}
              {(onSaveToBankAndAdd || onAddToExam) && (
                <button
                  type="button"
                  onClick={handleSaveToBankAndAddToExam}
                  disabled={selectedIndices.length === 0 || isSaving}
                  className="btn btn-primary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontWeight: 700,
                    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
                  }}
                  title="Saves to Question Bank DB for permanent reuse and attaches to current exam"
                >
                  <Database size={16} className={isSaving ? "animate-spin" : ""} />
                  {isSaving ? "Saving to Database..." : "💾 Save to Question Bank & Add to Exam"}
                </button>
              )}

              {/* In Question Bank mode: Save to Question Bank only */}
              {!onAddToExam && onQuestionsSavedToBank && (
                <button
                  type="button"
                  onClick={handleSaveToQuestionBank}
                  disabled={selectedIndices.length === 0 || isSaving}
                  className="btn btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700 }}
                >
                  <Database size={16} className={isSaving ? "animate-spin" : ""} />
                  {isSaving ? "Importing to Question Bank..." : "Save Selected to Question Bank"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
