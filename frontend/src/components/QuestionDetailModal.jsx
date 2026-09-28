import React from "react";
import { X, HelpCircle, CheckCircle2, Circle, FileText, Image as ImageIcon, Award, BookOpen, AlertTriangle } from "lucide-react";
import { DifficultyBadge, QuestionTypeBadge } from "./StatusBadge";
import { useLanguage } from "../context/LanguageContext";
import { translateContent, getLocalizedOptionLabel } from "../services/translator";

export const QuestionDetailModal = ({ question, isOpen, onClose, onEdit, onDelete }) => {
  const { language, t } = useLanguage();
  if (!isOpen || !question) return null;

  const displaySubject = question[`subject_${language}`] || translateContent(question.subject, language);
  const displayQuestionText = question[`question_text_${language}`] || translateContent(question.question_text, language);
  const displayModelAnswer = question[`model_answer_${language}`] || translateContent(question.model_answer, language);
  const displayGuidelines = question[`explanation_${language}`] || question[`evaluation_guidelines_${language}`] || translateContent(question.evaluation_guidelines, language);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "780px", padding: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.6rem" }}>
              <QuestionTypeBadge type={question.question_type} />
              <DifficultyBadge difficulty={question.difficulty} />
              <span className="badge" style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--border-color)", fontSize: "0.75rem" }}>
                ID #{question.id}
              </span>
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)", lineHeight: 1.4, margin: 0 }}>
              {displaySubject}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: "0.45rem", borderRadius: "8px" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Question Text */}
        <div className="glass-card" style={{ padding: "1.65rem", marginBottom: "1.65rem", background: "rgba(15, 23, 42, 0.75)" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", color: "var(--primary-light)", letterSpacing: "0.06em", display: "block", marginBottom: "0.65rem" }}>
            {t("modals.question_prompt", null, "Question Prompt:")}
          </span>
          <div style={{ fontSize: "1.05rem", color: "var(--text-main)", lineHeight: 1.65, whiteSpace: "pre-wrap", fontWeight: 600 }}>
            {displayQuestionText}
          </div>
        </div>

        {/* Options for MCQ / Multi-Select */}
        {(question.question_type === "MCQ" || question.question_type === "MULTI_SELECT") && (
          <div style={{ marginBottom: "1.65rem" }}>
            <span style={{ fontSize: "0.825rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em", display: "block", marginBottom: "0.75rem" }}>
              {t("modals.answer_options", { count: question.options?.length || 0 }, `Answer Options (${question.options?.length || 0}):`)}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {question.options?.map((opt, idx) => {
                const letter = getLocalizedOptionLabel(idx, language);
                const displayOptText = opt[`option_text_${language}`] || translateContent(opt.option_text, language);
                return (
                  <div
                    key={opt.id || idx}
                    style={{
                      padding: "0.95rem 1.25rem",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.85rem",
                      background: opt.is_correct ? "rgba(16, 185, 129, 0.14)" : "rgba(15, 23, 42, 0.55)",
                      border: `1px solid ${opt.is_correct ? "rgba(16, 185, 129, 0.45)" : "var(--border-color)"}`
                    }}
                  >
                    <div style={{ color: opt.is_correct ? "#34d399" : "var(--text-subtle)", display: "flex", alignItems: "center" }}>
                      {opt.is_correct ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </div>
                    <span style={{ fontSize: "0.975rem", color: opt.is_correct ? "#a7f3d0" : "var(--text-main)", fontWeight: opt.is_correct ? 700 : 400, flex: 1 }}>
                      <strong style={{ color: opt.is_correct ? "#34d399" : "var(--primary-light)", marginRight: "0.35rem" }}>{letter}.</strong> {displayOptText}
                    </span>
                    {opt.is_correct && (
                      <span className="badge badge-approved" style={{ fontSize: "0.7rem", padding: "0.2rem 0.6rem" }}>
                        {t("modals.correct_answer", null, "Correct Answer")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Image Upload Requirements */}
        {question.question_type === "IMAGE_UPLOAD" && (
          <div style={{ background: "rgba(6, 182, 212, 0.12)", border: "1px solid rgba(6, 182, 212, 0.35)", borderRadius: "var(--radius-md)", padding: "1.25rem", marginBottom: "1.65rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#67e8f9", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.4rem" }}>
              <ImageIcon size={18} /> {t("modals.image_upload_reqs", null, "Student Upload Submission Type:")}
            </div>
            <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              {t("modals.image_upload_desc", null, "Accepts handwritten drawings, circuit schematics, and structural diagrams via high-res image upload (JPEG/PNG/PDF).")}
            </div>
          </div>
        )}

        {/* Model Answer / Solution */}
        {question.model_answer && (
          <div style={{ marginBottom: "1.65rem" }}>
            <span style={{ fontSize: "0.825rem", fontWeight: 800, textTransform: "uppercase", color: "#a5b4fc", letterSpacing: "0.06em", display: "block", marginBottom: "0.5rem" }}>
              {t("modals.model_answer", null, "Expected / Model Answer:")}
            </span>
            <div style={{ background: "rgba(30, 41, 59, 0.65)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "1.25rem", fontSize: "0.95rem", lineHeight: 1.6, color: "var(--text-main)", whiteSpace: "pre-wrap" }}>
              {displayModelAnswer}
            </div>
          </div>
        )}

        {/* Evaluation Guidelines */}
        {question.evaluation_guidelines && (
          <div style={{ marginBottom: "1.65rem" }}>
            <span style={{ fontSize: "0.825rem", fontWeight: 800, textTransform: "uppercase", color: "#fbbf24", letterSpacing: "0.06em", display: "block", marginBottom: "0.5rem" }}>
              {t("modals.rubric_guidelines", null, "Evaluation Rubric / Guidelines:")}
            </span>
            <div style={{ background: "rgba(245, 158, 11, 0.09)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "var(--radius-md)", padding: "1.1rem 1.25rem", fontSize: "0.9rem", lineHeight: 1.5, color: "#fef3c7", whiteSpace: "pre-wrap" }}>
              {displayGuidelines}
            </div>
          </div>
        )}

        {/* Scoring & Metadata Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.75rem", paddingTop: "0.5rem" }}>
          <div className="glass-card" style={{ padding: "1rem", textAlign: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "block", fontWeight: 600 }}>{t("common.marks", null, "Marks")}</span>
            <span style={{ fontWeight: 800, fontSize: "1.25rem", color: "#34d399" }}>+{question.marks}</span>
          </div>
          <div className="glass-card" style={{ padding: "1rem", textAlign: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "block", fontWeight: 600 }}>{t("common.neg_marks", null, "Negative Penalty")}</span>
            <span style={{ fontWeight: 800, fontSize: "1.25rem", color: question.negative_marks > 0 ? "#fb7185" : "var(--text-subtle)" }}>
              -{question.negative_marks}
            </span>
          </div>
          <div className="glass-card" style={{ padding: "1rem", textAlign: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "block", fontWeight: 600 }}>{t("modals.created_by", null, "Created By")}</span>
            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-main)" }}>
              {question.creator_name || t("status.examiner", null, "Examiner")}
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: "0.65rem 1.4rem" }}>
            {t("common.close", null, "Close")}
          </button>
          <div style={{ display: "flex", gap: "0.85rem" }}>
            {onDelete && (
              <button className="btn btn-rose" onClick={() => onDelete(question)} style={{ padding: "0.65rem 1.25rem" }}>
                {t("common.delete", null, "Delete")}
              </button>
            )}
            {onEdit && (
              <button className="btn btn-primary" onClick={() => onEdit(question)} style={{ padding: "0.65rem 1.35rem" }}>
                {t("modals.edit_question", null, "Edit Question")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

