import { 
  ShieldCheck, 
  BookOpen, 
  Sparkles, 
  CheckCircle, 
  ArrowRight, 
  GraduationCap, 
  Award, 
  Shield, 
  Lock, 
  FileCheck, 
  Layers, 
  Cpu,
  Clock
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const LandingPage = ({ setCurrentView }) => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const handleQuickLogin = async (identifier, password, roleName) => {
    try {
      const res = await login(identifier, password);
      showToast(`Logged in successfully as ${roleName} (${res.user.name})`, "success");
      if (res.user.role === "STUDENT") {
        setCurrentView("student_dashboard");
      } else if (res.user.role === "EXAMINER") {
        setCurrentView("examiner_dashboard");
      } else {
        setCurrentView("admin_dashboard");
      }
    } catch (err) {
      showToast(err.message, "error", 6000);
    }
  };

  return (
    <div className="page-container" style={{ paddingTop: "2.5rem", paddingBottom: "4rem" }}>
      {/* Hero Section */}
      <div style={{ textAlign: "center", maxWidth: "900px", margin: "0 auto 3.5rem" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "rgba(99, 102, 241, 0.15)",
            border: "1px solid rgba(99, 102, 241, 0.35)",
            padding: "0.4rem 1rem",
            borderRadius: "9999px",
            fontSize: "0.825rem",
            color: "#a5b4fc",
            fontWeight: 600,
            marginBottom: "1.5rem"
          }}
        >
          <Sparkles size={16} /> Next-Generation AI Examination & Proctoring Infrastructure
        </div>

        <h1 style={{ fontSize: "3.2rem", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: "1.25rem" }}>
          Intelligent Assessment & <br />
          <span className="gradient-text">Question Bank Platform</span>
        </h1>

        <p style={{ fontSize: "1.15rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "2rem", maxWidth: "720px", margin: "0 auto 2.25rem" }}>
          Seamless student registration gatekeeping, robust administrator approval pipelines, and a versatile 5-type question bank with AI-assisted generation for universities and institutions.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setCurrentView("student_register")}
            className="btn btn-primary btn-lg"
            style={{ fontSize: "1rem" }}
          >
            <GraduationCap size={20} />
            Student Registration
          </button>
          <button
            onClick={() => setCurrentView("student_login")}
            className="btn btn-secondary btn-lg"
          >
            Student Login
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => setCurrentView("admin_login")}
            className="btn btn-secondary btn-lg"
            style={{ borderColor: "rgba(168, 85, 247, 0.4)", color: "#d8b4fe" }}
          >
            <Shield size={18} />
            Admin / Examiner Portal
          </button>
        </div>
      </div>

      {/* Quick Demo Test-Drive Cards */}
      <div style={{ marginBottom: "4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-main)" }}>
            ⚡ Instant 1-Click Demo Accounts
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-subtle)", marginTop: "0.25rem" }}>
            Test each role workflow instantly without having to type passwords:
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
          {/* Admin Card */}
          <div className="glass-card glass-card-interactive" style={{ padding: "1.5rem", borderLeft: "4px solid #a855f7" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Shield size={20} color="#c084fc" />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Administrator</h3>
              </div>
              <span className="badge badge-role-admin">Full Control</span>
            </div>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.4 }}>
              Approve/reject pending examiners and students, inspect analytics, and manage question bank.
            </p>
            <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-subtle)", marginBottom: "1rem", background: "rgba(15, 23, 42, 0.8)", padding: "0.5rem", borderRadius: "6px" }}>
              admin@examai.edu &bull; Admin@123
            </div>
            <button
              onClick={() => handleQuickLogin("admin@examai.edu", "Admin@123", "Administrator")}
              className="btn btn-secondary"
              style={{ width: "100%", borderColor: "rgba(168, 85, 247, 0.4)", color: "#d8b4fe" }}
            >
              Sign In as Admin
            </button>
          </div>

          {/* Approved Examiner Card */}
          <div className="glass-card glass-card-interactive" style={{ padding: "1.5rem", borderLeft: "4px solid #06b6d4" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Award size={20} color="#67e8f9" />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Approved Examiner</h3>
              </div>
              <span className="badge badge-role-examiner">Authorized</span>
            </div>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.4 }}>
              Full access to create and manage questions across all 5 types with AI synthesis tools.
            </p>
            <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-subtle)", marginBottom: "1rem", background: "rgba(15, 23, 42, 0.8)", padding: "0.5rem", borderRadius: "6px" }}>
              examiner@examai.edu &bull; Examiner@123
            </div>
            <button
              onClick={() => handleQuickLogin("examiner@examai.edu", "Examiner@123", "Examiner")}
              className="btn btn-secondary"
              style={{ width: "100%", borderColor: "rgba(6, 182, 212, 0.4)", color: "#67e8f9" }}
            >
              Sign In as Examiner
            </button>
          </div>

          {/* Pending Examiner Card (Gatekeeper Demo) */}
          <div className="glass-card glass-card-interactive" style={{ padding: "1.5rem", borderLeft: "4px solid #f59e0b" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Clock size={20} color="#fbbf24" />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Pending Examiner</h3>
              </div>
              <span className="badge badge-pending">PENDING</span>
            </div>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.4 }}>
              Demonstrates strict gatekeeper block. Shows Status: PENDING until approved by admin.
            </p>
            <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-subtle)", marginBottom: "1rem", background: "rgba(15, 23, 42, 0.8)", padding: "0.5rem", borderRadius: "6px" }}>
              pending.examiner@examai.edu &bull; Examiner@123
            </div>
            <button
              onClick={() => handleQuickLogin("pending.examiner@examai.edu", "Examiner@123", "Pending Examiner")}
              className="btn btn-secondary"
              style={{ width: "100%", borderColor: "rgba(245, 158, 11, 0.4)", color: "#fbbf24" }}
            >
              Test Gatekeeper Block
            </button>
          </div>

          {/* Student Card */}
          <div className="glass-card glass-card-interactive" style={{ padding: "1.5rem", borderLeft: "4px solid #10b981" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <GraduationCap size={20} color="#34d399" />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Approved Student</h3>
              </div>
              <span className="badge badge-approved">Verified</span>
            </div>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.4 }}>
              Access student portal, view scheduled examinations, practice questions, and review guidelines.
            </p>
            <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-subtle)", marginBottom: "1rem", background: "rgba(15, 23, 42, 0.8)", padding: "0.5rem", borderRadius: "6px" }}>
              REG2024CS001 &bull; Student@123
            </div>
            <button
              onClick={() => handleQuickLogin("student@examai.edu", "Student@123", "Approved Student")}
              className="btn btn-emerald"
              style={{ width: "100%" }}
            >
              Sign In as Student
            </button>
          </div>
        </div>
      </div>

      {/* Core Workflow Pillars */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
        <div className="glass-card" style={{ padding: "1.75rem" }}>
          <div style={{ background: "rgba(99, 102, 241, 0.15)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem", color: "#818cf8" }}>
            <ShieldCheck size={24} />
          </div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.6rem" }}>
            1. Strict Approval Gatekeeping
          </h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            New student registrations are marked <strong>PENDING</strong> and cannot access examination portals until approved by verified institutional administrators.
          </p>
        </div>

        <div className="glass-card" style={{ padding: "1.75rem" }}>
          <div style={{ background: "rgba(168, 85, 247, 0.15)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem", color: "#c084fc" }}>
            <Layers size={24} />
          </div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.6rem" }}>
            2. 5 Multi-Modal Question Types
          </h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Comprehensive authoring for Single MCQ, Multi-Select, Short Answer, Long Form with Rubrics, and Handwritten Image Uploads.
          </p>
        </div>

        <div className="glass-card" style={{ padding: "1.75rem" }}>
          <div style={{ background: "rgba(6, 182, 212, 0.15)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem", color: "#67e8f9" }}>
            <Cpu size={24} />
          </div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.6rem" }}>
            3. AI Assistant & Vision Grading
          </h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Generate balanced exam questions with answer keys in one click and evaluate handwritten schematics against model rubrics.
          </p>
        </div>
      </div>
    </div>
  );
};
