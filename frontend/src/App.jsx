import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";

// Pages
import { LandingPage } from "./pages/LandingPage";
import { StudentRegister } from "./pages/StudentRegister";
import { StudentLogin } from "./pages/StudentLogin";
import { AdminLogin } from "./pages/AdminLogin";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminExaminers } from "./pages/AdminExaminers";
import { ExaminerDashboard } from "./pages/ExaminerDashboard";
import { PendingApprovals } from "./pages/PendingApprovals";
import { ApprovedStudents } from "./pages/ApprovedStudents";
import { QuestionBank } from "./pages/QuestionBank";
import { AddEditQuestion } from "./pages/AddEditQuestion";
import { CreateExam } from "./pages/CreateExam";
import { StudentDashboard } from "./pages/StudentDashboard";
import { ExamHall } from "./pages/ExamHall";
import { ExamResultView } from "./pages/ExamResultView";
import { ExaminerResultsAudit } from "./pages/ExaminerResultsAudit";
import { ExaminerEnrolledStudents } from "./pages/ExaminerEnrolledStudents";
import { api } from "./services/api";

function MainApp() {
  const { user, isAuthenticated, isAdmin, isExaminer, isStudent, loading } = useAuth();
  
  // Default view based on authentication
  const [currentView, setCurrentView] = useState("landing");
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingExaminersCount, setPendingExaminersCount] = useState(0);
  const [editQuestion, setEditQuestion] = useState(null);
  const [activeSessionToken, setActiveSessionToken] = useState(null);
  const [activeResultToken, setActiveResultToken] = useState(null);
  const [selectedExamIdForStudents, setSelectedExamIdForStudents] = useState(null);

  // Fetch admin badge counts
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      api.getAdminStats()
        .then(stats => {
          setPendingCount(stats.pending_approvals || 0);
          setPendingExaminersCount(stats.pending_examiners || 0);
        })
        .catch(() => {});
    }
  }, [isAuthenticated, isAdmin, currentView]);

  // Sync initial view upon user login / logout
  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        if (isStudent && !["exam_hall", "exam_result"].includes(currentView)) {
          setCurrentView("student_dashboard");
        } else if (isExaminer && !["examiner_results_audit", "enrolled_students", "question_bank", "add_question", "edit_question", "create_exam"].includes(currentView)) {
          setCurrentView("examiner_dashboard");
        } else if (isAdmin && !["examiner_results_audit", "enrolled_students", "admin_examiners", "pending_approvals", "approved_students", "question_bank", "add_question", "create_exam"].includes(currentView)) {
          setCurrentView("admin_dashboard");
        }
      } else {
        if ([
          "admin_dashboard", "admin_examiners", "examiner_dashboard", 
          "pending_approvals", "approved_students", "enrolled_students", "question_bank", 
          "add_question", "edit_question", "create_exam", "student_dashboard",
          "exam_hall", "exam_result", "examiner_results_audit"
        ].includes(currentView)) {
          setCurrentView("landing");
        }
      }
    }
  }, [isAuthenticated, isStudent, isAdmin, isExaminer, loading]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0f19", color: "#818cf8" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            EXAM<span style={{ color: "#a855f7" }}>.AI</span>
          </div>
          <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>Loading examination platform...</p>
        </div>
      </div>
    );
  }

  // Determine if sidebar should be shown
  const showSidebar = isAuthenticated && !["landing", "student_register", "student_login", "admin_login", "exam_hall"].includes(currentView);
  const showNavbar = currentView !== "exam_hall";

  const renderView = () => {
    switch (currentView) {
      case "landing":
        return <LandingPage setCurrentView={setCurrentView} />;
      case "student_register":
        return <StudentRegister setCurrentView={setCurrentView} />;
      case "student_login":
        return <StudentLogin setCurrentView={setCurrentView} />;
      case "admin_login":
        return <AdminLogin setCurrentView={setCurrentView} />;
      case "admin_dashboard":
        return (
          <AdminDashboard
            setCurrentView={setCurrentView}
            onStatsUpdated={(count) => setPendingCount(count)}
          />
        );
      case "admin_examiners":
        return <AdminExaminers />;
      case "examiner_dashboard":
        return (
          <ExaminerDashboard
            setCurrentView={setCurrentView}
            onSelectEditQuestion={(q) => setEditQuestion(q)}
            onSelectExamForStudents={(examId) => {
              setSelectedExamIdForStudents(examId);
              setCurrentView("enrolled_students");
            }}
          />
        );
      case "enrolled_students":
        return (
          <ExaminerEnrolledStudents
            initialExamId={selectedExamIdForStudents}
            onBack={() => {
              setSelectedExamIdForStudents(null);
              setCurrentView(isAdmin ? "admin_dashboard" : "examiner_dashboard");
            }}
            onInspectSession={(sessionToken) => {
              setActiveResultToken(sessionToken);
              setCurrentView("examiner_results_audit");
            }}
          />
        );
      case "pending_approvals":
        return (
          <PendingApprovals
            onStatsUpdated={(count) => setPendingCount(count)}
          />
        );
      case "approved_students":
        return <ApprovedStudents />;
      case "examiner_results_audit":
        return (
          <ExaminerResultsAudit
            onBack={() => setCurrentView(isAdmin ? "admin_dashboard" : "examiner_dashboard")}
          />
        );
      case "question_bank":
        return (
          <QuestionBank
            setCurrentView={setCurrentView}
            onSelectEditQuestion={(q) => setEditQuestion(q)}
          />
        );
      case "add_question":
        return (
          <AddEditQuestion
            editQuestion={null}
            setCurrentView={setCurrentView}
          />
        );
      case "edit_question":
        return (
          <AddEditQuestion
            editQuestion={editQuestion}
            setCurrentView={setCurrentView}
          />
        );
      case "create_exam":
        return <CreateExam setCurrentView={setCurrentView} />;
      case "student_dashboard":
        return (
          <StudentDashboard
            onEnterExamHall={(token) => {
              setActiveSessionToken(token);
              setCurrentView("exam_hall");
            }}
            onViewResult={(token) => {
              setActiveResultToken(token);
              setCurrentView("exam_result");
            }}
          />
        );
      case "exam_hall":
        return (
          <ExamHall
            sessionToken={activeSessionToken}
            onExamSubmitted={(result) => {
              setActiveResultToken(result.session_token || activeSessionToken);
              setCurrentView("exam_result");
            }}
            onExit={() => setCurrentView("student_dashboard")}
          />
        );
      case "exam_result":
        return (
          <ExamResultView
            sessionToken={activeResultToken || activeSessionToken}
            onBackToDashboard={() => setCurrentView("student_dashboard")}
          />
        );
      default:
        return <LandingPage setCurrentView={setCurrentView} />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {showNavbar && <Navbar currentView={currentView} setCurrentView={setCurrentView} />}
      <div className="app-container">
        {showSidebar && (
          <Sidebar
            currentView={currentView}
            setCurrentView={setCurrentView}
            pendingCount={pendingCount}
            pendingExaminersCount={pendingExaminersCount}
          />
        )}
        <main className="main-content" style={currentView === "exam_hall" ? { padding: 0 } : {}}>
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
