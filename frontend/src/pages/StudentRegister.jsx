import React, { useState } from "react";
import { GraduationCap, Mail, Hash, BookOpen, Calendar, Lock, CheckCircle2, Clock, ArrowRight, User, ShieldCheck } from "lucide-react";
import confetti from "canvas-confetti";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const StudentRegister = ({ setCurrentView }) => {
  const { register } = useAuth();
  const { showToast } = useToast();

  const [selectedRole, setSelectedRole] = useState("STUDENT"); // STUDENT or EXAMINER

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    register_number: "",
    department: "Computer Science & Engineering",
    year: "1st Year",
    password: "",
    confirm_password: ""
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [registeredInfo, setRegisteredInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const departments = [
    "Computer Science & Engineering",
    "Artificial Intelligence & Data Science",
    "Information Technology",
    "Electronics & Communication Engineering",
    "Electrical & Electronics Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Biomedical Engineering"
  ];

  const years = [
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
    "Postgraduate (M.Tech / MS)",
    "Faculty Member"
  ];

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (formData.password !== formData.confirm_password) {
      setErrorMsg("Password and Confirm Password do not match.");
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        register_number: formData.register_number || (selectedRole === "EXAMINER" ? `FAC-${Math.floor(1000 + Math.random() * 9000)}` : undefined),
        department: formData.department,
        year: selectedRole === "EXAMINER" ? "Faculty" : formData.year,
        password: formData.password,
        confirm_password: formData.confirm_password,
        role: selectedRole
      };

      const res = await register(payload);
      setRegisteredInfo({
        name: formData.name,
        email: formData.email,
        register_number: res.register_number || formData.register_number,
        role: res.role,
        status: res.status,
        message: res.message
      });
      setSubmitted(true);
      showToast(res.message, "success", 6000);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // ignore if canvas blocked
      }
    } catch (err) {
      setErrorMsg(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: "780px", paddingTop: "3rem", paddingBottom: "5rem" }}>
      {!submitted ? (
        <div className="glass-card" style={{ padding: "3.25rem 3.5rem", borderRadius: "var(--radius-xl)" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "20px",
                background: "linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(168, 85, 247, 0.22))",
                border: "1px solid rgba(99, 102, 241, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem",
                color: "#a5b4fc",
                boxShadow: "0 8px 24px rgba(99, 102, 241, 0.25)"
              }}
            >
              {selectedRole === "STUDENT" ? <GraduationCap size={34} /> : <ShieldCheck size={34} />}
            </div>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.025em", marginBottom: "0.5rem" }}>
              User Registration Portal
            </h1>
            <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
              Create your candidate or examiner profile for the AI Examination Platform
            </p>
          </div>

          {/* Role Selection Tabs */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: "0.85rem", 
            background: "rgba(15, 23, 42, 0.7)", 
            padding: "0.45rem", 
            borderRadius: "var(--radius-md)", 
            border: "1px solid var(--border-color)",
            marginBottom: "2.25rem" 
          }}>
            <button
              type="button"
              onClick={() => { setSelectedRole("STUDENT"); setErrorMsg(""); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.65rem",
                padding: "0.85rem 1.25rem",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: selectedRole === "STUDENT" ? "linear-gradient(135deg, #4f46e5, #6366f1)" : "transparent",
                color: selectedRole === "STUDENT" ? "#ffffff" : "var(--text-muted)",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: selectedRole === "STUDENT" ? "0 4px 12px rgba(99, 102, 241, 0.3)" : "none"
              }}
            >
              <GraduationCap size={20} />
              Student Candidate
            </button>
            <button
              type="button"
              onClick={() => { setSelectedRole("EXAMINER"); setErrorMsg(""); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.65rem",
                padding: "0.85rem 1.25rem",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: selectedRole === "EXAMINER" ? "linear-gradient(135deg, #7c3aed, #9333ea)" : "transparent",
                color: selectedRole === "EXAMINER" ? "#ffffff" : "var(--text-muted)",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: selectedRole === "EXAMINER" ? "0 4px 12px rgba(168, 85, 247, 0.3)" : "none"
              }}
            >
              <ShieldCheck size={20} />
              Faculty Examiner
            </button>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div
              style={{
                background: "rgba(244, 63, 94, 0.12)",
                border: "1px solid rgba(244, 63, 94, 0.4)",
                borderRadius: "var(--radius-md)",
                padding: "1rem 1.25rem",
                color: "#fda4af",
                fontSize: "0.925rem",
                marginBottom: "2rem"
              }}
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="form-group" style={{ marginBottom: "1.75rem" }}>
              <label className="form-label" style={{ fontSize: "0.925rem", marginBottom: "0.65rem" }}>
                {selectedRole === "EXAMINER" ? "Faculty Full Name *" : "Student Full Name *"}
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder={selectedRole === "EXAMINER" ? "e.g. Prof. David Miller" : "e.g. Alex Morgan"}
                className="form-control"
                style={{ padding: "0.95rem 1.25rem", fontSize: "0.975rem" }}
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            {/* Email & Register Number Row */}
            <div style={{ display: "grid", gridTemplateColumns: selectedRole === "STUDENT" ? "1fr 1fr" : "1fr", gap: "1.5rem", marginBottom: "1.75rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "0.925rem", marginBottom: "0.65rem" }}>
                  Institutional Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder={selectedRole === "EXAMINER" ? "faculty@university.edu" : "student@college.edu"}
                  className="form-control"
                  style={{ padding: "0.95rem 1.25rem", fontSize: "0.975rem" }}
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              {selectedRole === "STUDENT" && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.925rem", marginBottom: "0.65rem" }}>
                    Register Number / Student ID *
                  </label>
                  <input
                    type="text"
                    name="register_number"
                    required
                    placeholder="e.g. REG2024CS042"
                    className="form-control"
                    style={{ padding: "0.95rem 1.25rem", fontSize: "0.975rem", textTransform: "uppercase" }}
                    value={formData.register_number}
                    onChange={handleChange}
                  />
                </div>
              )}
            </div>

            {/* Department & Year Row */}
            <div style={{ display: "grid", gridTemplateColumns: selectedRole === "STUDENT" ? "1fr 1fr" : "1fr", gap: "1.5rem", marginBottom: "1.75rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "0.925rem", marginBottom: "0.65rem" }}>
                  Academic Department *
                </label>
                <select
                  name="department"
                  className="form-control"
                  style={{ padding: "0.95rem 1.25rem", fontSize: "0.975rem" }}
                  value={formData.department}
                  onChange={handleChange}
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              {selectedRole === "STUDENT" && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.925rem", marginBottom: "0.65rem" }}>
                    Academic Year *
                  </label>
                  <select
                    name="year"
                    className="form-control"
                    style={{ padding: "0.95rem 1.25rem", fontSize: "0.975rem" }}
                    value={formData.year}
                    onChange={handleChange}
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Password & Confirm Password Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "0.925rem", marginBottom: "0.65rem" }}>
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  className="form-control"
                  style={{ padding: "0.95rem 1.25rem", fontSize: "0.975rem" }}
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "0.925rem", marginBottom: "0.65rem" }}>
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  required
                  minLength={6}
                  placeholder="Repeat your password"
                  className="form-control"
                  style={{ padding: "0.95rem 1.25rem", fontSize: "0.975rem" }}
                  value={formData.confirm_password}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Notice Note according to Role */}
            {selectedRole === "EXAMINER" ? (
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.09)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.1rem 1.35rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  marginBottom: "2.25rem",
                  color: "#fcd34d",
                  fontSize: "0.9rem",
                  lineHeight: 1.55
                }}
              >
                <Clock size={22} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Examiner Workflow:</strong> Your examiner account will be submitted with <strong>PENDING</strong> status and requires Administrator approval before question authoring and exam management are unlocked.
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.09)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "var(--radius-md)",
                  padding: "1.1rem 1.35rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  marginBottom: "2.25rem",
                  color: "#6ee7b7",
                  fontSize: "0.9rem",
                  lineHeight: 1.55
                }}
              >
                <CheckCircle2 size={22} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Student Workflow:</strong> Student candidate registrations are activated immediately upon submission.
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: "100%", padding: "1rem 2rem", fontSize: "1.05rem" }}
            >
              {loading 
                ? "Submitting Registration..." 
                : selectedRole === "EXAMINER" 
                  ? "Submit Examiner Application" 
                  : "Register Student Account"
              }
            </button>
          </form>

          {/* Footer link */}
          <div style={{ textAlign: "center", marginTop: "2.25rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-color)", fontSize: "0.95rem", color: "var(--text-muted)" }}>
            Already registered?{" "}
            <button
              onClick={() => setCurrentView(selectedRole === "EXAMINER" ? "admin_login" : "student_login")}
              style={{ background: "transparent", border: "none", color: "var(--primary-light)", fontWeight: 700, cursor: "pointer", textDecoration: "underline", fontSize: "0.95rem" }}
            >
              Sign In Here
            </button>
          </div>
        </div>
      ) : (
        /* Submission Confirmation Screen */
        <div className="glass-card" style={{ padding: "3.5rem 3rem", textAlign: "center", animation: "slideUp 0.3s ease-out", borderRadius: "var(--radius-xl)" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: registeredInfo?.status === "PENDING" ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
              border: `2.5px solid ${registeredInfo?.status === "PENDING" ? "#f59e0b" : "#10b981"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.75rem",
              color: registeredInfo?.status === "PENDING" ? "#fbbf24" : "#34d399",
              boxShadow: registeredInfo?.status === "PENDING" ? "0 0 25px rgba(245, 158, 11, 0.25)" : "0 0 25px rgba(16, 185, 129, 0.25)"
            }}
          >
            {registeredInfo?.status === "PENDING" ? <Clock size={40} /> : <CheckCircle2 size={40} />}
          </div>

          <span 
            className={`badge ${registeredInfo?.status === "PENDING" ? "badge-pending" : "badge-approved"}`}
            style={{ fontSize: "0.85rem", padding: "0.4rem 1rem", marginBottom: "1.25rem" }}
          >
            Account Status: {registeredInfo?.status}
          </span>

          <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "1.25rem", marginTop: "0.75rem", letterSpacing: "-0.02em" }}>
            {registeredInfo?.status === "PENDING" ? "Registration Awaiting Approval" : "Registration Successful!"}
          </h2>

          <div
            style={{
              background: "rgba(15, 23, 42, 0.85)",
              border: `1px solid ${registeredInfo?.status === "PENDING" ? "rgba(245, 158, 11, 0.35)" : "rgba(16, 185, 129, 0.35)"}`,
              borderRadius: "var(--radius-md)",
              padding: "1.5rem 1.75rem",
              fontSize: "1.1rem",
              fontWeight: 600,
              color: registeredInfo?.status === "PENDING" ? "#fde68a" : "#6ee7b7",
              lineHeight: 1.6,
              marginBottom: "2.5rem"
            }}
          >
            "{registeredInfo?.message}"
          </div>

          <div className="glass-card" style={{ padding: "1.75rem", textAlign: "left", marginBottom: "2.5rem", background: "rgba(30, 41, 59, 0.45)" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.75rem", letterSpacing: "0.05em" }}>
              Registered Profile Details:
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.6rem", fontSize: "0.95rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Name:</span>
              <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{registeredInfo?.name}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.6rem", fontSize: "0.95rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Role:</span>
              <span style={{ fontWeight: 700, color: "var(--primary-light)" }}>{registeredInfo?.role}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Email:</span>
              <span style={{ color: "var(--text-main)" }}>{registeredInfo?.email}</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "1.25rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setCurrentView(registeredInfo?.role === "EXAMINER" ? "admin_login" : "student_login")}
              className="btn btn-primary btn-lg"
            >
              Go to Sign In
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setFormData({
                  name: "",
                  email: "",
                  register_number: "",
                  department: "Computer Science & Engineering",
                  year: "1st Year",
                  password: "",
                  confirm_password: ""
                });
              }}
              className="btn btn-secondary btn-lg"
            >
              Register Another Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
