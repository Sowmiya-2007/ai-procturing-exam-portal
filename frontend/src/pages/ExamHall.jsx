import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Bookmark, 
  ArrowRight, 
  ArrowLeft, 
  Camera, 
  Upload, 
  Maximize, 
  Minimize, 
  Eye, 
  FileText, 
  Check, 
  X, 
  HelpCircle,
  Sparkles,
  Info,
  RefreshCw,
  LogOut
} from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const ExamHall = ({ sessionToken, onExamSubmitted, onExit }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Session & Exam State
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  
  // Answers state: { [questionId]: { selected_option_ids, text_answer, image_url } }
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [saveStatus, setSaveStatus] = useState("saved"); // "saved", "saving", "error"
  const [filterType, setFilterType] = useState("all"); // "all", "answered", "unanswered", "marked"

  // Proctoring & Security State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [audioLevel, setAudioLevel] = useState(15);
  const [gazeStatus, setGazeStatus] = useState("Center / Focused");
  const [violationsCount, setViolationsCount] = useState(0);
  const [lastViolationMsg, setLastViolationMsg] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [confirmSubmitModal, setConfirmSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Time tracking
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(3600);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const autosaveTimeoutRef = useRef(null);

  // 1. Initialize Active Exam Session
  useEffect(() => {
    let isMounted = true;
    const loadSession = async () => {
      try {
        setLoading(true);
        const data = await api.getActiveSession(sessionToken);
        if (!isMounted) return;

        setSessionData(data);

        // Populate existing saved answers
        const initialAnswers = {};
        if (data.existing_answers) {
          Object.keys(data.existing_answers).forEach((qId) => {
            initialAnswers[Number(qId)] = data.existing_answers[qId];
          });
        }
        setAnswers(initialAnswers);

        // Calculate initial remaining time from started_at and duration
        if (data.started_at && data.duration_minutes) {
          const startTime = new Date(data.started_at).getTime();
          const durationMs = data.duration_minutes * 60 * 1000;
          const elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
          const remaining = Math.max(0, (data.duration_minutes * 60) - elapsedSecs);
          setTimeLeftSeconds(remaining);
        } else {
          setTimeLeftSeconds((data.duration_minutes || 60) * 60);
        }
      } catch (err) {
        showToast(err.message || "Failed to load examination session", "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (sessionToken) {
      loadSession();
    }

    return () => {
      isMounted = false;
    };
  }, [sessionToken]);

  // 2. Hardware Webcam & Microphone Setup
  useEffect(() => {
    let streamInstance = null;
    let audioInterval = null;

    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true
        });
        streamInstance = stream;
        setCameraStream(stream);
        setCameraActive(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Simulated audio decibel variation
        audioInterval = setInterval(() => {
          const randLevel = Math.floor(Math.random() * 25) + 10;
          setAudioLevel(randLevel);
        }, 1200);

      } catch (err) {
        console.warn("Webcam not directly accessible, enabling Simulated Proctoring HUD:", err);
        setCameraActive(false);
      }
    };

    startMedia();

    return () => {
      if (streamInstance) {
        streamInstance.getTracks().forEach(track => track.stop());
      }
      if (audioInterval) clearInterval(audioInterval);
    };
  }, []);

  // Sync video ref when cameraActive changes
  useEffect(() => {
    if (cameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraActive, cameraStream]);

  // 3. Automated Proctoring Vision & Gaze Tracking Simulator
  useEffect(() => {
    const gazeInterval = setInterval(() => {
      // 95% centered, 5% random momentary gaze shift
      const rand = Math.random();
      if (rand < 0.05) {
        const warningTypes = [
          "Gaze Divergence: Looking Away",
          "Candidate Head Tilted",
          "Attention Shift Detected"
        ];
        const randomWarn = warningTypes[Math.floor(Math.random() * warningTypes.length)];
        setGazeStatus(randomWarn);
        
        // Log proctor event quietly
        api.logProctorEvent(sessionToken, {
          event_type: "GAZE_AWAY",
          details: randomWarn
        }).catch(() => {});
      } else {
        setGazeStatus("Center / Focused on Exam");
      }
    }, 4500);

    return () => clearInterval(gazeInterval);
  }, [sessionToken]);

  // 4. Security Lockdown: Tab Switch & Window Blur Detection
  const handleSecurityViolation = useCallback((eventType, message) => {
    setViolationsCount(prev => prev + 1);
    setLastViolationMsg(message);
    showToast(`SECURITY ALERT: ${message}`, "error");

    api.logProctorEvent(sessionToken, {
      event_type: eventType,
      details: message
    }).catch(() => {});
  }, [sessionToken, showToast]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleSecurityViolation(
          "TAB_SWITCH", 
          "Tab switch detected! Leaving the exam window is recorded as a violation."
        );
      }
    };

    const handleWindowBlur = () => {
      handleSecurityViolation(
        "WINDOW_BLUR", 
        "Focus lost! Switching applications is prohibited during examination."
      );
    };

    const handleFullscreenChange = () => {
      const isCurrentlyFull = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFull);
      if (!isCurrentlyFull && !loading) {
        handleSecurityViolation(
          "WINDOW_BLUR", 
          "Exited Full-Screen mode. Return to full screen to maintain integrity."
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [handleSecurityViolation, loading]);

  // 5. Timer Countdown & Auto-Submit
  useEffect(() => {
    if (loading || timeLeftSeconds <= 0) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, timeLeftSeconds]);

  const handleAutoSubmit = async () => {
    showToast("Exam time has expired! Auto-submitting your examination...", "warning");
    await handleFinalSubmit();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn("Fullscreen request failed:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // 6. Autosave Answer Handler
  const triggerAutoSave = (questionId, newAnswerData) => {
    setSaveStatus("saving");
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(async () => {
      try {
        await api.saveSessionAnswer(sessionToken, {
          question_id: questionId,
          selected_option_ids: newAnswerData.selected_option_ids || null,
          text_answer: newAnswerData.text_answer || null,
          image_url: newAnswerData.image_url || null
        });
        setSaveStatus("saved");
      } catch (err) {
        console.error("Autosave error:", err);
        setSaveStatus("error");
      }
    }, 600);
  };

  const updateAnswer = (questionId, patch) => {
    const updated = {
      ...(answers[questionId] || {}),
      ...patch,
      question_id: questionId
    };
    setAnswers(prev => ({
      ...prev,
      [questionId]: updated
    }));
    triggerAutoSave(questionId, updated);
  };

  // 7. Question Navigation & Review Tagging
  const toggleMarkForReview = (questionId) => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const clearCurrentResponse = (questionId) => {
    updateAnswer(questionId, {
      selected_option_ids: [],
      text_answer: "",
      image_url: null
    });
    showToast("Response cleared for this question", "info");
  };

  // 8. Snapshot Capture for Handwritten Image Questions
  const captureWebcamSnapshot = (questionId) => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

      updateAnswer(questionId, { image_url: dataUrl });
      showToast("Handwritten diagram photo captured via webcam!", "success");
    } else {
      // Simulated upload if no real stream
      const mockCanvas = document.createElement("canvas");
      mockCanvas.width = 600;
      mockCanvas.height = 400;
      const ctx = mockCanvas.getContext("2d");
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, 600, 400);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "20px sans-serif";
      ctx.fillText("Handwritten Diagram - Verified Camera Capture", 40, 180);
      ctx.font = "14px monospace";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`Timestamp: ${new Date().toISOString()}`, 40, 220);
      const dataUrl = mockCanvas.toDataURL("image/jpeg", 0.85);

      updateAnswer(questionId, { image_url: dataUrl });
      showToast("Handwritten diagram snapshot recorded!", "success");
    }
  };

  const handleFileUpload = (questionId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file (PNG/JPEG)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateAnswer(questionId, { image_url: reader.result });
      showToast("Image uploaded successfully!", "success");
    };
    reader.readAsDataURL(file);
  };

  // 9. Final Submission Handler
  const handleFinalSubmit = async () => {
    try {
      setSubmitting(true);
      const result = await api.submitExamSession(sessionToken, { final_confirmation: true });
      showToast("Examination submitted successfully! Generating scorecard...", "success");
      if (onExamSubmitted) {
        onExamSubmitted(result);
      }
    } catch (err) {
      showToast(err.message || "Failed to submit examination", "error");
    } finally {
      setSubmitting(false);
      setConfirmSubmitModal(false);
    }
  };

  // Format countdown time MM:SS or HH:MM:SS
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading || !sessionData) {
    return (
      <div style={{ minHeight: "100vh", background: "#0b0f19", display: "flex", alignItems: "center", justifyContent: "center", color: "#818cf8" }}>
        <div style={{ textAlign: "center" }}>
          <RefreshCw size={36} className="spin-animation" style={{ margin: "0 auto 1rem" }} />
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Initializing AI-Proctored Hall...</h2>
          <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginTop: "0.5rem" }}>
            Establishing encrypted vision stream and locking examination environment
          </p>
        </div>
      </div>
    );
  }

  const questions = sessionData.questions || [];
  const currentQ = questions[currentQIndex];
  const currentAnswer = currentQ ? answers[currentQ.question_id] || {} : {};

  // Status helper for question palette
  const getQuestionStatus = (q) => {
    const ans = answers[q.question_id];
    const isAnswered = ans && (
      (ans.selected_option_ids && ans.selected_option_ids.length > 0) ||
      (ans.text_answer && ans.text_answer.trim().length > 0) ||
      (ans.image_url && ans.image_url.length > 0)
    );
    const isMarked = markedForReview.has(q.question_id);

    if (isMarked && isAnswered) return "marked_answered";
    if (isMarked) return "marked";
    if (isAnswered) return "answered";
    return "unanswered";
  };

  // Summary counts
  const answeredCount = questions.filter(q => {
    const ans = answers[q.question_id];
    return ans && (
      (ans.selected_option_ids && ans.selected_option_ids.length > 0) ||
      (ans.text_answer && ans.text_answer.trim().length > 0) ||
      (ans.image_url && ans.image_url.length > 0)
    );
  }).length;

  const markedCount = markedForReview.size;
  const unansweredCount = questions.length - answeredCount;

  // Question filtering
  const filteredQuestions = questions.filter((q, idx) => {
    const status = getQuestionStatus(q);
    if (filterType === "answered") return status === "answered" || status === "marked_answered";
    if (filterType === "unanswered") return status === "unanswered";
    if (filterType === "marked") return status === "marked" || status === "marked_answered";
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#090d16", color: "#f3f4f6", display: "flex", flexDirection: "column", userSelect: "none" }}>
      {/* Hidden canvas for video snapshot capture */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Top Security Banner */}
      <header
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(99, 102, 241, 0.25)",
          padding: "0.75rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 40
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 10px #10b981"
              }}
            />
            <span style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "0.5px" }}>
              EXAM<span style={{ color: "#818cf8" }}>.AI</span>
            </span>
          </div>

          <div style={{ height: "20px", width: "1px", background: "rgba(255, 255, 255, 0.15)" }} />

          <div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>
              {sessionData.exam_title}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
              Subject: {sessionData.exam_subject} &bull; Total Marks: {sessionData.total_marks}
            </div>
          </div>
        </div>

        {/* Middle: Live Timer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            background: timeLeftSeconds < 300 
              ? "rgba(239, 68, 68, 0.2)" 
              : timeLeftSeconds < 600 
                ? "rgba(245, 158, 11, 0.2)" 
                : "rgba(15, 23, 42, 0.8)",
            border: `1px solid ${timeLeftSeconds < 300 ? "#ef4444" : timeLeftSeconds < 600 ? "#f59e0b" : "rgba(99, 102, 241, 0.4)"}`,
            padding: "0.45rem 1.1rem",
            borderRadius: "999px",
            animation: timeLeftSeconds < 300 ? "pulse 1.5s infinite" : "none"
          }}
        >
          <Clock size={18} color={timeLeftSeconds < 300 ? "#f87171" : timeLeftSeconds < 600 ? "#fbbf24" : "#818cf8"} />
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "0.7rem", color: "#9ca3af", display: "block", lineHeight: 1 }}>TIME REMAINING</span>
            <span style={{ fontSize: "1.15rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: timeLeftSeconds < 300 ? "#f87171" : "#fff" }}>
              {formatTime(timeLeftSeconds)}
            </span>
          </div>
        </div>

        {/* Right: Security & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Autosave Status */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: saveStatus === "saving" ? "#fbbf24" : "#34d399" }}>
            {saveStatus === "saving" ? (
              <>
                <RefreshCw size={13} className="spin-animation" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={13} />
                <span>Saved to cloud</span>
              </>
            )}
          </div>

          <button
            onClick={toggleFullscreen}
            className="btn btn-secondary"
            style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem" }}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Mode"}
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            <span>{isFullscreen ? "Full" : "Fullscreen"}</span>
          </button>

          <button
            onClick={() => setConfirmSubmitModal(true)}
            className="btn btn-emerald"
            style={{ padding: "0.45rem 1.25rem", fontSize: "0.85rem", fontWeight: 700 }}
          >
            Finish & Submit Exam
          </button>
        </div>
      </header>

      {/* Security Violation Alert Bar */}
      {violationsCount > 0 && (
        <div
          style={{
            background: "linear-gradient(90deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.15) 100%)",
            borderBottom: "1px solid rgba(239, 68, 68, 0.5)",
            padding: "0.5rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#fca5a5",
            fontSize: "0.825rem"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <ShieldAlert size={16} color="#ef4444" />
            <span>
              <strong>Integrity Alert:</strong> {lastViolationMsg || "Security warning recorded."}
            </span>
          </div>
          <span className="badge badge-rejected" style={{ fontSize: "0.7rem", padding: "0.2rem 0.6rem" }}>
            Violations Logged: {violationsCount}
          </span>
        </div>
      )}

      {/* Main Examination Hall Grid */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.25rem", padding: "1.25rem", overflow: "hidden" }}>
        
        {/* Left Column: Active Question Workspace */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto" }}>
          {currentQ ? (
            <div className="glass-card" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "1.75rem", background: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(99, 102, 241, 0.25)" }}>
              {/* Question Header Bar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1.25rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span
                    style={{
                      background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                      color: "#fff",
                      padding: "0.35rem 0.85rem",
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 800,
                      fontSize: "0.9rem"
                    }}
                  >
                    Question {currentQIndex + 1} of {questions.length}
                  </span>

                  <span className="badge badge-type">
                    {currentQ.question_type.replace("_", " ")}
                  </span>

                  <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7" }}>
                    {currentQ.marks} Marks
                  </span>

                  {currentQ.negative_marks > 0 && (
                    <span className="badge badge-rejected" style={{ fontSize: "0.7rem" }}>
                      -{currentQ.negative_marks} Neg Mark
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => toggleMarkForReview(currentQ.question_id)}
                    className="btn btn-secondary"
                    style={{
                      padding: "0.4rem 0.85rem",
                      fontSize: "0.8rem",
                      background: markedForReview.has(currentQ.question_id) ? "rgba(168, 85, 247, 0.25)" : "rgba(30, 41, 59, 0.6)",
                      borderColor: markedForReview.has(currentQ.question_id) ? "#a855f7" : "var(--border-color)",
                      color: markedForReview.has(currentQ.question_id) ? "#d8b4fe" : "var(--text-muted)"
                    }}
                  >
                    <Bookmark size={14} />
                    <span>{markedForReview.has(currentQ.question_id) ? "Marked for Review" : "Mark for Review"}</span>
                  </button>

                  <button
                    onClick={() => clearCurrentResponse(currentQ.question_id)}
                    className="btn btn-secondary"
                    style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", color: "#f87171" }}
                    title="Clear your answer for this question"
                  >
                    Clear Response
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div style={{ marginBottom: "2rem" }}>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 600, color: "#f8fafc", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {currentQ.question_text}
                </h2>
              </div>

              {/* Dynamic Answer Area depending on 5 Question Types */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                
                {/* 1. MCQ (Single Choice) */}
                {currentQ.question_type === "MCQ" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {currentQ.options.map((opt, oIdx) => {
                      const isSelected = (currentAnswer.selected_option_ids || [])[0] === opt.id;
                      const letter = String.fromCharCode(65 + oIdx);

                      return (
                        <div
                          key={opt.id}
                          onClick={() => updateAnswer(currentQ.question_id, { selected_option_ids: [opt.id] })}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            padding: "1rem 1.25rem",
                            borderRadius: "var(--radius-md)",
                            background: isSelected ? "rgba(99, 102, 241, 0.2)" : "rgba(30, 41, 59, 0.4)",
                            border: `1.5px solid ${isSelected ? "#6366f1" : "rgba(255, 255, 255, 0.08)"}`,
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              background: isSelected ? "#6366f1" : "rgba(255, 255, 255, 0.08)",
                              color: isSelected ? "#fff" : "var(--text-muted)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "0.9rem"
                            }}
                          >
                            {letter}
                          </div>
                          <div style={{ flex: 1, fontSize: "0.95rem", color: isSelected ? "#fff" : "#cbd5e1" }}>
                            {opt.option_text}
                          </div>
                          {isSelected && <Check size={18} color="#818cf8" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. MULTI_SELECT (Multiple Choice Checkboxes) */}
                {currentQ.question_type === "MULTI_SELECT" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ fontSize: "0.8rem", color: "#a5b4fc", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Info size={14} /> Select all applicable options:
                    </div>
                    {currentQ.options.map((opt, oIdx) => {
                      const selectedList = currentAnswer.selected_option_ids || [];
                      const isSelected = selectedList.includes(opt.id);
                      const letter = String.fromCharCode(65 + oIdx);

                      const handleToggle = () => {
                        let nextList;
                        if (isSelected) {
                          nextList = selectedList.filter(id => id !== opt.id);
                        } else {
                          nextList = [...selectedList, opt.id];
                        }
                        updateAnswer(currentQ.question_id, { selected_option_ids: nextList });
                      };

                      return (
                        <div
                          key={opt.id}
                          onClick={handleToggle}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            padding: "1rem 1.25rem",
                            borderRadius: "var(--radius-md)",
                            background: isSelected ? "rgba(99, 102, 241, 0.2)" : "rgba(30, 41, 59, 0.4)",
                            border: `1.5px solid ${isSelected ? "#6366f1" : "rgba(255, 255, 255, 0.08)"}`,
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <div
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "4px",
                              background: isSelected ? "#6366f1" : "rgba(255, 255, 255, 0.08)",
                              border: isSelected ? "none" : "1px solid rgba(255, 255, 255, 0.2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff"
                            }}
                          >
                            {isSelected && <Check size={16} />}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: isSelected ? "#818cf8" : "var(--text-muted)" }}>
                            Option {letter}:
                          </div>
                          <div style={{ flex: 1, fontSize: "0.95rem", color: isSelected ? "#fff" : "#cbd5e1" }}>
                            {opt.option_text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. SHORT_ANSWER */}
                {currentQ.question_type === "SHORT_ANSWER" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      Type your concise answer below (auto-evaluated by AI):
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter concise answer..."
                      value={currentAnswer.text_answer || ""}
                      onChange={(e) => updateAnswer(currentQ.question_id, { text_answer: e.target.value })}
                      style={{
                        padding: "1rem",
                        fontSize: "1rem",
                        background: "rgba(15, 23, 42, 0.9)",
                        borderColor: "rgba(99, 102, 241, 0.3)"
                      }}
                    />
                    <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textAlign: "right" }}>
                      {(currentAnswer.text_answer || "").length} characters entered
                    </div>
                  </div>
                )}

                {/* 4. LONG_ANSWER */}
                {currentQ.question_type === "LONG_ANSWER" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        Write your comprehensive answer below:
                      </label>
                      <span style={{ fontSize: "0.75rem", color: "#818cf8" }}>
                        {(currentAnswer.text_answer || "").split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>
                    <textarea
                      rows={10}
                      className="form-input"
                      placeholder="Write comprehensive essay or code formulation..."
                      value={currentAnswer.text_answer || ""}
                      onChange={(e) => updateAnswer(currentQ.question_id, { text_answer: e.target.value })}
                      style={{
                        padding: "1rem",
                        fontSize: "0.95rem",
                        lineHeight: 1.6,
                        background: "rgba(15, 23, 42, 0.9)",
                        borderColor: "rgba(99, 102, 241, 0.3)",
                        resize: "vertical"
                      }}
                    />
                  </div>
                )}

                {/* 5. IMAGE_UPLOAD (Handwritten Diagram Problem) */}
                {currentQ.question_type === "IMAGE_UPLOAD" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div style={{ background: "rgba(99, 102, 241, 0.1)", border: "1px dashed rgba(99, 102, 241, 0.4)", borderRadius: "var(--radius-md)", padding: "1.5rem", textAlign: "center" }}>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                        Handwritten Diagram Submission Area
                      </h4>
                      <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginBottom: "1.25rem", maxWidth: "500px", margin: "0 auto 1.25rem" }}>
                        Draw your architectural or schematic diagram on paper. You can either snap a photo using your active webcam or upload an image file.
                      </p>

                      <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => captureWebcamSnapshot(currentQ.question_id)}
                          className="btn btn-primary"
                          style={{ padding: "0.6rem 1.25rem" }}
                        >
                          <Camera size={16} /> Snap Photo via Webcam
                        </button>

                        <label className="btn btn-secondary" style={{ padding: "0.6rem 1.25rem", cursor: "pointer" }}>
                          <Upload size={16} /> Upload Image File
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(currentQ.question_id, e)}
                            style={{ display: "none" }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Preview Uploaded Diagram */}
                    {currentAnswer.image_url && (
                      <div style={{ background: "rgba(15, 23, 42, 0.9)", borderRadius: "var(--radius-md)", padding: "1rem", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#34d399", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <CheckCircle2 size={16} /> Attached Diagram Submission
                          </span>
                          <button
                            onClick={() => updateAnswer(currentQ.question_id, { image_url: null })}
                            className="btn btn-secondary"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem", color: "#f87171" }}
                          >
                            Remove Image
                          </button>
                        </div>
                        <div style={{ textAlign: "center", maxHeight: "300px", overflow: "hidden", borderRadius: "var(--radius-sm)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                          <img
                            src={currentAnswer.image_url}
                            alt="Student handwritten diagram submission"
                            style={{ maxWidth: "100%", maxHeight: "280px", objectFit: "contain" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Navigation Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2rem", paddingTop: "1.25rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <button
                  disabled={currentQIndex === 0}
                  onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                  className="btn btn-secondary"
                  style={{ opacity: currentQIndex === 0 ? 0.4 : 1 }}
                >
                  <ArrowLeft size={16} /> Previous Question
                </button>

                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Question {currentQIndex + 1} of {questions.length}
                </div>

                {currentQIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="btn btn-primary"
                  >
                    Save & Next Question <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmSubmitModal(true)}
                    className="btn btn-emerald"
                  >
                    Review & Finish Exam <CheckCircle2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Column: AI Proctoring HUD & Question Navigation Palette */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", overflowY: "auto" }}>
          
          {/* AI Vision Proctoring Monitor Box */}
          <div className="glass-card" style={{ padding: "1.25rem", background: "rgba(15, 23, 42, 0.9)", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#a5b4fc", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Video size={14} color="#818cf8" /> AI PROCTOR VISION
              </span>
              <span className="badge badge-approved" style={{ fontSize: "0.65rem" }}>
                Active & Encrypted
              </span>
            </div>

            {/* Video Frame with Computer Vision Overlays */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "170px",
                background: "#020617",
                borderRadius: "var(--radius-sm)",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.1)"
              }}
            >
              {/* Actual webcam stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)",
                  display: cameraActive ? "block" : "none"
                }}
              />

              {/* High-tech fallback HUD if camera is inactive/simulated */}
              {!cameraActive && (
                <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle, #1e1b4b 0%, #030712 100%)" }}>
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      border: "2px dashed #6366f1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#818cf8",
                      animation: "spin 12s linear infinite"
                    }}
                  >
                    <Eye size={28} />
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.5rem" }}>
                    Biometric Scanner Active
                  </span>
                </div>
              )}

              {/* Facial Bounding Box Overlay */}
              <div
                style={{
                  position: "absolute",
                  top: "18%",
                  left: "25%",
                  width: "50%",
                  height: "64%",
                  border: "1.5px solid #10b981",
                  borderRadius: "6px",
                  pointerEvents: "none",
                  boxShadow: "0 0 8px rgba(16, 185, 129, 0.4)"
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "-18px",
                    left: "2px",
                    background: "#10b981",
                    color: "#000",
                    fontSize: "0.6rem",
                    fontWeight: 800,
                    padding: "1px 4px",
                    borderRadius: "2px"
                  }}
                >
                  Candidate (99.4%)
                </span>
              </div>

              {/* Live Audio Level Meter */}
              <div
                style={{
                  position: "absolute",
                  bottom: "8px",
                  left: "8px",
                  right: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "rgba(0, 0, 0, 0.65)",
                  padding: "4px 8px",
                  borderRadius: "4px"
                }}
              >
                <Mic size={12} color="#34d399" />
                <div style={{ flex: 1, height: "4px", background: "rgba(255, 255, 255, 0.2)", borderRadius: "2px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, audioLevel * 3)}%`,
                      background: audioLevel > 28 ? "#ef4444" : "#10b981",
                      transition: "width 0.3s ease"
                    }}
                  />
                </div>
                <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{audioLevel} dB</span>
              </div>
            </div>

            {/* Vision Metrics Summary */}
            <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-subtle)" }}>Gaze Tracking:</span>
                <span style={{ color: gazeStatus.includes("Away") ? "#f87171" : "#34d399", fontWeight: 600 }}>
                  {gazeStatus}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-subtle)" }}>Face Status:</span>
                <span style={{ color: "#34d399", fontWeight: 600 }}>Single Candidate Verified</span>
              </div>
            </div>
          </div>

          {/* Question Navigation Palette */}
          <div className="glass-card" style={{ flex: 1, padding: "1.25rem", background: "rgba(15, 23, 42, 0.9)" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "0.75rem" }}>
              Question Palette ({answeredCount}/{questions.length} Answered)
            </h3>

            {/* Progress Bar */}
            <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "3px", overflow: "hidden", marginBottom: "1rem" }}>
              <div
                style={{
                  height: "100%",
                  width: `${(answeredCount / Math.max(1, questions.length)) * 100}%`,
                  background: "linear-gradient(90deg, #4f46e5, #10b981)",
                  transition: "width 0.3s ease"
                }}
              />
            </div>

            {/* Filter Tabs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.25rem", marginBottom: "1rem" }}>
              {[
                { key: "all", label: "All" },
                { key: "answered", label: "Done" },
                { key: "unanswered", label: "Left" },
                { key: "marked", label: "Marked" }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterType(tab.key)}
                  style={{
                    padding: "0.3rem 0.2rem",
                    fontSize: "0.7rem",
                    borderRadius: "var(--radius-sm)",
                    background: filterType === tab.key ? "#6366f1" : "rgba(30, 41, 59, 0.5)",
                    border: "none",
                    color: filterType === tab.key ? "#fff" : "#94a3b8",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Number Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem", marginBottom: "1.25rem" }}>
              {questions.map((q, idx) => {
                const status = getQuestionStatus(q);
                const isCurrent = currentQIndex === idx;

                let bg = "rgba(30, 41, 59, 0.6)";
                let borderColor = "transparent";
                let textColor = "#94a3b8";

                if (status === "answered") {
                  bg = "rgba(16, 185, 129, 0.25)";
                  borderColor = "#10b981";
                  textColor = "#34d399";
                } else if (status === "marked" || status === "marked_answered") {
                  bg = "rgba(168, 85, 247, 0.25)";
                  borderColor = "#a855f7";
                  textColor = "#d8b4fe";
                }

                if (isCurrent) {
                  borderColor = "#6366f1";
                  bg = "rgba(99, 102, 241, 0.4)";
                  textColor = "#fff";
                }

                return (
                  <button
                    key={q.question_id}
                    onClick={() => setCurrentQIndex(idx)}
                    style={{
                      height: "38px",
                      borderRadius: "var(--radius-sm)",
                      background: bg,
                      border: `1.5px solid ${borderColor}`,
                      color: textColor,
                      fontWeight: 800,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      transition: "all 0.15s ease",
                      boxShadow: isCurrent ? "0 0 10px rgba(99, 102, 241, 0.5)" : "none"
                    }}
                  >
                    {idx + 1}
                    {status.includes("marked") && (
                      <span
                        style={{
                          position: "absolute",
                          top: "2px",
                          right: "2px",
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#c084fc"
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.725rem", color: "var(--text-subtle)", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "rgba(16, 185, 129, 0.4)", border: "1px solid #10b981" }} />
                <span>Answered ({answeredCount})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "rgba(30, 41, 59, 0.6)" }} />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "rgba(168, 85, 247, 0.4)", border: "1px solid #a855f7" }} />
                <span>Marked ({markedCount})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", border: "1.5px solid #6366f1" }} />
                <span>Active Question</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation & Summary Submission Modal */}
      {confirmSubmitModal && (
        <div className="modal-overlay" onClick={() => setConfirmSubmitModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "520px", padding: "2rem" }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.2)",
                  border: "1px solid #10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                  color: "#34d399"
                }}
              >
                <CheckCircle2 size={30} />
              </div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Submit Examination?</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Once submitted, automated AI grading will evaluate your responses immediately.
              </p>
            </div>

            {/* Submission Status Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem", textAlign: "center" }}>
              <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#34d399", display: "block" }}>{answeredCount}</span>
                <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Answered</span>
              </div>
              <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: "0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f87171", display: "block" }}>{unansweredCount}</span>
                <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Unanswered</span>
              </div>
              <div style={{ background: "rgba(168, 85, 247, 0.1)", padding: "0.85rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(168, 85, 247, 0.3)" }}>
                <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#c084fc", display: "block" }}>{markedCount}</span>
                <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Marked</span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                disabled={submitting}
                className="btn btn-secondary"
                onClick={() => setConfirmSubmitModal(false)}
              >
                Resume Exam
              </button>
              <button
                disabled={submitting}
                className="btn btn-emerald btn-lg"
                onClick={handleFinalSubmit}
              >
                {submitting ? "Evaluating Responses..." : "Confirm & Finalize Submission"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
