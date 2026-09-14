import React from "react";
import { X, HelpCircle, CheckCircle2, Circle, FileText, Image as ImageIcon, Award, BookOpen, AlertTriangle } from "lucide-react";
import { DifficultyBadge, QuestionTypeBadge } from "./StatusBadge";

export const QuestionDetailModal = ({ question, isOpen, onClose, onEdit, onDelete }) => {
  if (!isOpen || !question) return null;

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
              {question.subject}
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
            Question Prompt:
          </span>
          <div style={{ fontSize: "1rem", color: "var(--text-main)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {question.question_text}
          </div>
        </div>

        {/* Options for MCQ / Multi-Select */}
        {(question.question_type === "MCQ" || question.question_type === "MULTI_SELECT") && (
          <div style={{ marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em", display: "block", marginBottom: "0.6rem" }}>
              Answer Options ({question.options?.length || 0}):
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {question.options?.map((opt, idx) => (
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
                    {opt.option_text}
                  </span>
                  {opt.is_correct && (
                    <span className="badge badge-approved" style={{ fontSize: "0.65rem", padding: "0.15rem 0.45rem" }}>
                      Correct Answer
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image Upload Requirements */}
        {question.question_type === "IMAGE_UPLOAD" && (
          <div style={{ background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.3)", borderRadius: "var(--radius-md)", padding: "1rem", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#67e8f9", fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem" }}>
              <ImageIcon size={16} /> Student Upload Submission Type:
            </div>
            <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Accepts handwritten drawings, circuit schematics, and structural diagrams via high-res image upload (JPEG/PNG/PDF).
            </div>
          </div>
        )}

        {/* Model Answer / Solution */}
        {question.model_answer && (
          <div style={{ marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#a5b4fc", letterSpacing: "0.05em", display: "block", marginBottom: "0.4rem" }}>
              Expected / Model Answer:
            </span>
            <div style={{ background: "rgba(30, 41, 59, 0.6)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "1rem", fontSize: "0.9rem", lineHeight: 1.5, color: "var(--text-main)", whiteSpace: "pre-wrap" }}>
              {question.model_answer}
            </div>
          </div>
        )}

        {/* Evaluation Guidelines */}
        {question.evaluation_guidelines && (
          <div style={{ marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#fbbf24", letterSpacing: "0.05em", display: "block", marginBottom: "0.4rem" }}>
              Evaluation Rubric / Guidelines:
            </span>
            <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "var(--radius-md)", padding: "0.85rem", fontSize: "0.875rem", lineHeight: 1.4, color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>
              {question.evaluation_guidelines}
            </div>
          </div>
        )}

        {/* Scoring & Metadata Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem", paddingTop: "0.5rem" }}>
          <div className="glass-card" style={{ padding: "0.75rem", textAlign: "center" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block" }}>Marks</span>
            <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#34d399" }}>+{question.marks}</span>
          </div>
          <div className="glass-card" style={{ padding: "0.75rem", textAlign: "center" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block" }}>Negative Penalty</span>
            <span style={{ fontWeight: 800, fontSize: "1.1rem", color: question.negative_marks > 0 ? "#fb7185" : "var(--text-subtle)" }}>
              -{question.negative_marks}
            </span>
          </div>
          <div className="glass-card" style={{ padding: "0.75rem", textAlign: "center" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block" }}>Created By</span>
            <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-main)" }}>
              {question.creator_name || "Examiner"}
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {onDelete && (
              <button className="btn btn-rose" onClick={() => onDelete(question)}>
                Delete
              </button>
            )}
            {onEdit && (
              <button className="btn btn-primary" onClick={() => onEdit(question)}>
                Edit Question
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
