import React, { useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  type = "primary", // primary, emerald, rose
  showReasonInput = false,
  reasonPlaceholder,
  onConfirm,
  onCancel,
  loading = false
}) => {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(showReasonInput ? reason : undefined);
  };

  const getButtonClass = () => {
    if (type === "emerald") return "btn btn-emerald";
    if (type === "rose") return "btn btn-rose";
    return "btn btn-primary";
  };

  const finalConfirmText = confirmText || t("common.confirm", null, "Confirm");
  const finalCancelText = cancelText || t("common.cancel", null, "Cancel");
  const finalPlaceholder = reasonPlaceholder || t("modals.rejection_reason_placeholder", null, "Provide a rejection reason...");

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px", padding: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {type === "rose" ? (
              <div style={{ background: "rgba(244, 63, 94, 0.15)", padding: "0.6rem", borderRadius: "50%", color: "#fb7185" }}>
                <AlertCircle size={22} />
              </div>
            ) : (
              <div style={{ background: "rgba(16, 185, 129, 0.15)", padding: "0.6rem", borderRadius: "50%", color: "#34d399" }}>
                <CheckCircle2 size={22} />
              </div>
            )}
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)" }}>
              {title || t("modals.confirm_title", null, "Confirm Action")}
            </h3>
          </div>
          <button
            onClick={onCancel}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: "0.925rem", lineHeight: 1.5, marginBottom: showReasonInput ? "1rem" : "1.5rem" }}>
          {message}
        </p>

        {showReasonInput && (
          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <label className="form-label">{t("modals.rejection_reason_label", null, "Rejection Reason (Optional / Sent to Student):")}</label>
            <textarea
              rows={3}
              className="form-control"
              placeholder={finalPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ resize: "vertical" }}
            />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            {finalCancelText}
          </button>
          <button type="button" className={getButtonClass()} onClick={handleConfirm} disabled={loading}>
            {loading ? t("common.processing", null, "Processing...") : finalConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

