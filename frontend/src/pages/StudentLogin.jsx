import React, { useState } from "react";
import { GraduationCap, Lock, Mail, AlertTriangle, AlertCircle, CheckCircle, ArrowRight, HelpCircle, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

export const StudentLogin = ({ setCurrentView }) => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusAlert, setStatusAlert] = useState(null); // { type: 'pending' | 'rejected' | 'error', message: string }
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInput, setForgotInput] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusAlert(null);
    setLoading(true);

    try {
      const res = await login(identifier, password);
      showToast(`Welcome back, ${res.user.name}!`, "success");
      setCurrentView("student_dashboard");
    } catch (err) {
      const msg = err.message || "Login failed";
      
      if (msg.includes("waiting for Admin approval") || msg.includes("pending admin approval") || msg.includes("PENDING")) {
        setStatusAlert({
          type: "pending",
          message: msg.includes("Status: PENDING") ? msg : "Your account is waiting for Admin approval. Status: PENDING."
        });
        showToast("Your account is waiting for Admin approval. Status: PENDING.", "warning", 5000);
      } else if (msg.includes("not approved") || msg.includes("contact the administrator") || msg.includes("REJECTED")) {
        setStatusAlert({
          type: "rejected",
          message: msg
        });
        showToast(msg, "error", 6000);
      } else {
        setStatusAlert({
          type: "error",
          message: msg
        });
        showToast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (emailOrReg, pwd) => {
    setIdentifier(emailOrReg);
    setPassword(pwd);
    setStatusAlert(null);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.forgotPassword(forgotInput);
      setForgotMsg(res.message);
      showToast("Reset request processed", "info");
    } catch (err) {
      setForgotMsg(err.message);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: "520px", paddingTop: "2.5rem", paddingBottom: "3rem" }}>
      <div className="glass-card" style={{ padding: "2.5rem" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(16, 185, 129, 0.2))",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              color: "#a5b4fc"
            }}
          >
            <GraduationCap size={28} />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "0.35rem" }}>
            Student Examination Login
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Enter your student credentials to access candidate evaluations
          </p>
        </div>

        {/* Status Alerts for PENDING / REJECTED / ERROR */}
        {statusAlert && (
          <div
            style={{
              borderRadius: "var(--radius-md)",
              padding: "1rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
              background:
                statusAlert.type === "pending"
                  ? "rgba(245, 158, 11, 0.15)"
                  : "rgba(244, 63, 94, 0.15)",
              border: `1px solid ${
                statusAlert.type === "pending"
                  ? "rgba(245, 158, 11, 0.4)"
                  : "rgba(244, 63, 94, 0.4)"
              }`,
              color: statusAlert.type === "pending" ? "#fde68a" : "#fda4af"
            }}
          >
            {statusAlert.type === "pending" ? (
              <AlertTriangle size={22} color="#fbbf24" style={{ flexShrink: 0, marginTop: "2px" }} />
            ) : (
              <AlertCircle size={22} color="#fb7185" style={{ flexShrink: 0, marginTop: "2px" }} />
            )}
            <div style={{ fontSize: "0.9rem", lineHeight: 1.45 }}>
              <div style={{ fontWeight: 700, marginBottom: "0.2rem" }}>
                {statusAlert.type === "pending" ? "Approval Required" : "Access Denied"}
              </div>
              {statusAlert.message}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email or Register Number */}
          <div className="form-group">
            <label className="form-label">Email Address or Register Number *</label>
            <input
              type="text"
              required
              placeholder="e.g. student@examai.edu or REG2024CS001"
              className="form-control"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
              <label className="form-label" style={{ margin: 0 }}>Password *</label>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setForgotMsg("");
                  setForgotInput(identifier);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--primary-light)",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              required
              placeholder="Enter your password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            {loading ? "Authenticating..." : "Sign In to Exam Portal"}
          </button>
        </form>

        {/* Quick Fill Demo Test States */}
        <div style={{ marginTop: "1.75rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-subtle)", marginBottom: "0.65rem", textAlign: "center" }}>
            Test Different Account States:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill("student@examai.edu", "Student@123")}
              style={{ fontSize: "0.75rem", color: "#34d399", borderColor: "rgba(16, 185, 129, 0.3)" }}
              title="Test Approved Student"
            >
              Approved
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill("alex@examai.edu", "Student@123")}
              style={{ fontSize: "0.75rem", color: "#fbbf24", borderColor: "rgba(245, 158, 11, 0.3)" }}
              title="Test Pending Student"
            >
              Pending
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill("jake@examai.edu", "Student@123")}
              style={{ fontSize: "0.75rem", color: "#fb7185", borderColor: "rgba(244, 63, 94, 0.3)" }}
              title="Test Rejected Student"
            >
              Rejected
            </button>
          </div>
        </div>

        {/* Registration Link */}
        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
          New student?{" "}
          <button
            onClick={() => setCurrentView("student_register")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--primary-light)",
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "underline"
            }}
          >
            Create an Account Here
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px", padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <HelpCircle size={20} color="#818cf8" />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Reset Password</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Enter your registered Email or Student Register Number to request a password reset from the administrator.
            </p>

            <form onSubmit={handleForgotSubmit}>
              <div className="form-group">
                <label className="form-label">Email or Register Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. student@college.edu"
                  className="form-control"
                  value={forgotInput}
                  onChange={(e) => setForgotInput(e.target.value)}
                />
              </div>

              {forgotMsg && (
                <div style={{ background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: "var(--radius-md)", padding: "0.75rem", fontSize: "0.85rem", color: "#c7d2fe", marginBottom: "1rem" }}>
                  {forgotMsg}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForgotModal(false)}>
                  Close
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
