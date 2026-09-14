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
    <div className="page-container" style={{ maxWidth: "600px", paddingTop: "3.5rem", paddingBottom: "5rem" }}>
      <div className="glass-card" style={{ padding: "3.25rem 3.5rem", borderRadius: "var(--radius-xl)" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(16, 185, 129, 0.22))",
              border: "1px solid rgba(99, 102, 241, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
              color: "#a5b4fc",
              boxShadow: "0 8px 24px rgba(99, 102, 241, 0.25)"
            }}
          >
            <GraduationCap size={34} />
          </div>
          <h1 style={{ fontSize: "2.1rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.025em", marginBottom: "0.5rem" }}>
            Student Examination Login
          </h1>
          <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
            Enter your student credentials to access scheduled candidate evaluations
          </p>
        </div>

        {/* Status Alerts for PENDING / REJECTED / ERROR */}
        {statusAlert && (
          <div
            style={{
              borderRadius: "var(--radius-md)",
              padding: "1.25rem 1.4rem",
              marginBottom: "2rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "1rem",
              background:
                statusAlert.type === "pending"
                  ? "rgba(245, 158, 11, 0.15)"
                  : "rgba(244, 63, 94, 0.15)",
              border: `1px solid ${
                statusAlert.type === "pending"
                  ? "rgba(245, 158, 11, 0.45)"
                  : "rgba(244, 63, 94, 0.45)"
              }`,
              color: statusAlert.type === "pending" ? "#fde68a" : "#fda4af"
            }}
          >
            {statusAlert.type === "pending" ? (
              <AlertTriangle size={24} color="#fbbf24" style={{ flexShrink: 0, marginTop: "2px" }} />
            ) : (
              <AlertCircle size={24} color="#fb7185" style={{ flexShrink: 0, marginTop: "2px" }} />
            )}
            <div style={{ fontSize: "0.95rem", lineHeight: 1.55 }}>
              <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>
                {statusAlert.type === "pending" ? "Approval Required" : "Access Denied"}
              </div>
              {statusAlert.message}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email or Register Number */}
          <div className="form-group" style={{ marginBottom: "1.75rem" }}>
            <label className="form-label" style={{ fontSize: "0.925rem", marginBottom: "0.65rem" }}>
              Email Address or Register Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. student@examai.edu or REG2024CS001"
              className="form-control"
              style={{ padding: "0.95rem 1.25rem", fontSize: "1rem" }}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
              <label className="form-label" style={{ margin: 0, fontSize: "0.925rem" }}>Password *</label>
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
                  fontSize: "0.85rem",
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
              style={{ padding: "0.95rem 1.25rem", fontSize: "1rem" }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: "100%", padding: "1rem 2rem", fontSize: "1.05rem" }}
          >
            {loading ? "Authenticating..." : "Sign In to Exam Portal"}
          </button>
        </form>

        {/* Quick Fill Demo Test States */}
        <div style={{ marginTop: "2.25rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-subtle)", marginBottom: "0.85rem", textAlign: "center", letterSpacing: "0.05em" }}>
            Test Different Account States:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill("student@examai.edu", "Student@123")}
              style={{ fontSize: "0.825rem", padding: "0.6rem 0.75rem", color: "#34d399", borderColor: "rgba(16, 185, 129, 0.35)" }}
              title="Test Approved Student"
            >
              Approved
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill("alex@examai.edu", "Student@123")}
              style={{ fontSize: "0.825rem", padding: "0.6rem 0.75rem", color: "#fbbf24", borderColor: "rgba(245, 158, 11, 0.35)" }}
              title="Test Pending Student"
            >
              Pending
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill("jake@examai.edu", "Student@123")}
              style={{ fontSize: "0.825rem", padding: "0.6rem 0.75rem", color: "#fb7185", borderColor: "rgba(244, 63, 94, 0.35)" }}
              title="Test Rejected Student"
            >
              Rejected
            </button>
          </div>
        </div>

        {/* Registration Link */}
        <div style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.95rem", color: "var(--text-muted)" }}>
          New student?{" "}
          <button
            onClick={() => setCurrentView("student_register")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--primary-light)",
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: "0.95rem"
            }}
          >
            Create an Account Here
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px", padding: "2.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <HelpCircle size={22} color="#818cf8" />
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Reset Password</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.55, marginBottom: "1.5rem" }}>
              Enter your registered Email or Student Register Number to request a password reset from the administrator.
            </p>

            <form onSubmit={handleForgotSubmit}>
              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label className="form-label">Email or Register Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. student@college.edu"
                  className="form-control"
                  style={{ padding: "0.85rem 1.15rem" }}
                  value={forgotInput}
                  onChange={(e) => setForgotInput(e.target.value)}
                />
              </div>

              {forgotMsg && (
                <div style={{ background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: "var(--radius-md)", padding: "0.9rem 1rem", fontSize: "0.9rem", color: "#c7d2fe", marginBottom: "1.5rem" }}>
                  {forgotMsg}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
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
