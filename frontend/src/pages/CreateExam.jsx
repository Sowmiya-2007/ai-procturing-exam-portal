import React, { useState, useEffect } from "react";
import { 
  Layers, 
  Sparkles, 
  Dices, 
  PlusCircle, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  ArrowLeft, 
  Eye, 
  Sliders, 
  BookOpen, 
  FileText, 
  Lock,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Video,
  EyeOff,
  FileSpreadsheet,
  UploadCloud,
  Search
} from "lucide-react";
import { api, formatError } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { TypeBadge, DifficultyBadge } from "../components/StatusBadge";
import { DocumentQuestionExtractor } from "../components/DocumentQuestionExtractor";
import { translateContent, getLocalizedOptionLabel, formatQuestionPrefix } from "../services/translator";

export const CreateExam = ({ setCurrentView }) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { language, t } = useLanguage();

  // Basic Exam State
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Computer Science & Engineering");
  const [customSubject, setCustomSubject] = useState("");
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [examStatus, setExamStatus] = useState("PUBLISHED"); // PUBLISHED or DRAFT

  // Proctoring Settings
  const [proctoringEnabled, setProctoringEnabled] = useState(true);
  const [webcamEnabled, setWebcamEnabled] = useState(true);
  const [gazeTrackingEnabled, setGazeTrackingEnabled] = useState(true);
  const [maxTabWarnings, setMaxTabWarnings] = useState(3);

  // Random Selection Configuration
  const [randomSubject, setRandomSubject] = useState("ALL");
  const [randomDifficulty, setRandomDifficulty] = useState("ALL");
  const [randomType, setRandomType] = useState("ALL");
  const [randomCount, setRandomCount] = useState(5);
  const [isGeneratingRandom, setIsGeneratingRandom] = useState(false);

  // Question Pool & Selected Questions
  const [selectedQuestions, setSelectedQuestions] = useState([]); // Array of { question, marks, order }
  const [activeTab, setActiveTab] = useState("random"); // 'random' | 'manual' | 'extractor'
  
  // Manual Question Browser State
  const [bankQuestions, setBankQuestions] = useState([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [bankTypeFilter, setBankTypeFilter] = useState("ALL");
  const [bankSubjectFilter, setBankSubjectFilter] = useState("ALL");
  
  // Dynamic Subjects from DB
  const [availableSubjects, setAvailableSubjects] = useState([
    "Computer Science & Engineering",
    "Artificial Intelligence",
    "Data Structures",
    "Computer Networks",
    "Database Management Systems",
    "Computer Architecture",
    "Cybersecurity",
    "Operating Systems"
  ]);

  // Submission
  const [submitting, setSubmitting] = useState(false);

  // Load available subjects from question bank stats
  useEffect(() => {
    api.getQuestionStats()
      .then(stats => {
        if (stats && stats.by_subject) {
          const dbSubjects = Object.keys(stats.by_subject);
          setAvailableSubjects(prev => {
            const merged = Array.from(new Set([...prev, ...dbSubjects]));
            return merged.filter(Boolean);
          });
        }
      })
      .catch(() => {});
  }, []);

  // Load question bank for manual picker
  const loadBankQuestions = async () => {
    setLoadingBank(true);
    try {
      const data = await api.getQuestions({ 
        search: bankSearch.trim() || undefined,
        question_type: bankTypeFilter !== "ALL" ? bankTypeFilter : undefined,
        subject: bankSubjectFilter !== "ALL" ? bankSubjectFilter : undefined 
      });
      setBankQuestions(data || []);
    } catch (err) {
      showToast(formatError(err, "Failed to load question bank"), "error");
    } finally {
      setLoadingBank(false);
    }
  };

  useEffect(() => {
    if (activeTab === "manual") {
      loadBankQuestions();
    }
  }, [activeTab, bankSearch, bankTypeFilter, bankSubjectFilter]);

  // Handle Random Question Generation
  const handleGenerateRandomQuestions = async () => {
    setIsGeneratingRandom(true);
    try {
      const payload = {
        question_count: Math.max(1, parseInt(randomCount) || 5),
        subject: randomSubject !== "ALL" ? randomSubject : undefined,
        difficulty: randomDifficulty !== "ALL" ? randomDifficulty : undefined,
        question_type: randomType !== "ALL" ? randomType : undefined
      };

      const questions = await api.getRandomQuestions(payload);
      
      if (!questions || questions.length === 0) {
        showToast("No questions found matching your filter criteria. Try broader filters.", "warning");
        setIsGeneratingRandom(false);
        return;
      }

      // Format as selected questions
      const formatted = questions.map((q, idx) => ({
        question: q,
        marks: parseFloat(q.marks) || 2.0,
        order: idx + 1
      }));

      setSelectedQuestions(formatted);
      showToast(`Successfully assembled ${formatted.length} randomized question(s) into blueprint!`, "success");
    } catch (err) {
      showToast(formatError(err, "Failed to fetch random questions"), "error");
    } finally {
      setIsGeneratingRandom(false);
    }
  };

  // Re-roll a single question
  const handleRerollSingle = async (indexToReplace) => {
    try {
      const currentIds = selectedQuestions.map(sq => sq.question?.id).filter(Boolean);
      const targetQ = selectedQuestions[indexToReplace]?.question;
      
      const payload = {
        question_count: 5,
        subject: randomSubject !== "ALL" ? randomSubject : undefined,
        difficulty: targetQ?.difficulty || undefined,
        question_type: targetQ?.question_type || undefined
      };

      const candidates = await api.getRandomQuestions(payload);
      // Find candidate not already in selected list
      const fresh = candidates.find(c => !currentIds.includes(c.id)) || candidates[0];

      if (fresh) {
        setSelectedQuestions(prev => {
          const updated = [...prev];
          updated[indexToReplace] = {
            ...updated[indexToReplace],
            question: fresh,
            marks: parseFloat(fresh.marks) || updated[indexToReplace].marks || 2.0
          };
          return updated;
        });
        showToast(`Question #${indexToReplace + 1} re-rolled with a fresh item.`, "info");
      } else {
        showToast("No alternative unique questions found in question pool.", "warning");
      }
    } catch (err) {
      showToast(formatError(err, "Failed to re-roll question"), "error");
    }
  };

  // Remove question from selection
  const handleRemoveQuestion = (index) => {
    setSelectedQuestions(prev => {
      const updated = prev.filter((_, idx) => idx !== index);
      // Re-index orders
      return updated.map((item, idx) => ({ ...item, order: idx + 1 }));
    });
  };

  // Toggle question from manual bank
  const handleToggleManualQuestion = (q) => {
    const exists = selectedQuestions.some(sq => sq.question?.id === q.id);
    if (exists) {
      setSelectedQuestions(prev => {
        const updated = prev.filter(sq => sq.question?.id !== q.id);
        return updated.map((item, idx) => ({ ...item, order: idx + 1 }));
      });
    } else {
      setSelectedQuestions(prev => [
        ...prev,
        {
          question: q,
          marks: parseFloat(q.marks) || 2.0,
          order: prev.length + 1
        }
      ]);
    }
  };

  // Handle individual marks change
  const handleMarksChange = (index, val) => {
    const marksNum = Math.max(0.5, parseFloat(val) || 1.0);
    setSelectedQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], marks: marksNum };
      return updated;
    });
  };

  // Calculations
  const totalMarks = Math.round(selectedQuestions.reduce((sum, item) => sum + (parseFloat(item.marks) || 1.0), 0) * 10) / 10;
  const passingMarks = Math.round(totalMarks * 0.4 * 10) / 10;

  // Handle extracted questions added directly to exam blueprint
  const handleExtractedQuestionsAdded = (questions) => {
    if (!questions || questions.length === 0) return;
    const formatted = questions.map((q, idx) => ({
      question: q.id && typeof q.id === "number" ? q : { ...q, id: `ext_${Date.now()}_${idx}` },
      marks: parseFloat(q.marks) || 2.0,
      order: selectedQuestions.length + idx + 1
    }));
    setSelectedQuestions(prev => [...prev, ...formatted]);
  };

  // Effective Subject
  const effectiveSubject = (isCustomSubject ? customSubject.trim() : subject.trim()) || "Computer Science & Engineering";

  // Submit Exam
  const handleSaveExam = async (statusOverride = null) => {
    if (!title.trim()) {
      showToast("Please enter a title for the examination.", "warning");
      return;
    }

    const finalStatus = statusOverride || examStatus;

    if (finalStatus === "PUBLISHED" && selectedQuestions.length === 0) {
      showToast("Please select at least 1 question before publishing the exam, or click 'Save as Draft'.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      let currentSelected = [...selectedQuestions];
      
      // Auto-persist any extracted questions that were not yet committed to DB
      const unpersisted = currentSelected.filter(sq => 
        !sq.question?.id || 
        typeof sq.question.id === "string" || 
        String(sq.question.id).startsWith("ext_")
      );

      if (unpersisted.length > 0) {
        showToast(`Auto-indexing ${unpersisted.length} extracted question(s) into Question Bank...`, "info");
        const batchPayload = {
          questions: unpersisted.map(sq => ({
            question_text: sq.question.question_text || "Untitled Question",
            question_type: sq.question.question_type || "MCQ",
            subject: sq.question.subject || effectiveSubject,
            difficulty: sq.question.difficulty || "MEDIUM",
            marks: Math.max(0.5, parseFloat(sq.marks) || 1.0),
            negative_marks: Math.max(0, parseFloat(sq.question.negative_marks) || 0.0),
            model_answer: sq.question.model_answer || undefined,
            evaluation_guidelines: sq.question.evaluation_guidelines || undefined,
            options: (sq.question.options || []).map(o => ({
              option_text: o.option_text || "Option",
              is_correct: !!o.is_correct
            }))
          }))
        };

        const batchRes = await api.batchCreateQuestions(batchPayload);
        if (batchRes && batchRes.questions && batchRes.questions.length > 0) {
          let bIdx = 0;
          currentSelected = currentSelected.map(sq => {
            if (!sq.question?.id || typeof sq.question.id === "string" || String(sq.question.id).startsWith("ext_")) {
              const saved = batchRes.questions[bIdx++];
              if (saved) {
                return { ...sq, question: saved, marks: sq.marks || saved.marks || 1.0 };
              }
              return null;
            }
            return sq;
          }).filter(Boolean);
          setSelectedQuestions(currentSelected);
        }
      }

      // Ensure valid integer IDs for linking
      const validLinkedQuestions = currentSelected
        .filter(sq => sq.question && sq.question.id && typeof sq.question.id === "number")
        .map((sq, idx) => ({
          question_id: sq.question.id,
          marks: parseFloat(sq.marks) || 1.0,
          order: idx + 1
        }));

      if (finalStatus === "PUBLISHED" && validLinkedQuestions.length === 0) {
        showToast("Please ensure questions are valid before publishing.", "warning");
        setSubmitting(false);
        return;
      }

      const durMinutes = Math.max(1, parseInt(durationMinutes) || 60);
      const tabWarn = Math.max(1, parseInt(maxTabWarnings) || 3);
      const calcTotMarks = validLinkedQuestions.length > 0 ? totalMarks : 100.0;
      const calcPassMarks = validLinkedQuestions.length > 0 ? passingMarks : 40.0;

      const payload = {
        title: title.trim(),
        subject: effectiveSubject,
        description: description.trim() || undefined,
        duration_minutes: durMinutes,
        total_marks: calcTotMarks,
        passing_marks: calcPassMarks,
        status: finalStatus,
        proctoring_config: `proctoring=${proctoringEnabled}, webcam=${webcamEnabled}, gaze=${gazeTrackingEnabled}`,
        proctoring_enabled: proctoringEnabled,
        webcam_monitoring_enabled: webcamEnabled,
        gaze_tracking_enabled: gazeTrackingEnabled,
        max_tab_switch_warnings: tabWarn,
        questions: validLinkedQuestions
      };

      const created = await api.createExam(payload);
      if (finalStatus === "PUBLISHED") {
        showToast(`Exam "${created.title}" successfully created and published! It is now live for students in the portal.`, "success", 6000);
      } else {
        showToast(`Exam "${created.title}" saved as draft. You can publish it anytime from the dashboard.`, "info", 5000);
      }
      setCurrentView("examiner_dashboard");
    } catch (err) {
      showToast(formatError(err, "Failed to create exam"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: "4rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <button
            onClick={() => setCurrentView("examiner_dashboard")}
            className="btn btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.75rem" }}
          >
            <ArrowLeft size={15} /> {t("create_exam.back_dashboard", "Back to Examiner Dashboard")}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#c084fc"
            }}>
              <Layers size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                {t("create_exam.title", "Create Examination Blueprint")}
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
                {t("create_exam.sub", "Configure exam specifications, proctoring safeguards, and assemble questions via random generation or document import")}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Top Buttons */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => handleSaveExam("DRAFT")}
            disabled={submitting}
            className="btn btn-secondary"
          >
            {t("create_exam.save_draft", "Save as Draft")}
          </button>
          <button
            onClick={() => handleSaveExam("PUBLISHED")}
            disabled={submitting}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <CheckCircle2 size={16} />
            {submitting ? t("create_exam.publishing", "Publishing...") : t("create_exam.save_exam_btn", "Create & Publish Exam")}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: "1.75rem", alignItems: "start" }}>
        
        {/* Left Column: Exam Details & Proctoring Settings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* 1. Exam Configuration Card */}
          <div className="glass-card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <FileText size={18} color="#818cf8" />
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                {t("create_exam.sec_specs", "1. Examination Specifications")}
              </h3>
            </div>

            <div className="form-group">
              <label className="form-label">{t("create_exam.exam_title_label", "Examination Title *")}</label>
              <input
                type="text"
                required
                placeholder={t("create_exam.exam_title_placeholder", "e.g. Data Structures & Algorithms Comprehensive Midterm 2026")}
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <label className="form-label" style={{ margin: 0 }}>{t("create_exam.subject_label", "Subject / Discipline *")}</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomSubject(!isCustomSubject)}
                    style={{ background: "transparent", border: "none", color: "#818cf8", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline" }}
                  >
                    {isCustomSubject ? t("create_exam.pick_standard", "Pick Standard") : t("create_exam.custom_name", "Custom Name")}
                  </button>
                </div>
                {isCustomSubject ? (
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter custom subject..."
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                  />
                ) : (
                  <select
                    className="form-control"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  >
                    {availableSubjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">{t("create_exam.duration_label", "Duration (Minutes) *")}</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="number"
                    min={5}
                    max={360}
                    className="form-control"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Quick Duration Presets */}
            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.25rem" }}>
              {[30, 45, 60, 90, 120, 180].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  style={{
                    padding: "0.2rem 0.55rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    border: durationMinutes === mins ? "1px solid var(--primary)" : "1px solid var(--border-color)",
                    background: durationMinutes === mins ? "rgba(99, 102, 241, 0.2)" : "rgba(30, 41, 59, 0.4)",
                    color: durationMinutes === mins ? "#c7d2fe" : "var(--text-subtle)",
                    cursor: "pointer"
                  }}
                >
                  {mins}m
                </button>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label">{t("create_exam.status_label", "Initial Status")}</label>
              <select
                className="form-control"
                value={examStatus}
                onChange={(e) => setExamStatus(e.target.value)}
              >
                <option value="PUBLISHED">{t("create_exam.status_published_desc", "PUBLISHED (Active & Available to Students in Portal)")}</option>
                <option value="DRAFT">{t("create_exam.status_draft_desc", "DRAFT (Saved as Draft Blueprint)")}</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t("create_exam.desc_label", "Exam Instructions / Overview")}</label>
              <textarea
                rows={3}
                className="form-control"
                placeholder={t("create_exam.desc_placeholder", "Candidate instructions, permissible resources, and grading breakdown...")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ resize: "vertical" }}
              />
            </div>
          </div>

          {/* 2. AI Proctoring & Integrity Safeguards */}
          <div className="glass-card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <ShieldCheck size={18} color="#34d399" />
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                {t("create_exam.sec_proctoring", "2. AI Proctoring & Telemetry")}
              </h3>
            </div>

            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              {t("create_exam.proctoring_desc", "Automated computer vision safeguards enforce candidate evaluation integrity during live examination sessions.")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Video size={16} color="#818cf8" /> {t("create_exam.enable_webcam", "WebCam & Facial Telemetry")}
                </span>
                <input
                  type="checkbox"
                  checked={webcamEnabled}
                  onChange={(e) => setWebcamEnabled(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#6366f1" }}
                />
              </label>

              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Eye size={16} color="#c084fc" /> {t("create_exam.enable_gaze", "Gaze & Head Orientation Tracking")}
                </span>
                <input
                  type="checkbox"
                  checked={gazeTrackingEnabled}
                  onChange={(e) => setGazeTrackingEnabled(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#a855f7" }}
                />
              </label>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  {t("create_exam.max_warnings_label", "Max Tab-Switch Warnings:")}
                </span>
                <select
                  value={maxTabWarnings}
                  onChange={(e) => setMaxTabWarnings(parseInt(e.target.value))}
                  style={{
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-main)",
                    borderRadius: "4px",
                    padding: "0.2rem 0.5rem",
                    fontSize: "0.85rem"
                  }}
                >
                  <option value={1}>1 Warning</option>
                  <option value={2}>2 Warnings</option>
                  <option value={3}>3 Warnings (Standard)</option>
                  <option value={5}>5 Warnings</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Random Question Selector & Assembly Studio */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Question Assembly Mode Tabs */}
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Dices size={20} color="#fbbf24" />
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                  {t("create_exam.assembly_studio", "Question Assembly Studio")}
                </h3>
              </div>

              {/* Mode Toggle */}
              <div style={{
                display: "flex",
                background: "rgba(15, 23, 42, 0.6)",
                padding: "0.25rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
                flexWrap: "wrap"
              }}>
                <button
                  type="button"
                  onClick={() => setActiveTab("random")}
                  style={{
                    padding: "0.35rem 0.75rem",
                    borderRadius: "4px",
                    border: "none",
                    background: activeTab === "random" ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "transparent",
                    color: activeTab === "random" ? "#ffffff" : "var(--text-muted)",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem"
                  }}
                >
                  <Dices size={14} /> {t("create_exam.tab_random", "Random Generator")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("manual")}
                  style={{
                    padding: "0.35rem 0.75rem",
                    borderRadius: "4px",
                    border: "none",
                    background: activeTab === "manual" ? "linear-gradient(135deg, #4f46e5, #6366f1)" : "transparent",
                    color: activeTab === "manual" ? "#ffffff" : "var(--text-muted)",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem"
                  }}
                >
                  <BookOpen size={14} /> {t("create_exam.tab_manual", "Manual Picker")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("extractor")}
                  style={{
                    padding: "0.35rem 0.75rem",
                    borderRadius: "4px",
                    border: "none",
                    background: activeTab === "extractor" ? "linear-gradient(135deg, #059669, #10b981)" : "transparent",
                    color: activeTab === "extractor" ? "#ffffff" : "var(--text-muted)",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem"
                  }}
                >
                  <FileSpreadsheet size={14} /> {t("create_exam.tab_extractor", "Document Extractor")}
                </button>
              </div>
            </div>

            {/* TAB 1: RANDOM QUESTION GENERATOR */}
            {activeTab === "random" && (
              <div style={{
                background: "rgba(15, 23, 42, 0.5)",
                border: "1px solid rgba(168, 85, 247, 0.25)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                marginBottom: "1rem"
              }}>
                <div style={{ fontSize: "0.8rem", color: "#c084fc", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Sparkles size={14} /> {t("create_exam.random_params_title", "Random Selection Parameters")}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.25rem" }}>
                      {t("create_exam.random_subject_label", "Subject Pool")}
                    </label>
                    <select
                      className="form-control"
                      style={{ fontSize: "0.85rem", padding: "0.4rem 0.6rem" }}
                      value={randomSubject}
                      onChange={(e) => setRandomSubject(e.target.value)}
                    >
                      <option value="ALL">{t("create_exam.all_subjects_universal", "All Subjects (Universal Pool)")}</option>
                      {availableSubjects.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.25rem" }}>
                      {t("create_exam.random_diff_label", "Difficulty Filter")}
                    </label>
                    <select
                      className="form-control"
                      style={{ fontSize: "0.85rem", padding: "0.4rem 0.6rem" }}
                      value={randomDifficulty}
                      onChange={(e) => setRandomDifficulty(e.target.value)}
                    >
                      <option value="ALL">{t("create_exam.all_difficulties_balanced", "All Difficulties (Balanced)")}</option>
                      <option value="EASY">{t("status.easy", "Easy")}</option>
                      <option value="MEDIUM">{t("status.medium", "Medium")}</option>
                      <option value="HARD">{t("status.hard", "Hard")}</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.25rem" }}>
                      {t("create_exam.random_type_label", "Question Format")}
                    </label>
                    <select
                      className="form-control"
                      style={{ fontSize: "0.85rem", padding: "0.4rem 0.6rem" }}
                      value={randomType}
                      onChange={(e) => setRandomType(e.target.value)}
                    >
                      <option value="ALL">{t("create_exam.all_types_multimodal", "All 5 Types (Multi-Modal)")}</option>
                      <option value="MCQ">{t("status.mcq_single", "Single MCQ Only")}</option>
                      <option value="MULTI_SELECT">{t("status.multi_select", "Multi-Select Only")}</option>
                      <option value="SHORT_ANSWER">{t("status.short_answer", "Short Answer Only")}</option>
                      <option value="LONG_ANSWER">{t("status.long_answer", "Long Essay Only")}</option>
                      <option value="IMAGE_UPLOAD">{t("status.image_upload", "Diagram Upload Only")}</option>
                    </select>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                        {t("create_exam.random_count_label", "Number of Questions")}
                      </label>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fbbf24" }}>
                        {randomCount} {t("create_exam.items", "Items")}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={randomCount}
                      onChange={(e) => setRandomCount(e.target.value)}
                      style={{ width: "100%", accentColor: "#a855f7" }}
                    />
                  </div>
                </div>

                {/* Generator Button */}
                <button
                  type="button"
                  onClick={handleGenerateRandomQuestions}
                  disabled={isGeneratingRandom}
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.65rem 1rem",
                    fontWeight: 700
                  }}
                >
                  <Dices size={18} className={isGeneratingRandom ? "spin-animation" : ""} />
                  {isGeneratingRandom ? t("create_exam.generating_random", "Synthesizing Random Question Set...") : t("create_exam.generate_random_btn", "🎲 Generate Random Questions for Exam")}
                </button>
              </div>
            )}

            {/* TAB 2: MANUAL BROWSE & PICK */}
            {activeTab === "manual" && (
              <div style={{
                background: "rgba(15, 23, 42, 0.5)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: "1rem",
                marginBottom: "1rem"
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <input
                    type="text"
                    placeholder={t("create_exam.search_questions_ph", "Search questions...")}
                    className="form-control"
                    style={{ fontSize: "0.85rem" }}
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                  />
                  <select
                    className="form-control"
                    style={{ fontSize: "0.85rem" }}
                    value={bankSubjectFilter}
                    onChange={(e) => setBankSubjectFilter(e.target.value)}
                  >
                    <option value="ALL">{t("question_bank.all_subjects", "All Subjects")}</option>
                    {availableSubjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    className="form-control"
                    style={{ fontSize: "0.85rem" }}
                    value={bankTypeFilter}
                    onChange={(e) => setBankTypeFilter(e.target.value)}
                  >
                    <option value="ALL">{t("question_bank.all_types", "All Types")}</option>
                    <option value="MCQ">{t("status.mcq_single", "MCQ")}</option>
                    <option value="MULTI_SELECT">{t("status.multi_select", "Multi")}</option>
                    <option value="SHORT_ANSWER">{t("status.short_answer", "Short")}</option>
                    <option value="LONG_ANSWER">{t("status.long_answer", "Long")}</option>
                    <option value="IMAGE_UPLOAD">{t("status.image_upload", "Upload")}</option>
                  </select>
                </div>

                <div style={{ maxHeight: "240px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {loadingBank ? (
                    <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      {t("create_exam.loading_bank", "Loading question bank...")}
                    </div>
                  ) : bankQuestions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      {t("create_exam.empty_bank", "No questions found. Try changing filters or adding questions to the bank.")}
                    </div>
                  ) : (
                    bankQuestions.map(q => {
                      const isAdded = selectedQuestions.some(sq => sq.question?.id === q.id);
                      return (
                        <div
                          key={q.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0.55rem 0.85rem",
                            borderRadius: "6px",
                            background: isAdded ? "rgba(99, 102, 241, 0.18)" : "rgba(30, 41, 59, 0.4)",
                            border: isAdded ? "1px solid rgba(99, 102, 241, 0.5)" : "1px solid var(--border-color)",
                            gap: "0.75rem"
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.85rem", color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {translateContent(q.question_text, language)}
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", fontSize: "0.725rem", color: "var(--text-muted)" }}>
                              <TypeBadge type={q.question_type} />
                              <span style={{ color: "#a5b4fc" }}>{translateContent(q.subject, language)}</span>
                              <span>&bull;</span>
                              <span style={{ color: "#34d399", fontWeight: 700 }}>{q.marks} {t("common.marks", "Marks")}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleManualQuestion(q)}
                            className={`btn btn-sm ${isAdded ? "btn-secondary" : "btn-primary"}`}
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem", flexShrink: 0 }}
                          >
                            {isAdded ? t("common.remove", "Remove") : t("create_exam.add_question", "+ Add")}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: DOCUMENT / FILE EXTRACTOR */}
            {activeTab === "extractor" && (
              <div style={{ marginBottom: "1rem" }}>
                <DocumentQuestionExtractor
                  currentSubject={effectiveSubject}
                  onAddToExam={handleExtractedQuestionsAdded}
                  onSaveToBankAndAdd={(savedQuestions) => {
                    handleExtractedQuestionsAdded(savedQuestions);
                  }}
                />
              </div>
            )}

            {/* Live Metrics Summary Bar */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(30, 41, 59, 0.5)",
              padding: "0.85rem 1.25rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              marginBottom: "1rem"
            }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>
                  {t("create_exam.selected_questions_label", "Selected Questions")}
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)" }}>
                  {selectedQuestions.length} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>{t("create_exam.items", "Items")}</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>
                  {t("create_exam.calc_total_marks", "Calculated Total Marks")}
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#34d399" }}>
                  {totalMarks} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>{t("common.marks", "Marks")}</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>
                  {t("create_exam.passing_threshold", "Passing Threshold (40%)")}
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#60a5fa" }}>
                  {passingMarks} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>{t("common.marks", "Marks")}</span>
                </div>
              </div>
            </div>

            {/* Selected Questions Blueprint Pool */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
                  {t("create_exam.paper_composition", "Exam Paper Composition ({count} Questions)", { count: selectedQuestions.length })}
                </span>
                {selectedQuestions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedQuestions([])}
                    style={{ background: "transparent", border: "none", color: "#fda4af", fontSize: "0.75rem", cursor: "pointer" }}
                  >
                    {t("create_exam.clear_all", "Clear All")}
                  </button>
                )}
              </div>

              {selectedQuestions.length === 0 ? (
                <div style={{
                  padding: "2.5rem 1.5rem",
                  textAlign: "center",
                  border: "2px dashed var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-muted)"
                }}>
                  <Dices size={32} color="#fbbf24" style={{ margin: "0 auto 0.75rem" }} />
                  <div style={{ fontWeight: 600, color: "var(--text-main)", marginBottom: "0.3rem" }}>
                    {t("create_exam.no_questions_title", "No Questions in Blueprint Yet")}
                  </div>
                  <p style={{ fontSize: "0.825rem", maxWidth: "340px", margin: "0 auto" }}>
                    {t("create_exam.no_questions_desc", "Click \"Generate Random Questions\" above, pick manually, or import from Word/Excel/PDF.")}
                  </p>
                </div>
              ) : (
                selectedQuestions.map((sq, index) => (
                  <div
                    key={`${sq.question?.id || 'q'}-${index}`}
                    className="glass-card"
                    style={{
                      padding: "0.85rem 1rem",
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{
                          background: "rgba(99, 102, 241, 0.2)",
                          color: "#a5b4fc",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          fontFamily: "var(--font-mono)"
                        }}>
                          {formatQuestionPrefix(index + 1, language)}
                        </span>
                        {sq.question?.question_type && <TypeBadge type={sq.question.question_type} />}
                        {sq.question?.difficulty && <DifficultyBadge difficulty={sq.question.difficulty} />}
                        <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                          {translateContent(sq.question?.[`subject_${language}`] || sq.question?.subject || effectiveSubject, language)}
                        </span>
                      </div>

                      {/* Right controls: Marks Input, Re-roll button, and Delete button */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>{t("common.marks", "Marks")}:</span>
                          <input
                            type="number"
                            min={0.5}
                            step={0.5}
                            value={sq.marks}
                            onChange={(e) => handleMarksChange(index, e.target.value)}
                            style={{
                              width: "55px",
                              padding: "0.2rem 0.4rem",
                              fontSize: "0.8rem",
                              background: "rgba(15, 23, 42, 0.9)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "4px",
                              color: "#34d399",
                              fontWeight: 700,
                              textAlign: "center"
                            }}
                          />
                        </div>

                        {/* Re-roll button */}
                        <button
                          type="button"
                          onClick={() => handleRerollSingle(index)}
                          title={t("create_exam.reroll_tooltip", "Re-roll this question with another random question from pool")}
                          style={{
                            background: "rgba(168, 85, 247, 0.15)",
                            border: "1px solid rgba(168, 85, 247, 0.3)",
                            color: "#c084fc",
                            borderRadius: "4px",
                            padding: "0.3rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center"
                          }}
                        >
                          <RefreshCw size={13} />
                        </button>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(index)}
                          title={t("create_exam.remove_tooltip", "Remove from exam")}
                          style={{
                            background: "rgba(244, 63, 94, 0.15)",
                            border: "1px solid rgba(244, 63, 94, 0.3)",
                            color: "#fda4af",
                            borderRadius: "4px",
                            padding: "0.3rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center"
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-main)", lineHeight: 1.4, fontWeight: 500 }}>
                      {sq.question?.[`question_text_${language}`] || translateContent(sq.question?.question_text, language) || "Question Text"}
                    </p>

                    {/* MCQ Options Display */}
                    {(sq.question?.question_type === "MCQ" || sq.question?.question_type === "MULTI_SELECT") && (sq.question?.options || []).length > 0 && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.35rem", marginTop: "0.35rem" }}>
                        {sq.question.options.map((opt, optIdx) => {
                          const tag = getLocalizedOptionLabel(optIdx, language);
                          const optText = opt[`option_text_${language}`] || translateContent(opt.option_text, language);
                          return (
                            <div
                              key={`opt-${optIdx}`}
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.25rem 0.5rem",
                                borderRadius: "4px",
                                background: opt.is_correct ? "rgba(52, 211, 153, 0.15)" : "rgba(30, 41, 59, 0.5)",
                                border: opt.is_correct ? "1px solid rgba(52, 211, 153, 0.4)" : "1px solid var(--border-color)",
                                color: opt.is_correct ? "#34d399" : "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.35rem"
                              }}
                            >
                              <span style={{ fontWeight: 800, fontFamily: "var(--font-mono)" }}>{tag})</span>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{optText}</span>
                              {opt.is_correct && <span style={{ marginLeft: "auto", fontSize: "0.65rem", fontWeight: 700 }}>✓ Key</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
