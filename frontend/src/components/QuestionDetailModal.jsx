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
  const displayGuidelines = question[`explanation_${language}`] || translateContent(question.evaluation_guidelines, language);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px", padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <QuestionTypeBadge type={question.question_type} />
              <DifficultyBadge difficulty={question.difficulty} />
              <span className="badge" style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid var(--border-color)" }}>
                ID #{question.id}
              </span>
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)", lineHeight: 1.4 }}>
              {displaySubject}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Question Text */}
        <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.25rem", background: "rgba(15, 23, 42, 0.7)" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--primary-light)", letterSpacing: "0.05em", display: "block", marginBottom: "0.5rem" }}>
            {t("modals.question_prompt", null, "Question Prompt:")}
          </span>
          <div style={{ fontSize: "1rem", color: "var(--text-main)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {displayQuestionText}
          </div>
        </div>

        {/* Options for MCQ / Multi-Select */}
        {(question.question_type === "MCQ" || question.question_type === "MULTI_SELECT") && (
          <div style={{ marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em", display: "block", marginBottom: "0.6rem" }}>
              {t("modals.answer_options", { count: question.options?.length || 0 }, `Answer Options (${question.options?.length || 0}):`)}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {question.options?.map((opt, idx) => {
                const letter = getLocalizedOptionLabel(idx, language);
                const displayOptText = opt[`option_text_${language}`] || translateContent(opt.option_text, language);
                return (
                  <div
                    key={opt.id || idx}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      background: opt.is_correct ? "rgba(16, 185, 129, 0.12)" : "rgba(15, 23, 42, 0.5)",
                      border: `1px solid ${opt.is_correct ? "rgba(16, 185, 129, 0.4)" : "var(--border-color)"}`
                    }}
                  >
                    <div style={{ color: opt.is_correct ? "#34d399" : "var(--text-subtle)", display: "flex", alignItems: "center" }}>
                      {opt.is_correct ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </div>
                    <span style={{ fontSize: "0.925rem", color: opt.is_correct ? "#a7f3d0" : "var(--text-main)", fontWeight: opt.is_correct ? 600 : 400, flex: 1 }}>
                      <strong>{letter}.</strong> {displayOptText}
                    </span>
                    {opt.is_correct && (
                      <span className="badge badge-approved" style={{ fontSize: "0.65rem", padding: "0.15rem 0.45rem" }}>
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
          <div style={{ background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.3)", borderRadius: "var(--radius-md)", padding: "1rem", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#67e8f9", fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem" }}>
              <ImageIcon size={16} /> {t("modals.image_upload_reqs", null, "Student Upload Submission Type:")}
            </div>
            <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
              {t("modals.image_upload_desc", null, "Accepts handwritten drawings, circuit schematics, and structural diagrams via high-res image upload (JPEG/PNG/PDF).")}
            </div>
          </div>
        )}

        {/* Model Answer / Solution */}
        {question.model_answer && (
          <div style={{ marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#a5b4fc", letterSpacing: "0.05em", display: "block", marginBottom: "0.4rem" }}>
              {t("modals.model_answer", null, "Expected / Model Answer:")}
            </span>
            <div style={{ background: "rgba(30, 41, 59, 0.6)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "1rem", fontSize: "0.9rem", lineHeight: 1.5, color: "var(--text-main)", whiteSpace: "pre-wrap" }}>
              {displayModelAnswer}
            </div>
          </div>
        )}

        {/* Evaluation Guidelines */}
        {question.evaluation_guidelines && (
          <div style={{ marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#fbbf24", letterSpacing: "0.05em", display: "block", marginBottom: "0.4rem" }}>
              {t("modals.rubric_guidelines", null, "Evaluation Rubric / Guidelines:")}
            </span>
            <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "var(--radius-md)", padding: "0.85rem", fontSize: "0.875rem", lineHeight: 1.4, color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>
              {displayGuidelines}
            </div>
          </div>
        )}

        {/* Scoring & Metadata Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem", paddingTop: "0.5rem" }}>
          <div className="glass-card" style={{ padding: "0.75rem", textAlign: "center" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block" }}>{t("common.marks", null, "Marks")}</span>
            <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#34d399" }}>+{question.marks}</span>
          </div>
          <div className="glass-card" style={{ padding: "0.75rem", textAlign: "center" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block" }}>{t("common.neg_marks", null, "Negative Penalty")}</span>
            <span style={{ fontWeight: 800, fontSize: "1.1rem", color: question.negative_marks > 0 ? "#fb7185" : "var(--text-subtle)" }}>
              -{question.negative_marks}
            </span>
          </div>
          <div className="glass-card" style={{ padding: "0.75rem", textAlign: "center" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block" }}>{t("modals.created_by", null, "Created By")}</span>
            <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-main)" }}>
              {question.creator_name || t("status.examiner", null, "Examiner")}
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            {t("common.close", null, "Close")}
          </button>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {onDelete && (
              <button className="btn btn-rose" onClick={() => onDelete(question)}>
                {t("common.delete", null, "Delete")}
              </button>
            )}
            {onEdit && (
              <button className="btn btn-primary" onClick={() => onEdit(question)}>
                {t("modals.edit_question", null, "Edit Question")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

