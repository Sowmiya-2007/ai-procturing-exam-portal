import React, { useState } from "react";
import { Shield, Award, Lock, Mail, ArrowRight, AlertTriangle, AlertCircle, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const AdminLogin = ({ setCurrentView }) => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusAlert, setStatusAlert] = useState(null); // { type: 'pending' | 'rejected' | 'error', message: string }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusAlert(null);
    setLoading(true);

    try {
      const res = await login(identifier, password);
      if (res.user.role === "STUDENT") {
        showToast("Student logged in. Redirecting to Student Dashboard.", "info");
        setCurrentView("student_dashboard");
      } else if (res.user.role === "EXAMINER") {
        showToast(`Welcome Professor ${res.user.name}! Examiner portal ready.`, "success");
        setCurrentView("examiner_dashboard");
      } else {
        showToast(`Signed in as ${res.user.role}: ${res.user.name}`, "success");
        setCurrentView("admin_dashboard");
      }
    } catch (err) {
      const msg = err.message || "Authentication failed";
      if (msg.includes("awaiting Admin approval") || msg.includes("PENDING") || msg.toLowerCase().includes("pending")) {
        setStatusAlert({
          type: "pending",
          title: "Account Status: PENDING",
          message: "Your examiner account is pending admin approval. You will be authenticated into the examiner portal once approved by an administrator."
        });
        showToast("Your examiner account is pending admin approval. Status: PENDING.", "warning", 6000);
      } else if (msg.includes("not approved") || msg.includes("rejected") || msg.toLowerCase().includes("rejected") || msg.includes("REJECTED")) {
        setStatusAlert({
          type: "rejected",
          title: "Account Status: REJECTED",
          message: msg
        });
        showToast(msg, "error", 6000);
      } else {
        setStatusAlert({
          type: "error",
          title: "Authentication Failed",
          message: msg
        });
        showToast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (email, pwd) => {
    setIdentifier(email);
    setPassword(pwd);
    setStatusAlert(null);
  };

  return (
    <div className="page-container" style={{ maxWidth: "540px", paddingTop: "2.5rem", paddingBottom: "3rem" }}>
      <div className="glass-card" style={{ padding: "2.5rem", borderTop: "4px solid #a855f7" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(99, 102, 241, 0.2))",
              border: "1px solid rgba(168, 85, 247, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              color: "#c084fc"
            }}
          >
            <Shield size={28} />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "0.35rem" }}>
            Faculty & Admin Portal
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Institutional administration and verified examiner assessment portal
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
              <Clock size={22} color="#fbbf24" style={{ flexShrink: 0, marginTop: "2px" }} />
            ) : (
              <AlertCircle size={22} color="#fb7185" style={{ flexShrink: 0, marginTop: "2px" }} />
            )}
            <div style={{ fontSize: "0.875rem", lineHeight: 1.45 }}>
              <div style={{ fontWeight: 700, marginBottom: "0.2rem", color: statusAlert.type === "pending" ? "#fbbf24" : "#fb7185" }}>
                {statusAlert.title}
              </div>
              {statusAlert.message}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Administrator / Examiner Email *</label>
            <input
              type="email"
              required
              placeholder="e.g. examiner@examai.edu or admin@examai.edu"
              className="form-control"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              type="password"
              required
              placeholder="Enter your account credentials"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{
              width: "100%",
              marginTop: "0.5rem",
              background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
            }}
          >
            {loading ? "Authenticating..." : "Sign In to Portal"}
          </button>
        </form>

        {/* Quick Fill Credentials */}
        <div style={{ marginTop: "1.75rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-subtle)", marginBottom: "0.65rem", textAlign: "center" }}>
            Test Login Accounts:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill("admin@examai.edu", "Admin@123")}
              style={{ color: "#d8b4fe", borderColor: "rgba(168, 85, 247, 0.4)", fontSize: "0.75rem", padding: "0.4rem 0.2rem" }}
              title="Admin account with full rights"
            >
              <Shield size={13} /> Admin
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill("examiner@examai.edu", "Examiner@123")}
              style={{ color: "#67e8f9", borderColor: "rgba(6, 182, 212, 0.4)", fontSize: "0.75rem", padding: "0.4rem 0.2rem" }}
              title="Approved Examiner (can access portal)"
            >
              <Award size={13} /> Approved
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill("pending.examiner@examai.edu", "Examiner@123")}
              style={{ color: "#fbbf24", borderColor: "rgba(245, 158, 11, 0.4)", fontSize: "0.75rem", padding: "0.4rem 0.2rem" }}
              title="Pending Examiner (tests gatekeeper block)"
            >
              <Clock size={13} /> Pending
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Need to access student exams?{" "}
          <button
            onClick={() => setCurrentView("student_login")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--primary-light)",
              fontWeight: 700,
              cursor: "pointer",
              textDecoration: "underline"
            }}
          >
            Go to Student Portal
          </button>
        </div>
      </div>
    </div>
  );
};
