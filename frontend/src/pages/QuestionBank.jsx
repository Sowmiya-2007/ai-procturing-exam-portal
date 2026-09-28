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
  X,
  Dices
} from "lucide-react";
import { api } from "../services/api";
import { StatCard } from "../components/StatCard";
import { DifficultyBadge, QuestionTypeBadge } from "../components/StatusBadge";
import { QuestionDetailModal } from "../components/QuestionDetailModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { DocumentQuestionExtractor } from "../components/DocumentQuestionExtractor";
import { useToast } from "../context/ToastContext";
import { useLanguage } from "../context/LanguageContext";
import { translateContent, getLocalizedOptionLabel } from "../services/translator";

export const QuestionBank = ({ setCurrentView, onSelectEditQuestion }) => {
  const { showToast } = useToast();
  const { language, t } = useLanguage();

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
  }, [subject, questionType, difficulty, language]);

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.25rem", flexWrap: "wrap", gap: "1.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.5rem" }}>
            <span className="badge badge-role-examiner" style={{ fontSize: "0.8rem", padding: "0.35rem 0.85rem" }}>
              {t("question_bank.repository_studio", "Repository Studio")}
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-subtle)", fontWeight: 600 }}>
              {t("question_bank.central_engine", "Central Assessment Engine")}
            </span>
          </div>
          <h1 style={{ fontSize: "2.35rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.03em" }}>
            {t("question_bank.title", "Question Bank Management")}
          </h1>
          <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginTop: "0.45rem" }}>
            {t("question_bank.sub", "Author, categorize, filter, and review multi-modal examination items with scoring rubrics")}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap" }}>
          <button onClick={fetchQuestions} className="btn btn-secondary btn-sm" style={{ padding: "0.6rem 1.1rem" }}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            {t("common.refresh", "Refresh")}
          </button>
          <button
            onClick={() => setShowExtractModal(true)}
            className="btn btn-secondary"
            style={{
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(168, 85, 247, 0.22))",
              border: "1px solid rgba(99, 102, 241, 0.45)",
              color: "#c7d2fe",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: 700,
              padding: "0.65rem 1.25rem"
            }}
          >
            <FileSpreadsheet size={18} color="#34d399" />
            {t("question_bank.import_questions_btn", "Import from File (Excel / Word / PDF)")}
          </button>
          <button
            onClick={() => setCurrentView("add_question")}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1.25rem" }}
          >
            <PlusCircle size={18} />
            {t("question_bank.new_question_btn", "Add New Question")}
          </button>
          <button
            onClick={() => setCurrentView("create_exam")}
            className="btn btn-primary"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
              boxShadow: "0 4px 14px rgba(168, 85, 247, 0.35)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.65rem 1.35rem"
            }}
          >
            <Dices size={18} />
            {t("question_bank.create_exam_action", "Create Exam")}
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="dashboard-stats-grid" style={{ marginBottom: "2.5rem" }}>
        <StatCard
          title={t("question_bank.stat_total_questions", "Total Questions")}
          value={stats?.total_questions || 0}
          icon={HelpCircle}
          color="indigo"
          subtitle={t("question_bank.all_subjects", "All Subjects")}
        />
        <StatCard
          title={t("question_bank.stat_mcq", "MCQ (Single)")}
          value={stats?.mcq_count || 0}
          icon={CheckSquare}
          color="cyan"
          subtitle={t("question_bank.radio_choice", "Radio Choice")}
        />
        <StatCard
          title={t("question_bank.stat_multi_select", "Multi-Select")}
          value={stats?.multi_select_count || 0}
          icon={Layers}
          color="purple"
          subtitle={t("question_bank.multiple_correct", "Multiple Correct")}
        />
        <StatCard
          title={t("question_bank.stat_short_long", "Subjective")}
          value={stats?.subjective_count || 0}
          icon={FileText}
          color="emerald"
          subtitle={t("question_bank.short_long_form", "Short & Long Form")}
        />
        <StatCard
          title={t("question_bank.stat_diagram", "Image Upload")}
          value={stats?.image_upload_count || 0}
          icon={ImageIcon}
          color="amber"
          subtitle={t("question_bank.diagrams_drawings", "Diagrams / Drawings")}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: "1.65rem 2rem", marginBottom: "2rem" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "grid", gridTemplateColumns: "2fr 1.3fr 1.3fr 1.2fr 1fr auto", gap: "1rem", alignItems: "center" }}>
          {/* Search Query */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              className="form-control"
              placeholder={t("question_bank.search_placeholder", "Search question text or concepts...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "2.5rem", height: "46px" }}
            />
            <Search size={18} color="#9ca3af" style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)" }} />
          </div>

          {/* Subject Filter */}
          <div>
            <select
              className="form-control"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ height: "46px" }}
            >
              <option value="ALL">{t("question_bank.all_subjects", "All Subjects")}</option>
              <option value="Data Structures & Algorithms">{translateContent("Data Structures & Algorithms", language)}</option>
              <option value="Artificial Intelligence">{translateContent("Artificial Intelligence", language)}</option>
              <option value="Database Systems">{translateContent("Database Systems", language)}</option>
              <option value="Cybersecurity & Networks">{translateContent("Cybersecurity & Networks", language)}</option>
              <option value="Computer Organization">{translateContent("Computer Organization", language)}</option>
              <option value="Digital Electronics">{translateContent("Digital Electronics", language)}</option>
              <option value="Computer Networks">{translateContent("Computer Networks", language)}</option>
              <option value="Operating Systems">{translateContent("Operating Systems", language)}</option>
            </select>
          </div>

          {/* Question Type Filter */}
          <div>
            <select
              className="form-control"
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              style={{ height: "46px" }}
            >
              <option value="ALL">{t("question_bank.all_types", "All Question Types")}</option>
              <option value="MCQ">{t("status.mcq_single", "MCQ (Single Choice)")}</option>
              <option value="MULTI_SELECT">{t("status.multi_select", "Multi-Select")}</option>
              <option value="SHORT_ANSWER">{t("status.short_answer", "Short Answer")}</option>
              <option value="LONG_ANSWER">{t("status.long_answer", "Long Answer")}</option>
              <option value="IMAGE_UPLOAD">{t("status.image_upload", "Image Upload")}</option>
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <select
              className="form-control"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              style={{ height: "46px" }}
            >
              <option value="ALL">{t("question_bank.all_difficulties", "All Difficulties")}</option>
              <option value="EASY">{t("status.easy", "Easy")}</option>
              <option value="MEDIUM">{t("status.medium", "Medium")}</option>
              <option value="HARD">{t("status.hard", "Hard")}</option>
            </select>
          </div>

          {/* Min Marks */}
          <div>
            <input
              type="number"
              step="0.5"
              min="0"
              placeholder={t("question_bank.min_marks_placeholder", "Min Marks")}
              className="form-control"
              value={minMarks}
              onChange={(e) => setMinMarks(e.target.value)}
              style={{ height: "46px" }}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: "46px", padding: "0 1.4rem" }}>
            {t("question_bank.filter_btn", "Apply Filters")}
          </button>
        </form>
      </div>

      {/* Questions Table Layout */}
      <div className="glass-card" style={{ padding: "2.25rem 2.5rem" }}>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: "80px" }}>{t("common.id", "ID")}</th>
                <th>{t("question_bank.col_question", "Question Preview")}</th>
                <th>{t("question_bank.col_type", "Type")}</th>
                <th>{t("question_bank.col_subject", "Subject")}</th>
                <th>{t("question_bank.col_difficulty", "Difficulty")}</th>
                <th>{t("question_bank.col_marks", "Marks")}</th>
                <th>{t("question_bank.col_created_by", "Created By")}</th>
                <th style={{ textAlign: "right" }}>{t("question_bank.col_actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", color: "var(--text-muted)", padding: "4rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                      <RefreshCw size={28} className="animate-spin" color="#818cf8" />
                      <span>{t("question_bank.loading_repository", "Loading question bank repository...")}</span>
                    </div>
                  </td>
                </tr>
              ) : questions.length > 0 ? (
                questions.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-subtle)", fontWeight: 700 }}>
                        #{q.id}
                      </span>
                    </td>
                    <td style={{ maxWidth: "480px" }}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "var(--text-main)",
                          fontSize: "0.95rem",
                          lineHeight: 1.5,
                          marginBottom: "0.35rem"
                        }}
                      >
                        {q[`question_text_${language}`] || translateContent(q.question_text, language)}
                      </div>
                      {q.options && q.options.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.45rem" }}>
                          {q.options.slice(0, 4).map((opt, optIdx) => {
                            const letter = getLocalizedOptionLabel(optIdx, language);
                            const optText = opt[`option_text_${language}`] || translateContent(opt.option_text, language);
                            return (
                              <span
                                key={opt.id || optIdx}
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "0.2rem 0.55rem",
                                  borderRadius: "4px",
                                  background: opt.is_correct ? "rgba(16, 185, 129, 0.15)" : "rgba(30, 41, 59, 0.6)",
                                  border: `1px solid ${opt.is_correct ? "rgba(16, 185, 129, 0.4)" : "var(--border-color)"}`,
                                  color: opt.is_correct ? "#6ee7b7" : "var(--text-muted)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  maxWidth: "200px",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis"
                                }}
                              >
                                <strong style={{ color: opt.is_correct ? "#34d399" : "var(--primary-light)" }}>{letter}.</strong>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{optText}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td>
                      <QuestionTypeBadge type={q.question_type} />
                    </td>
                    <td>
                      <span style={{ fontSize: "0.875rem", color: "var(--text-main)", fontWeight: 600 }}>
                        {q[`subject_${language}`] || translateContent(q.subject, language)}
                      </span>
                    </td>
                    <td>
                      <DifficultyBadge difficulty={q.difficulty} />
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 800, color: "#34d399", fontSize: "0.95rem" }}>
                          +{q.marks}
                        </span>
                        {q.negative_marks > 0 && (
                          <span style={{ fontSize: "0.725rem", color: "#fb7185", fontWeight: 600 }}>
                            -{q.negative_marks} {t("common.neg_marks", "neg")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>
                        {q.creator_name || t("status.examiner", "Examiner")}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.45rem" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          title={t("question_bank.preview_tooltip", "View Full Question & Solution")}
                          onClick={() => {
                            setSelectedQuestion(q);
                            setShowDetailModal(true);
                          }}
                          style={{ padding: "0.45rem 0.65rem" }}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          title={t("question_bank.edit_tooltip", "Edit Question")}
                          onClick={() => handleEdit(q)}
                          style={{ padding: "0.45rem 0.65rem" }}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          className="btn btn-rose btn-sm"
                          title={t("question_bank.delete_tooltip", "Delete Question")}
                          onClick={() => {
                            setSelectedQuestion(q);
                            setShowDeleteConfirm(true);
                          }}
                          style={{ padding: "0.45rem 0.65rem" }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", color: "var(--text-subtle)", padding: "4rem" }}>
                    {t("question_bank.no_questions_found", "No questions found matching your filter criteria.")}
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
        title={t("question_bank.delete_confirm_title", "Delete Question from Bank")}
        message={t("question_bank.delete_confirm_message", "Are you sure you want to permanently delete Question #{id}? This item will be removed from all upcoming tests and exam papers.", { id: selectedQuestion?.id })}
        confirmText={t("common.delete", "Delete Question")}
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
                  {t("question_bank.import_modal_title", "Import Questions to Repository")}
                </h3>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {t("question_bank.import_modal_desc", "Upload Excel, Word, PDF or paste text to bulk extract questions directly into your Question Bank.")}
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
