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
import { useLanguage } from "../context/LanguageContext";

export const LandingPage = ({ setCurrentView }) => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const handleQuickLogin = async (identifier, password, roleName) => {
    try {
      const res = await login(identifier, password);
      showToast(`${t("toast.login_success", null, "Logged in successfully as")} ${roleName} (${res.user.name})`, "success");
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
    <div className="page-container" style={{ paddingTop: "3.5rem", paddingBottom: "5.5rem" }}>
      {/* Hero Section */}
      <div style={{ textAlign: "center", maxWidth: "980px", margin: "0 auto 4.5rem" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.6rem",
            background: "rgba(99, 102, 241, 0.15)",
            border: "1px solid rgba(99, 102, 241, 0.35)",
            padding: "0.5rem 1.25rem",
            borderRadius: "9999px",
            fontSize: "0.875rem",
            color: "#a5b4fc",
            fontWeight: 600,
            marginBottom: "2rem",
            boxShadow: "0 0 20px rgba(99, 102, 241, 0.15)"
          }}
        >
          <Sparkles size={17} /> {t("landing.badge_infra", null, "Next-Generation AI Examination & Proctoring Infrastructure")}
        </div>

        <h1 style={{ fontSize: "3.6rem", fontWeight: 800, lineHeight: 1.18, letterSpacing: "-0.035em", marginBottom: "1.5rem" }}>
          {t("landing.hero_title_1", null, "Intelligent Assessment &")} <br />
          <span className="gradient-text">{t("landing.hero_title_gradient", null, "Question Bank Platform")}</span>
        </h1>

        <p style={{ fontSize: "1.2rem", color: "var(--text-muted)", lineHeight: 1.65, marginBottom: "2.75rem", maxWidth: "780px", margin: "0 auto 2.75rem" }}>
          {t("landing.hero_desc", null, "Seamless student registration gatekeeping, robust administrator approval pipelines, and a versatile 5-type question bank with AI-assisted generation for universities and institutions.")}
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "1.25rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setCurrentView("student_register")}
            className="btn btn-primary btn-lg"
          >
            <GraduationCap size={22} />
            {t("landing.btn_student_reg", null, "Student Registration")}
          </button>
          <button
            onClick={() => setCurrentView("student_login")}
            className="btn btn-secondary btn-lg"
          >
            {t("landing.btn_student_login", null, "Student Login")}
            <ArrowRight size={20} />
          </button>
          <button
            onClick={() => setCurrentView("admin_login")}
            className="btn btn-secondary btn-lg"
            style={{ borderColor: "rgba(168, 85, 247, 0.4)", color: "#d8b4fe" }}
          >
            <Shield size={20} />
            {t("landing.btn_admin_portal", null, "Admin / Examiner Portal")}
          </button>
        </div>
      </div>

      {/* Quick Demo Test-Drive Cards */}
      <div style={{ marginBottom: "5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
            {t("landing.demo_title", null, "⚡ Instant 1-Click Demo Accounts")}
          </h2>
          <p style={{ fontSize: "0.95rem", color: "var(--text-subtle)", marginTop: "0.45rem" }}>
            {t("landing.demo_desc", null, "Test each role workflow instantly without having to type credentials:")}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.75rem" }}>
          {/* Admin Card */}
          <div className="glass-card glass-card-interactive" style={{ padding: "2rem", borderLeft: "4.5px solid #a855f7" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Shield size={22} color="#c084fc" />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>{t("landing.admin_card_title", null, "Administrator")}</h3>
              </div>
              <span className="badge badge-role-admin">{t("landing.admin_badge", null, "Full Control")}</span>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              {t("landing.admin_desc", null, "Approve/reject pending examiners and students, inspect analytics, and manage question bank.")}
            </p>
            <div style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-subtle)", marginBottom: "1.25rem", background: "rgba(15, 23, 42, 0.8)", padding: "0.65rem 0.85rem", borderRadius: "8px" }}>
              admin@examai.edu &bull; Admin@123
            </div>
            <button
              onClick={() => handleQuickLogin("admin@examai.edu", "Admin@123", "Administrator")}
              className="btn btn-secondary"
              style={{ width: "100%", borderColor: "rgba(168, 85, 247, 0.4)", color: "#d8b4fe", padding: "0.75rem" }}
            >
              {t("landing.admin_btn", null, "Sign In as Admin")}
            </button>
          </div>

          {/* Approved Examiner Card */}
          <div className="glass-card glass-card-interactive" style={{ padding: "2rem", borderLeft: "4.5px solid #06b6d4" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Award size={22} color="#67e8f9" />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>{t("landing.approved_card_title", null, "Approved Examiner")}</h3>
              </div>
              <span className="badge badge-role-examiner">{t("landing.approved_badge", null, "Authorized")}</span>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              {t("landing.approved_desc", null, "Full access to create and manage questions across all 5 types with AI synthesis tools.")}
            </p>
            <div style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-subtle)", marginBottom: "1.25rem", background: "rgba(15, 23, 42, 0.8)", padding: "0.65rem 0.85rem", borderRadius: "8px" }}>
              examiner@examai.edu &bull; Examiner@123
            </div>
            <button
              onClick={() => handleQuickLogin("examiner@examai.edu", "Examiner@123", "Examiner")}
              className="btn btn-secondary"
              style={{ width: "100%", borderColor: "rgba(6, 182, 212, 0.4)", color: "#67e8f9", padding: "0.75rem" }}
            >
              {t("landing.approved_btn", null, "Sign In as Examiner")}
            </button>
          </div>

          {/* Pending Examiner Card (Gatekeeper Demo) */}
          <div className="glass-card glass-card-interactive" style={{ padding: "2rem", borderLeft: "4.5px solid #f59e0b" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Clock size={22} color="#fbbf24" />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>{t("landing.pending_card_title", null, "Pending Examiner")}</h3>
              </div>
              <span className="badge badge-pending">{t("landing.pending_badge", null, "PENDING")}</span>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              {t("landing.pending_desc", null, "Demonstrates strict gatekeeper block. Shows Status: PENDING until approved by admin.")}
            </p>
            <div style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-subtle)", marginBottom: "1.25rem", background: "rgba(15, 23, 42, 0.8)", padding: "0.65rem 0.85rem", borderRadius: "8px" }}>
              pending.examiner@examai.edu &bull; Examiner@123
            </div>
            <button
              onClick={() => handleQuickLogin("pending.examiner@examai.edu", "Examiner@123", "Pending Examiner")}
              className="btn btn-secondary"
              style={{ width: "100%", borderColor: "rgba(245, 158, 11, 0.4)", color: "#fbbf24", padding: "0.75rem" }}
            >
              {t("landing.pending_btn", null, "Test Gatekeeper Block")}
            </button>
          </div>

          {/* Student Card */}
          <div className="glass-card glass-card-interactive" style={{ padding: "2rem", borderLeft: "4.5px solid #10b981" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <GraduationCap size={22} color="#34d399" />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>{t("landing.student_card_title", null, "Approved Student")}</h3>
              </div>
              <span className="badge badge-approved">{t("landing.student_badge", null, "Verified")}</span>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              {t("landing.student_desc", null, "Access student portal, view scheduled examinations, practice questions, and review guidelines.")}
            </p>
            <div style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-subtle)", marginBottom: "1.25rem", background: "rgba(15, 23, 42, 0.8)", padding: "0.65rem 0.85rem", borderRadius: "8px" }}>
              REG2024CS001 &bull; Student@123
            </div>
            <button
              onClick={() => handleQuickLogin("student@examai.edu", "Student@123", "Approved Student")}
              className="btn btn-emerald"
              style={{ width: "100%", padding: "0.75rem" }}
            >
              {t("landing.student_btn", null, "Sign In as Student")}
            </button>
          </div>
        </div>
      </div>

      {/* Core Workflow Pillars */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
        <div className="glass-card" style={{ padding: "2.25rem" }}>
          <div style={{ background: "rgba(99, 102, 241, 0.15)", width: "54px", height: "54px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem", color: "#818cf8" }}>
            <ShieldCheck size={28} />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            {t("landing.pillar_1_title", null, "1. Strict Approval Gatekeeping")}
          </h3>
          <p style={{ fontSize: "0.925rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
            {t("landing.pillar_1_desc", null, "New student registrations are marked PENDING and cannot access examination portals until approved by verified institutional administrators.")}
          </p>
        </div>

        <div className="glass-card" style={{ padding: "2.25rem" }}>
          <div style={{ background: "rgba(168, 85, 247, 0.15)", width: "54px", height: "54px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem", color: "#c084fc" }}>
            <Layers size={28} />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            {t("landing.pillar_2_title", null, "2. 5 Multi-Modal Question Types")}
          </h3>
          <p style={{ fontSize: "0.925rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
            {t("landing.pillar_2_desc", null, "Comprehensive authoring for Single MCQ, Multi-Select, Short Answer, Long Form with Rubrics, and Handwritten Image Uploads.")}
          </p>
        </div>

        <div className="glass-card" style={{ padding: "2.25rem" }}>
          <div style={{ background: "rgba(6, 182, 212, 0.15)", width: "54px", height: "54px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem", color: "#67e8f9" }}>
            <Cpu size={28} />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            {t("landing.pillar_3_title", null, "3. AI Assistant & Vision Grading")}
          </h3>
          <p style={{ fontSize: "0.925rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
            {t("landing.pillar_3_desc", null, "Generate balanced exam questions with answer keys in one click and evaluate handwritten schematics against model rubrics.")}
          </p>
        </div>
      </div>
    </div>
  );
};

