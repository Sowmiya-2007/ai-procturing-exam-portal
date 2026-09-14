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
  UploadCloud
} from "lucide-react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { TypeBadge, DifficultyBadge } from "../components/StatusBadge";
import { DocumentQuestionExtractor } from "../components/DocumentQuestionExtractor";

export const CreateExam = ({ setCurrentView }) => {
  const { showToast } = useToast();
  const { user } = useAuth();

  // Basic Exam State
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Computer Science & Engineering");
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
  const [activeTab, setActiveTab] = useState("random"); // 'random' or 'manual'
  
  // Manual Question Browser State
  const [bankQuestions, setBankQuestions] = useState([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [bankTypeFilter, setBankTypeFilter] = useState("ALL");
  
  // Submission
  const [submitting, setSubmitting] = useState(false);

  const subjectsList = [
    "Computer Science & Engineering",
    "Artificial Intelligence",
    "Data Structures",
    "Computer Networks",
    "Database Management Systems",
    "Computer Architecture",
    "Cybersecurity",
    "Operating Systems"
  ];

  // Sync randomSubject default when subject changes
  useEffect(() => {
    if (subject && randomSubject === "ALL") {
      setRandomSubject(subject);
    }
  }, [subject]);

  // Load question bank for manual picker
  const loadBankQuestions = async () => {
    setLoadingBank(true);
    try {
      const data = await api.getQuestions({ 
        search: bankSearch,
        question_type: bankTypeFilter !== "ALL" ? bankTypeFilter : undefined,
        subject: subject !== "ALL" ? subject : undefined 
      });
      setBankQuestions(data || []);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoadingBank(false);
    }
  };

  useEffect(() => {
    if (activeTab === "manual") {
      loadBankQuestions();
    }
  }, [activeTab, bankSearch, bankTypeFilter, subject]);

  // Handle Random Question Generation (Core Feature)
  const handleGenerateRandomQuestions = async () => {
    setIsGeneratingRandom(true);
    try {
      const payload = {
        question_count: parseInt(randomCount) || 5,
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
        marks: q.marks || 2.0,
        order: idx + 1
      }));

      setSelectedQuestions(formatted);
      showToast(`Successfully selected ${formatted.length} random questions!`, "success");
    } catch (err) {
      showToast(err.message || "Failed to fetch random questions", "error");
    } finally {
      setIsGeneratingRandom(false);
    }
  };

  // Re-roll a single question
  const handleRerollSingle = async (indexToReplace) => {
    try {
      const currentIds = selectedQuestions.map(sq => sq.question.id);
      const payload = {
        question_count: 3,
        subject: randomSubject !== "ALL" ? randomSubject : undefined,
        difficulty: selectedQuestions[indexToReplace].question.difficulty,
        question_type: selectedQuestions[indexToReplace].question.question_type
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
            marks: fresh.marks || updated[indexToReplace].marks
          };
          return updated;
        });
        showToast(`Question #${indexToReplace + 1} re-rolled with a fresh item.`, "info");
      } else {
        showToast("No alternative unique questions found in pool.", "warning");
      }
    } catch (err) {
      showToast(err.message, "error");
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
    const exists = selectedQuestions.some(sq => sq.question.id === q.id);
    if (exists) {
      setSelectedQuestions(prev => {
        const updated = prev.filter(sq => sq.question.id !== q.id);
        return updated.map((item, idx) => ({ ...item, order: idx + 1 }));
      });
    } else {
      setSelectedQuestions(prev => [
        ...prev,
        {
          question: q,
          marks: q.marks || 2.0,
          order: prev.length + 1
        }
      ]);
    }
  };

  // Handle individual marks change
  const handleMarksChange = (index, val) => {
    const marksNum = parseFloat(val) || 0;
    setSelectedQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], marks: marksNum };
      return updated;
    });
  };

  // Calculations
  const totalMarks = selectedQuestions.reduce((sum, item) => sum + (parseFloat(item.marks) || 0), 0);
  const passingMarks = Math.round(totalMarks * 0.4 * 10) / 10;

  // Handle extracted questions added directly to exam blueprint
  const handleExtractedQuestionsAdded = (questions) => {
    const formatted = questions.map((q, idx) => ({
      question: q.id ? q : { ...q, id: `ext_${Date.now()}_${idx}` },
      marks: parseFloat(q.marks) || 2.0,
      order: selectedQuestions.length + idx + 1
    }));
    setSelectedQuestions(prev => [...prev, ...formatted]);
  };

  // Submit Exam
  const handleSaveExam = async (statusOverride = null) => {
    if (!title.trim()) {
      showToast("Please enter a title for the examination.", "warning");
      return;
    }

    if (selectedQuestions.length === 0) {
      showToast("Please select at least 1 question for the exam using the Random Question Generator, Manual picker, or Document Extractor.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      let currentSelected = [...selectedQuestions];
      
      // Auto-persist any extracted questions that were not yet committed to DB
      const unpersisted = currentSelected.filter(sq => typeof sq.question.id === "string" || !sq.question.id || String(sq.question.id).startsWith("ext_"));
      if (unpersisted.length > 0) {
        showToast(`Auto-indexing ${unpersisted.length} extracted question(s) into Question Bank...`, "info");
        const batchPayload = {
          questions: unpersisted.map(sq => ({
            question_text: sq.question.question_text,
            question_type: sq.question.question_type,
            subject: sq.question.subject || subject,
            difficulty: sq.question.difficulty || "MEDIUM",
            marks: parseFloat(sq.marks) || 1.0,
            negative_marks: parseFloat(sq.question.negative_marks) || 0.0,
            model_answer: sq.question.model_answer || undefined,
            evaluation_guidelines: sq.question.evaluation_guidelines || undefined,
            options: (sq.question.options || []).map(o => ({
              option_text: o.option_text,
              is_correct: o.is_correct
            }))
          }))
        };

        const batchRes = await api.batchCreateQuestions(batchPayload);
        if (batchRes.questions && batchRes.questions.length > 0) {
          let bIdx = 0;
          currentSelected = currentSelected.map(sq => {
            if (typeof sq.question.id === "string" || !sq.question.id || String(sq.question.id).startsWith("ext_")) {
              const saved = batchRes.questions[bIdx++];
              return { ...sq, question: saved };
            }
            return sq;
          });
          setSelectedQuestions(currentSelected);
        }
      }

      const finalStatus = statusOverride || examStatus;
      const payload = {
        title: title.trim(),
        subject: subject.trim(),
        description: description.trim() || undefined,
        duration_minutes: parseInt(durationMinutes) || 60,
        total_marks: totalMarks,
        passing_marks: passingMarks,
        status: finalStatus,
        proctoring_config: `proctoring=${proctoringEnabled}, webcam=${webcamEnabled}, gaze=${gazeTrackingEnabled}`,
        proctoring_enabled: proctoringEnabled,
        webcam_monitoring_enabled: webcamEnabled,
        gaze_tracking_enabled: gazeTrackingEnabled,
        max_tab_switch_warnings: parseInt(maxTabWarnings) || 3,
        questions: currentSelected.map((sq, idx) => ({
          question_id: sq.question.id,
          marks: parseFloat(sq.marks) || 1.0,
          order: idx + 1
        }))
      };

      const created = await api.createExam(payload);
      if (finalStatus === "PUBLISHED") {
        showToast(`Exam "${created.title}" successfully created and published! It is now live for students in the portal.`, "success", 6000);
      } else {
        showToast(`Exam "${created.title}" saved as draft. You can publish it anytime from the dashboard.`, "info", 5000);
      }
      setCurrentView("examiner_dashboard");
    } catch (err) {
      showToast(err.message || "Failed to create exam", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: "4rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
        <div>
          <button
            onClick={() => setCurrentView("examiner_dashboard")}
            className="btn btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.75rem" }}
          >
            <ArrowLeft size={15} /> Back to Examiner Dashboard
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
                Create Examination Blueprint
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
                Configure exam specifications, proctoring safeguards, and assemble questions via random generation
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
            Save as Draft
          </button>
          <button
            onClick={() => handleSaveExam("PUBLISHED")}
            disabled={submitting}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <CheckCircle2 size={16} />
            {submitting ? "Publishing..." : "Create & Publish Exam"}
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
                1. Examination Specifications
              </h3>
            </div>

            <div className="form-group">
              <label className="form-label">Examination Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Data Structures & Algorithms Comprehensive Midterm 2026"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Subject / Discipline *</label>
                <select
                  className="form-control"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  {subjectsList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Duration (Minutes) *</label>
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
              <label className="form-label">Initial Status</label>
              <select
                className="form-control"
                value={examStatus}
                onChange={(e) => setExamStatus(e.target.value)}
              >
                <option value="PUBLISHED">PUBLISHED (Active & Available to Students)</option>
                <option value="DRAFT">DRAFT (Saved as Draft Blueprint)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Exam Instructions / Overview</label>
              <textarea
                rows={3}
                className="form-control"
                placeholder="Candidate instructions, permissible resources, and grading breakdown..."
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
                2. AI Proctoring & Telemetry
              </h3>
            </div>

            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Automated computer vision safeguards enforce candidate evaluation integrity during live examination sessions.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Video size={16} color="#818cf8" /> WebCam & Facial Telemetry
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
                  <Eye size={16} color="#c084fc" /> Gaze & Head Orientation Tracking
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
                  Max Tab-Switch Warnings:
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Dices size={20} color="#fbbf24" />
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                  Question Assembly Studio
                </h3>
              </div>

              {/* Mode Toggle */}
              <div style={{
                display: "flex",
                background: "rgba(15, 23, 42, 0.6)",
                padding: "0.25rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)"
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
                  <Dices size={14} /> Random Generator
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
                  <BookOpen size={14} /> Manual Picker
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
                  <FileSpreadsheet size={14} /> Extract from File (Excel / Word / PDF)
                </button>
              </div>
            </div>

            {/* TAB 1: RANDOM QUESTION GENERATOR (CORE FEATURE) */}
            {activeTab === "random" && (
              <div style={{
                background: "rgba(15, 23, 42, 0.5)",
                border: "1px solid rgba(168, 85, 247, 0.25)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                marginBottom: "1rem"
              }}>
                <div style={{ fontSize: "0.8rem", color: "#c084fc", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Sparkles size={14} /> Random Selection Parameters
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.25rem" }}>
                      Subject Pool
                    </label>
                    <select
                      className="form-control"
                      style={{ fontSize: "0.85rem", padding: "0.4rem 0.6rem" }}
                      value={randomSubject}
                      onChange={(e) => setRandomSubject(e.target.value)}
                    >
                      <option value="ALL">All Subjects Pool</option>
                      {subjectsList.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.25rem" }}>
                      Difficulty Filter
                    </label>
                    <select
                      className="form-control"
                      style={{ fontSize: "0.85rem", padding: "0.4rem 0.6rem" }}
                      value={randomDifficulty}
                      onChange={(e) => setRandomDifficulty(e.target.value)}
                    >
                      <option value="ALL">All Difficulties (Balanced)</option>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-subtle)", display: "block", marginBottom: "0.25rem" }}>
                      Question Format
                    </label>
                    <select
                      className="form-control"
                      style={{ fontSize: "0.85rem", padding: "0.4rem 0.6rem" }}
                      value={randomType}
                      onChange={(e) => setRandomType(e.target.value)}
                    >
                      <option value="ALL">All 5 Types (Multi-Modal)</option>
                      <option value="MCQ">Single MCQ Only</option>
                      <option value="MULTI_SELECT">Multi-Select Only</option>
                      <option value="SHORT_ANSWER">Short Answer Only</option>
                      <option value="LONG_ANSWER">Long Essay Only</option>
                      <option value="IMAGE_UPLOAD">Diagram Upload Only</option>
                    </select>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                        Number of Questions
                      </label>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fbbf24" }}>
                        {randomCount} Items
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
                  <Dices size={18} className={isGeneratingRandom ? "animate-spin" : ""} />
                  {isGeneratingRandom ? "Synthesizing Random Question Set..." : "🎲 Generate Random Questions for Exam"}
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
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <input
                    type="text"
                    placeholder="Search question pool..."
                    className="form-control"
                    style={{ fontSize: "0.85rem" }}
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                  />
                  <select
                    className="form-control"
                    style={{ fontSize: "0.85rem", width: "140px" }}
                    value={bankTypeFilter}
                    onChange={(e) => setBankTypeFilter(e.target.value)}
                  >
                    <option value="ALL">All Types</option>
                    <option value="MCQ">MCQ</option>
                    <option value="MULTI_SELECT">Multi</option>
                    <option value="SHORT_ANSWER">Short</option>
                    <option value="LONG_ANSWER">Long</option>
                    <option value="IMAGE_UPLOAD">Upload</option>
                  </select>
                </div>

                <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {loadingBank ? (
                    <div style={{ textAlign: "center", padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      Loading question bank...
                    </div>
                  ) : bankQuestions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      No questions found. Try removing search filters.
                    </div>
                  ) : (
                    bankQuestions.map(q => {
                      const isAdded = selectedQuestions.some(sq => sq.question.id === q.id);
                      return (
                        <div
                          key={q.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0.5rem 0.75rem",
                            borderRadius: "6px",
                            background: isAdded ? "rgba(99, 102, 241, 0.15)" : "rgba(30, 41, 59, 0.4)",
                            border: isAdded ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid var(--border-color)",
                            gap: "0.5rem"
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.825rem", color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {q.question_text}
                            </div>
                            <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.2rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                              <TypeBadge type={q.question_type} />
                              <span>{q.marks} Marks</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleManualQuestion(q)}
                            className={`btn btn-sm ${isAdded ? "btn-secondary" : "btn-primary"}`}
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                          >
                            {isAdded ? "Remove" : "+ Add"}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: DOCUMENT / FILE EXTRACTOR (EXCEL / WORD / PDF / CSV / PASTE) */}
            {activeTab === "extractor" && (
              <div style={{ marginBottom: "1rem" }}>
                <DocumentQuestionExtractor
                  currentSubject={subject}
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
                  Selected Questions
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)" }}>
                  {selectedQuestions.length} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>Items</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>
                  Calculated Total Marks
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#34d399" }}>
                  {totalMarks} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>Marks</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>
                  Passing Threshold (40%)
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#60a5fa" }}>
                  {passingMarks} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" }}>Marks</span>
                </div>
              </div>
            </div>

            {/* Selected Questions Blueprint Pool */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
                  Exam Paper Composition ({selectedQuestions.length} Questions)
                </span>
                {selectedQuestions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedQuestions([])}
                    style={{ background: "transparent", border: "none", color: "#fda4af", fontSize: "0.75rem", cursor: "pointer" }}
                  >
                    Clear All
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
                    No Questions in Blueprint Yet
                  </div>
                  <p style={{ fontSize: "0.825rem", maxWidth: "340px", margin: "0 auto" }}>
                    Click <strong>"Generate Random Questions"</strong> above to auto-select balanced questions from your institution's bank.
                  </p>
                </div>
              ) : (
                selectedQuestions.map((sq, index) => (
                  <div
                    key={`${sq.question.id}-${index}`}
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
                          Q#{index + 1}
                        </span>
                        <TypeBadge type={sq.question.question_type} />
                        <DifficultyBadge difficulty={sq.question.difficulty} />
                        <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                          {sq.question.subject}
                        </span>
                      </div>

                      {/* Right controls: Marks Input, Re-roll button, and Delete button */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>Marks:</span>
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
                          title="Re-roll this question with another random question from pool"
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
                          title="Remove from exam"
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
                      {sq.question.question_text}
                    </p>

                    {/* MCQ Options Display */}
                    {(sq.question.question_type === "MCQ" || sq.question.question_type === "MULTI_SELECT") && (sq.question.options || []).length > 0 && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.35rem", marginTop: "0.35rem" }}>
                        {sq.question.options.map((opt, optIdx) => {
                          const tag = String.fromCharCode(65 + optIdx);
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
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.option_text}</span>
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
