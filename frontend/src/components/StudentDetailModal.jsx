import React from "react";
import { X, User, Mail, Hash, BookOpen, Calendar, Clock, AlertCircle } from "lucide-react";
import { StatusBadge, RoleBadge } from "./StatusBadge";
import { useLanguage } from "../context/LanguageContext";

export const StudentDetailModal = ({ student, isOpen, onClose, onApprove, onReject }) => {
  const { t } = useLanguage();
  if (!isOpen || !student) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px", padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ background: "rgba(99, 102, 241, 0.15)", padding: "0.75rem", borderRadius: "var(--radius-md)", color: "#a5b4fc" }}>
              <User size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>
                {t("modals.student_dossier", null, "Student Profile Dossier")}
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-subtle)" }}>
                ID #{student.id} &bull; {t("modals.registered_on", { date: new Date(student.created_at).toLocaleDateString() }, `Registered on ${new Date(student.created_at).toLocaleDateString()}`)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div className="glass-card" style={{ padding: "1rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <User size={14} /> {t("modals.full_name", null, "Full Name")}
            </span>
            <div style={{ fontWeight: 600, fontSize: "0.95rem", marginTop: "0.25rem", color: "var(--text-main)" }}>
              {student.name}
            </div>
          </div>

          <div className="glass-card" style={{ padding: "1rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Hash size={14} /> {t("modals.register_number", null, "Register Number / ID")}
            </span>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginTop: "0.25rem", color: "var(--primary-light)", fontFamily: "var(--font-mono)" }}>
              {student.register_number || t("common.na", null, "N/A")}
            </div>
          </div>

          <div className="glass-card" style={{ padding: "1rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Mail size={14} /> {t("modals.institutional_email", null, "Institutional Email")}
            </span>
            <div style={{ fontWeight: 600, fontSize: "0.95rem", marginTop: "0.25rem", color: "var(--text-main)", wordBreak: "break-all" }}>
              {student.email}
            </div>
          </div>

          <div className="glass-card" style={{ padding: "1rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <BookOpen size={14} /> {t("modals.academic_dept", null, "Department")}
            </span>
            <div style={{ fontWeight: 600, fontSize: "0.95rem", marginTop: "0.25rem", color: "var(--text-main)" }}>
              {student.department || "General"}
            </div>
          </div>

          <div className="glass-card" style={{ padding: "1rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Calendar size={14} /> {t("modals.academic_year", null, "Academic Year")}
            </span>
            <div style={{ fontWeight: 600, fontSize: "0.95rem", marginTop: "0.25rem", color: "var(--text-main)" }}>
              {student.year || "1st Year"}
            </div>
          </div>

          <div className="glass-card" style={{ padding: "1rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Clock size={14} /> {t("common.status", null, "Status")}
            </span>
            <div style={{ marginTop: "0.35rem" }}>
              <StatusBadge status={student.approval_status} />
            </div>
          </div>
        </div>

        {student.rejection_reason && (
          <div style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "var(--radius-md)", padding: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#fb7185", fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.25rem" }}>
              <AlertCircle size={16} /> {t("modals.rejection_reason_logged", null, "Rejection Reason Logged:")}
            </div>
            <div style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>
              {student.rejection_reason}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            {t("common.close", null, "Close")}
          </button>
          {student.approval_status === "PENDING" && (
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {onReject && (
                <button className="btn btn-rose" onClick={() => onReject(student)}>
                  {t("modals.reject_request", null, "Reject Request")}
                </button>
              )}
              {onApprove && (
                <button className="btn btn-emerald" onClick={() => onApprove(student)}>
                  {t("modals.approve_student", null, "Approve Student")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

