import React, { useState, useEffect } from "react";
import { 
  HelpCircle, 
  PlusCircle, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye, 
  RefreshCw, 
  Layers, 
  CheckSquare, 
  FileText, 
  Image as ImageIcon,
  Sparkles,
  FileSpreadsheet,
  X
} from "lucide-react";
import { api } from "../services/api";
import { StatCard } from "../components/StatCard";
import { DifficultyBadge, QuestionTypeBadge } from "../components/StatusBadge";
import { QuestionDetailModal } from "../components/QuestionDetailModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { DocumentQuestionExtractor } from "../components/DocumentQuestionExtractor";
import { useToast } from "../context/ToastContext";

export const QuestionBank = ({ setCurrentView, onSelectEditQuestion }) => {
  const { showToast } = useToast();

  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("ALL");
  const [questionType, setQuestionType] = useState("ALL");
  const [difficulty, setDifficulty] = useState("ALL");
  const [minMarks, setMinMarks] = useState("");

  // Modals state
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await api.getQuestionStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const data = await api.getQuestions({
        search,
        subject,
        question_type: questionType,
        difficulty,
        min_marks: minMarks ? parseFloat(minMarks) : undefined
      });
      setQuestions(data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchQuestions();
  }, [subject, questionType, difficulty]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchQuestions();
  };

  const handleDelete = async () => {
    if (!selectedQuestion) return;
    setActionLoading(true);
    try {
      await api.deleteQuestion(selectedQuestion.id);
      showToast(`Question #${selectedQuestion.id} removed from bank.`, "info");
      setShowDeleteConfirm(false);
      setShowDetailModal(false);
      fetchQuestions();
      fetchStats();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (q) => {
    if (onSelectEditQuestion) {
      onSelectEditQuestion(q);
    }
    setCurrentView("edit_question");
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <span className="badge badge-role-examiner">Repository Studio</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)" }}>Central Assessment Engine</span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
            Question Bank Management
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Author, categorize, filter, and review multi-modal examination items with scoring rubrics
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button onClick={fetchQuestions} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setShowExtractModal(true)}
            className="btn btn-secondary"
            style={{
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              color: "#c7d2fe",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontWeight: 700
            }}
          >
            <FileSpreadsheet size={16} color="#34d399" />
            Import from File (Excel / Word / PDF)
          </button>
          <button
            onClick={() => setCurrentView("add_question")}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <PlusCircle size={18} />
            Add New Question
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard
          title="Total Questions"
          value={stats?.total_questions || 0}
          icon={HelpCircle}
          color="indigo"
          subtitle="All Subjects"
        />
        <StatCard
          title="MCQ (Single)"
          value={stats?.mcq_count || 0}
          icon={CheckSquare}
          color="cyan"
          subtitle="Radio Choice"
        />
        <StatCard
          title="Multi-Select"
          value={stats?.multi_select_count || 0}
          icon={Layers}
          color="purple"
          subtitle="Multiple Correct"
        />
        <StatCard
          title="Subjective"
          value={stats?.subjective_count || 0}
          icon={FileText}
          color="emerald"
          subtitle="Short & Long Form"
        />
        <StatCard
          title="Image Upload"
          value={stats?.image_upload_count || 0}
          icon={ImageIcon}
          color="amber"
          subtitle="Diagrams / Drawings"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 1.2fr 1fr auto", gap: "0.75rem", alignItems: "center" }}>
          {/* Search Query */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search question text or concepts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "2.3rem" }}
            />
            <Search size={16} color="#9ca3af" style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)" }} />
          </div>

          {/* Subject Filter */}
          <div>
            <select
              className="form-control"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="ALL">All Subjects</option>
              <option value="Data Structures & Algorithms">Data Structures</option>
              <option value="Artificial Intelligence">Artificial Intelligence</option>
              <option value="Database Systems">Database Systems</option>
              <option value="Cybersecurity & Networks">Cybersecurity</option>
              <option value="Computer Organization">Computer Organization</option>
              <option value="Digital Electronics">Digital Electronics</option>
            </select>
          </div>

          {/* Question Type Filter */}
          <div>
            <select
              className="form-control"
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
            >
              <option value="ALL">All Question Types</option>
              <option value="MCQ">MCQ (Single Choice)</option>
              <option value="MULTI_SELECT">Multi-Select</option>
              <option value="SHORT_ANSWER">Short Answer</option>
              <option value="LONG_ANSWER">Long Answer</option>
              <option value="IMAGE_UPLOAD">Image Upload</option>
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <select
              className="form-control"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="ALL">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          {/* Min Marks */}
          <div>
            <input
              type="number"
              step="0.5"
              min="0"
              placeholder="Min Marks"
              className="form-control"
              value={minMarks}
              onChange={(e) => setMinMarks(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Apply Filters
          </button>
        </form>
      </div>

      {/* Questions Table Layout */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: "70px" }}>ID</th>
                <th>Question Preview</th>
                <th>Type</th>
                <th>Subject</th>
                <th>Difficulty</th>
                <th>Marks</th>
                <th>Created By</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                    Loading question bank repository...
                  </td>
                </tr>
              ) : questions.length > 0 ? (
                questions.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.825rem", color: "var(--text-subtle)" }}>
                        #{q.id}
                      </span>
                    </td>
                    <td style={{ maxWidth: "340px" }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "var(--text-main)",
                          fontSize: "0.9rem",
                          lineHeight: 1.4,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden"
                        }}
                      >
                        {q.question_text}
                      </div>
                      {q.options && q.options.length > 0 && (
                        <span style={{ fontSize: "0.725rem", color: "var(--text-subtle)", marginTop: "2px", display: "inline-block" }}>
                          {q.options.length} options configured
                        </span>
                      )}
                    </td>
                    <td>
                      <QuestionTypeBadge type={q.question_type} />
                    </td>
                    <td>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-main)", fontWeight: 500 }}>
                        {q.subject}
                      </span>
                    </td>
                    <td>
                      <DifficultyBadge difficulty={q.difficulty} />
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 700, color: "#34d399", fontSize: "0.9rem" }}>
                          +{q.marks}
                        </span>
                        {q.negative_marks > 0 && (
                          <span style={{ fontSize: "0.7rem", color: "#fb7185" }}>
                            -{q.negative_marks} neg
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>
                        {q.creator_name || "Examiner"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          title="View Full Question & Solution"
                          onClick={() => {
                            setSelectedQuestion(q);
                            setShowDetailModal(true);
                          }}
                          style={{ padding: "0.35rem 0.55rem" }}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Edit Question"
                          onClick={() => handleEdit(q)}
                          style={{ padding: "0.35rem 0.55rem" }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="btn btn-rose btn-sm"
                          title="Delete Question"
                          onClick={() => {
                            setSelectedQuestion(q);
                            setShowDeleteConfirm(true);
                          }}
                          style={{ padding: "0.35rem 0.55rem" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", color: "var(--text-subtle)", padding: "3rem" }}>
                    No questions found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Question Details Modal */}
      <QuestionDetailModal
        question={selectedQuestion}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onEdit={(q) => {
          setShowDetailModal(false);
          handleEdit(q);
        }}
        onDelete={(q) => {
          setShowDetailModal(false);
          setShowDeleteConfirm(true);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Question from Bank"
        message={`Are you sure you want to permanently delete Question #${selectedQuestion?.id}? This item will be removed from all upcoming tests and exam papers.`}
        confirmText="Delete Question"
        type="rose"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Extract / Import Modal */}
      {showExtractModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 15, 29, 0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowExtractModal(false);
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: "1000px",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              padding: "1.75rem",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FileSpreadsheet size={20} color="#34d399" />
                  Import Questions to Repository
                </h3>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Upload Excel, Word, PDF or paste text to bulk extract questions directly into your Question Bank.
                </p>
              </div>
              <button
                onClick={() => setShowExtractModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: "0.4rem 0.6rem" }}
              >
                <X size={18} />
              </button>
            </div>

            <DocumentQuestionExtractor
              isModal={true}
              onClose={() => setShowExtractModal(false)}
              onQuestionsSavedToBank={(createdQuestions) => {
                showToast(`Successfully added ${createdQuestions.length} questions to the bank!`, "success");
                fetchQuestions();
                fetchStats();
                setShowExtractModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
