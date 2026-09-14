import React, { useState, useEffect } from "react";
import { 
  PlusCircle, 
  Trash2, 
  Sparkles, 
  Save, 
  ArrowLeft, 
  HelpCircle, 
  CheckSquare, 
  Circle, 
  Image as ImageIcon, 
  FileText,
  AlertCircle,
  FileSpreadsheet,
  Edit3
} from "lucide-react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import { DocumentQuestionExtractor } from "../components/DocumentQuestionExtractor";

export const AddEditQuestion = ({ editQuestion = null, setCurrentView }) => {
  const { showToast } = useToast();
  const isEditing = !!editQuestion;

  // Authoring Mode: 'manual', 'ai', 'extractor'
  const [authoringMode, setAuthoringMode] = useState("manual");

  const [questionType, setQuestionType] = useState(editQuestion?.question_type || "MCQ");
  const [subject, setSubject] = useState(editQuestion?.subject || "Artificial Intelligence");
  const [difficulty, setDifficulty] = useState(editQuestion?.difficulty || "MEDIUM");
  const [marks, setMarks] = useState(editQuestion?.marks !== undefined ? editQuestion.marks : 1.0);
  const [negativeMarks, setNegativeMarks] = useState(editQuestion?.negative_marks !== undefined ? editQuestion.negative_marks : 0.0);
  const [questionText, setQuestionText] = useState(editQuestion?.question_text || "");
  const [modelAnswer, setModelAnswer] = useState(editQuestion?.model_answer || "");
  const [evaluationGuidelines, setEvaluationGuidelines] = useState(editQuestion?.evaluation_guidelines || "");

  // Options state for MCQ / MULTI_SELECT
  const [options, setOptions] = useState(
    editQuestion?.options?.length > 0
      ? editQuestion.options.map((o) => ({ option_text: o.option_text, is_correct: Boolean(o.is_correct) }))
      : [
          { option_text: "", is_correct: true },
          { option_text: "", is_correct: false },
          { option_text: "", is_correct: false },
          { option_text: "", is_correct: false }
        ]
  );

  useEffect(() => {
    if (editQuestion) {
      setQuestionType(editQuestion.question_type || "MCQ");
      setSubject(editQuestion.subject || "Artificial Intelligence");
      setDifficulty(editQuestion.difficulty || "MEDIUM");
      setMarks(editQuestion.marks !== undefined ? editQuestion.marks : 1.0);
      setNegativeMarks(editQuestion.negative_marks !== undefined ? editQuestion.negative_marks : 0.0);
      setQuestionText(editQuestion.question_text || "");
      setModelAnswer(editQuestion.model_answer || "");
      setEvaluationGuidelines(editQuestion.evaluation_guidelines || "");
      if (editQuestion.options && editQuestion.options.length > 0) {
        setOptions(editQuestion.options.map((o) => ({ option_text: o.option_text, is_correct: Boolean(o.is_correct) })));
      }
    }
  }, [editQuestion]);

  const [loading, setLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const subjectsList = [
    "Artificial Intelligence",
    "Data Structures & Algorithms",
    "Database Systems",
    "Cybersecurity & Networks",
    "Computer Organization",
    "Digital Electronics",
    "Software Engineering",
    "Operating Systems",
    "Mathematics & Statistics"
  ];

  // Adjust default marks when question type changes (if not editing)
  const handleTypeChange = (newType) => {
    setQuestionType(newType);
    if (!isEditing) {
      if (newType === "MCQ") {
        setMarks(1.0);
        setNegativeMarks(0.25);
      } else if (newType === "MULTI_SELECT") {
        setMarks(2.0);
        setNegativeMarks(0.5);
      } else if (newType === "SHORT_ANSWER") {
        setMarks(5.0);
        setNegativeMarks(0.0);
      } else if (newType === "LONG_ANSWER") {
        setMarks(10.0);
        setNegativeMarks(0.0);
      } else if (newType === "IMAGE_UPLOAD") {
        setMarks(15.0);
        setNegativeMarks(0.0);
      }
    }
  };

  const handleOptionTextChange = (idx, text) => {
    const newOpts = [...options];
    newOpts[idx].option_text = text;
    setOptions(newOpts);
  };

  const handleOptionCorrectToggle = (idx) => {
    const newOpts = [...options];
    if (questionType === "MCQ") {
      // Single choice: make this option true, all others false
      newOpts.forEach((opt, i) => {
        opt.is_correct = i === idx;
      });
    } else {
      // Multi select: toggle
      newOpts[idx].is_correct = !newOpts[idx].is_correct;
    }
    setOptions(newOpts);
  };

  const handleAddOption = () => {
    setOptions([...options, { option_text: "", is_correct: false }]);
  };

  const handleRemoveOption = (idx) => {
    if (options.length <= 2) {
      showToast("Questions require at least 2 options.", "warning");
      return;
    }
    const newOpts = options.filter((_, i) => i !== idx);
    setOptions(newOpts);
  };

  const handleAiGenerate = async () => {
    if (!aiTopic) {
      showToast("Please enter a topic for AI generation (e.g. Convolutional Neural Networks).", "warning");
      return;
    }
    setGeneratingAi(true);
    try {
      const generated = await api.aiGenerateQuestion({
        topic: aiTopic,
        subject,
        question_type: questionType,
        difficulty
      });

      setQuestionText(generated.question_text);
      setMarks(generated.marks);
      setNegativeMarks(generated.negative_marks);
      if (generated.options && generated.options.length > 0) {
        setOptions(generated.options);
      }
      if (generated.model_answer) {
        setModelAnswer(generated.model_answer);
      }
      if (generated.evaluation_guidelines) {
        setEvaluationGuidelines(generated.evaluation_guidelines);
      }
      showToast(`Synthesized question for "${aiTopic}"!`, "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!questionText.trim()) {
      setErrorMsg("Question prompt is required.");
      return;
    }

    if (questionType === "MCQ" || questionType === "MULTI_SELECT") {
      const validOpts = options.filter((o) => o.option_text.trim() !== "");
      if (validOpts.length < 2) {
        setErrorMsg("Please provide at least 2 valid option texts.");
        return;
      }
      const correctCount = validOpts.filter((o) => o.is_correct).length;
      if (questionType === "MCQ" && correctCount !== 1) {
        setErrorMsg("MCQ (Single choice) must have exactly ONE correct option chosen.");
        return;
      }
      if (questionType === "MULTI_SELECT" && correctCount < 1) {
        setErrorMsg("Multi-Select questions must have at least one correct option chosen.");
        return;
      }
    }

    const payload = {
      question_text: questionText,
      question_type: questionType,
      subject,
      difficulty,
      marks: parseFloat(marks),
      negative_marks: parseFloat(negativeMarks || 0),
      model_answer: modelAnswer || null,
      evaluation_guidelines: evaluationGuidelines || null,
      options: (questionType === "MCQ" || questionType === "MULTI_SELECT")
        ? options.filter((o) => o.option_text.trim() !== "")
        : []
    };

    setLoading(true);

    try {
      if (isEditing) {
        await api.updateQuestion(editQuestion.id, payload);
        showToast(`Question #${editQuestion.id} updated successfully!`, "success");
      } else {
        await api.createQuestion(payload);
        showToast("New question added to repository!", "success");
      }
      setCurrentView("question_bank");
    } catch (err) {
      setErrorMsg(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: "920px", paddingBottom: "4rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <button
          onClick={() => setCurrentView("question_bank")}
          className="btn btn-secondary btn-sm"
        >
          <ArrowLeft size={16} /> Back to Question Bank
        </button>
        <h1 style={{ fontSize: "1.65rem", fontWeight: 800, margin: 0 }}>
          {isEditing ? `Edit Question #${editQuestion.id}` : "Create New Assessment Item"}
        </h1>
        <div style={{ width: "80px" }} />
      </div>

      {/* Authoring Mode Switcher (When creating new questions) */}
      {!isEditing && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1.75rem",
            background: "rgba(15, 23, 42, 0.6)",
            padding: "0.35rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)"
          }}
        >
          <button
            type="button"
            onClick={() => setAuthoringMode("manual")}
            style={{
              flex: 1,
              padding: "0.6rem 1rem",
              borderRadius: "6px",
              border: "none",
              background: authoringMode === "manual" ? "linear-gradient(135deg, #4f46e5, #6366f1)" : "transparent",
              color: authoringMode === "manual" ? "#ffffff" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              transition: "all 0.2s ease"
            }}
          >
            <Edit3 size={16} /> Manual Question Form
          </button>
          <button
            type="button"
            onClick={() => setAuthoringMode("ai")}
            style={{
              flex: 1,
              padding: "0.6rem 1rem",
              borderRadius: "6px",
              border: "none",
              background: authoringMode === "ai" ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "transparent",
              color: authoringMode === "ai" ? "#ffffff" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              transition: "all 0.2s ease"
            }}
          >
            <Sparkles size={16} /> AI Question Synthesizer
          </button>
          <button
            type="button"
            onClick={() => setAuthoringMode("extractor")}
            style={{
              flex: 1,
              padding: "0.6rem 1rem",
              borderRadius: "6px",
              border: "none",
              background: authoringMode === "extractor" ? "linear-gradient(135deg, #059669, #10b981)" : "transparent",
              color: authoringMode === "extractor" ? "#ffffff" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              transition: "all 0.2s ease"
            }}
          >
            <FileSpreadsheet size={16} /> Extract from File (Excel / Word / PDF)
          </button>
        </div>
      )}

      {/* MODE 3: DOCUMENT EXTRACTOR */}
      {authoringMode === "extractor" && !isEditing ? (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          <DocumentQuestionExtractor
            currentSubject={subject}
            onQuestionsSavedToBank={(created) => {
              showToast(`Saved ${created.length} question(s) from document into Question Bank!`, "success");
              setCurrentView("question_bank");
            }}
          />
        </div>
      ) : (
        <>
          {/* AI Assistance Generator Bar (Active in AI mode or collapsible) */}
          {(!isEditing && (authoringMode === "ai" || authoringMode === "manual")) && (
            <div
              className="glass-card"
              style={{
                padding: "1.25rem",
                marginBottom: "1.75rem",
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.12) 100%)",
                border: "1px solid rgba(99, 102, 241, 0.35)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                <Sparkles size={18} color="#818cf8" />
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#c7d2fe" }}>
                  AI Question Synthesizer
                </span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.85rem" }}>
                Type a concept or topic and let the AI generate question text, option choices, and model answer keys automatically!
              </p>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Dijkstra's Algorithm, SQL Indexing, Transformer Attention..."
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAiGenerate}
                  disabled={generatingAi}
                  style={{ whiteSpace: "nowrap" }}
                >
                  <Sparkles size={16} />
                  {generatingAi ? "Synthesizing..." : "Generate AI Item"}
                </button>
              </div>
            </div>
          )}

      {errorMsg && (
        <div
          style={{
            background: "rgba(244, 63, 94, 0.12)",
            border: "1px solid rgba(244, 63, 94, 0.35)",
            borderRadius: "var(--radius-md)",
            padding: "0.85rem 1rem",
            color: "#fda4af",
            fontSize: "0.875rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <AlertCircle size={18} />
          {errorMsg}
        </div>
      )}

      {/* Main Question Form */}
      <form onSubmit={handleSubmit}>
        <div className="glass-card" style={{ padding: "2rem", marginBottom: "1.5rem" }}>
          {/* Question Type, Subject, Difficulty Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Question Type *</label>
              <select
                className="form-control"
                value={questionType}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="MCQ">1. MCQ (Single Choice)</option>
                <option value="MULTI_SELECT">2. Multi-Select (Multiple Choice)</option>
                <option value="SHORT_ANSWER">3. Short Answer</option>
                <option value="LONG_ANSWER">4. Long Answer</option>
                <option value="IMAGE_UPLOAD">5. Image Upload Question</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Subject *</label>
              <select
                className="form-control"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {subjectsList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Difficulty Level *</label>
              <select
                className="form-control"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
          </div>

          {/* Marks & Negative Marks */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Marks Awarded *</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                className="form-control"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Negative Penalty (Optional)</label>
              <input
                type="number"
                step="0.25"
                min="0"
                className="form-control"
                value={negativeMarks}
                onChange={(e) => setNegativeMarks(e.target.value)}
              />
            </div>
          </div>

          {/* Question Text */}
          <div className="form-group">
            <label className="form-label">Question Prompt / Problem Statement *</label>
            <textarea
              rows={4}
              required
              placeholder="Enter the complete question prompt, problem description, or code snippet..."
              className="form-control"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
          </div>

          {/* Dynamic Options Section for MCQ and MULTI_SELECT */}
          {(questionType === "MCQ" || questionType === "MULTI_SELECT") && (
            <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main)" }}>
                    {questionType === "MCQ" ? "Options (Single Correct Radio)" : "Options (Multi-Select Checkboxes)"}
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                    Click the radio/checkbox to set the correct answer(s)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="btn btn-secondary btn-sm"
                >
                  <PlusCircle size={14} /> Add Option
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {options.map((opt, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      background: opt.is_correct ? "rgba(16, 185, 129, 0.08)" : "rgba(15, 23, 42, 0.6)",
                      border: `1px solid ${opt.is_correct ? "rgba(16, 185, 129, 0.3)" : "var(--border-color)"}`,
                      borderRadius: "var(--radius-md)",
                      padding: "0.65rem 0.85rem"
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        cursor: "pointer",
                        color: opt.is_correct ? "#34d399" : "var(--text-main)",
                        fontWeight: 800,
                        fontSize: "0.85rem",
                        fontFamily: "var(--font-mono)",
                        userSelect: "none"
                      }}
                      title="Select correct answer"
                    >
                      {questionType === "MCQ" ? (
                        <input
                          type="radio"
                          name="add_edit_mcq_radio"
                          checked={Boolean(opt.is_correct)}
                          onChange={() => handleOptionCorrectToggle(idx)}
                          style={{
                            accentColor: "#10b981",
                            width: "18px",
                            height: "18px",
                            cursor: "pointer"
                          }}
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={Boolean(opt.is_correct)}
                          onChange={() => handleOptionCorrectToggle(idx)}
                          style={{
                            accentColor: "#10b981",
                            width: "18px",
                            height: "18px",
                            cursor: "pointer"
                          }}
                        />
                      )}
                      <span>{String.fromCharCode(65 + idx)})</span>
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Option ${String.fromCharCode(65 + idx)} text...`}
                      value={opt.option_text}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                      style={{ flex: 1, padding: "0.5rem 0.75rem" }}
                    />

                    {opt.is_correct && (
                      <span className="badge badge-approved" style={{ fontSize: "0.7rem" }}>
                        Correct
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#fb7185",
                        cursor: "pointer",
                        padding: "4px"
                      }}
                      title="Remove option"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model Answer for Short Answer / Long Answer / Image Upload */}
          {(questionType === "SHORT_ANSWER" || questionType === "LONG_ANSWER" || questionType === "IMAGE_UPLOAD" || questionType === "MCQ" || questionType === "MULTI_SELECT") && (
            <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
              <div className="form-group">
                <label className="form-label">
                  Expected / Model Answer / Solution Key
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide the step-by-step model answer, key formulas, or reference solution..."
                  className="form-control"
                  value={modelAnswer}
                  onChange={(e) => setModelAnswer(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Evaluation Guidelines for Long Answer / Image Upload */}
          {(questionType === "LONG_ANSWER" || questionType === "IMAGE_UPLOAD" || questionType === "SHORT_ANSWER") && (
            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label className="form-label">
                Evaluation Rubric & Guidelines (For AI Vision / Manual Grading)
              </label>
              <textarea
                rows={3}
                placeholder="Specify marking breakdown: e.g. 4 Marks for circuit schematic, 3 Marks for truth table..."
                className="form-control"
                value={evaluationGuidelines}
                onChange={(e) => setEvaluationGuidelines(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setCurrentView("question_bank")}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
          >
            <Save size={18} />
            {loading ? "Saving Item..." : isEditing ? "Update Question Item" : "Save Question to Bank"}
          </button>
        </div>
      </form>
      </>
      )}
    </div>
  );
};
