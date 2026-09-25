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
  LogOut,
  AlertCircle,
  ScanFace
} from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useLanguage } from "../context/LanguageContext";
import { initFaceLandmarker, analyzeVideoFrame, createAudioMonitor } from "../services/proctorVision";
import { translateContent, getLocalizedOptionLabel, formatQuestionNumLabel } from "../services/translator";
import { LanguageSelector } from "../components/LanguageSelector";

export const ExamHall = ({ sessionToken, onExamSubmitted, onExit }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { language, t } = useLanguage();

  // Lifecycle & Session State
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // Answers State: { [questionId]: { selected_option_ids, text_answer, image_url } }
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [saveStatus, setSaveStatus] = useState("saved"); // "saved", "saving", "error"

  // Real Camera Hardware State
  const [cameraStatus, setCameraStatus] = useState("CAMERA_STARTING"); // "CAMERA_STARTING", "CAMERA_ACTIVE", "CAMERA_NO_VIDEO", "CAMERA_PERMISSION_DENIED", "CAMERA_ERROR", "CAMERA_STOPPED"
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [videoDims, setVideoDims] = useState({ w: 0, h: 0 });
  const [videoReadyState, setVideoReadyState] = useState(0);
  const [videoTrackLive, setVideoTrackLive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Real AI Vision Engine State
  const [aiModelLoaded, setAiModelLoaded] = useState(false);
  const [modelError, setModelError] = useState(null);
  const [framesProcessed, setFramesProcessed] = useState(0);
  const [lastDetectionTime, setLastDetectionTime] = useState(null);

  // Strictly Data-Driven Telemetry State (NO hardcoded fake defaults!)
  const [stableFaceCount, setStableFaceCount] = useState(null); // null = "Checking...", 0 = Absent, 1 = Single, 2+ = Multiple
  const [stableFaceBox, setStableFaceBox] = useState(null);
  const [stableGazeStatus, setStableGazeStatus] = useState("UNKNOWN");
  const [stableHeadStatus, setStableHeadStatus] = useState("UNKNOWN");
  const [isFaceAbsent, setIsFaceAbsent] = useState(true);
  const [isMultipleFaces, setIsMultipleFaces] = useState(false);
  const [isGazeAway, setIsGazeAway] = useState(false);

  // Fullscreen Lockdown State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(null);

  // Violation Alert Tracking
  const [violationsCount, setViolationsCount] = useState(0);
  const [lastViolationMsg, setLastViolationMsg] = useState("");
  const [confirmSubmitModal, setConfirmSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Time tracking
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(3600);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const audioMonitorRef = useRef(null);
  const autosaveTimeoutRef = useRef(null);
  const inferenceFrameIdRef = useRef(null);
  const lastInferenceTimeRef = useRef(0);

  // State Machine Temporal Confirmation Frame Counters
  const consecutiveNormalFramesRef = useRef(0);
  const consecutiveAbsentFramesRef = useRef(0);
  const consecutiveMultipleFramesRef = useRef(0);
  const consecutiveGazeAwayFramesRef = useRef(0);

  // Incident & Cooldown Trackers (Prevents event spam)
  const lastAbsentEventTimeRef = useRef(0);
  const lastMultipleEventTimeRef = useRef(0);
  const lastGazeEventTimeRef = useRef(0);
  const fullscreenExitIncidentRef = useRef(false);
  const tabSwitchIncidentRef = useRef(false);
  const lastWindowBlurTimeRef = useRef(0);
  const lastClipboardEventTimeRef = useRef(0);

  // 1. Centralized Proctor Violation Logger
  const logSecurityViolation = useCallback((eventType, message) => {
    setViolationsCount(prev => prev + 1);
    setLastViolationMsg(message);
    const localizedMessage = translateContent(message, language);
    showToast(`SECURITY ALERT: ${localizedMessage}`, "error");

    if (sessionToken) {
      api.logProctorEvent(sessionToken, {
        event_type: eventType,
        details: message
      }).catch(err => {
        console.warn("Failed to log proctor event to server:", err);
      });
    }
  }, [sessionToken, showToast, language]);

  // 2. Initialize Active Exam Session
  useEffect(() => {
    let isMounted = true;
    const loadSession = async () => {
      try {
        setLoading(true);
        const data = await api.getActiveSession(sessionToken);
        if (!isMounted) return;

        setSessionData(data);

        // Populate existing answers and flagged states
        const initialAnswers = {};
        const initialFlags = new Set();
        if (data.existing_answers) {
          Object.keys(data.existing_answers).forEach((qId) => {
            const ansObj = data.existing_answers[qId];
            initialAnswers[Number(qId)] = ansObj;
            if (ansObj.is_flagged) {
              initialFlags.add(Number(qId));
            }
          });
        }
        setAnswers(initialAnswers);
        setMarkedForReview(initialFlags);

        // Calculate initial remaining time from server
        if (data.remaining_seconds !== undefined && data.remaining_seconds !== null) {
          setTimeLeftSeconds(data.remaining_seconds);
        } else if (data.started_at && data.duration_minutes) {
          const startTime = new Date(data.started_at).getTime();
          const durationSecs = data.duration_minutes * 60;
          const elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
          const remaining = Math.max(0, durationSecs - elapsedSecs);
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
  }, [sessionToken, showToast]);

  // 3. Hardware Webcam & Web Audio Initialization
  const initHardware = useCallback(async () => {
    try {
      setCameraStatus("CAMERA_STARTING");
      setCameraError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: true
      });

      console.log("Camera stream:", stream);
      console.log("Video tracks:", stream?.getVideoTracks());

      const videoTracks = stream.getVideoTracks();
      if (!videoTracks || videoTracks.length === 0) {
        setCameraStatus("CAMERA_NO_VIDEO");
        setCameraActive(false);
        setVideoTrackLive(false);
        return null;
      }

      const activeTrack = videoTracks[0];
      setVideoTrackLive(activeTrack.readyState === "live");

      activeTrack.onended = () => {
        console.warn("Webcam video track stopped/disconnected");
        setCameraStatus("CAMERA_STOPPED");
        setCameraActive(false);
        setVideoTrackLive(false);
        setStableFaceCount(0);
        setIsFaceAbsent(true);
      };

      setCameraStream(stream);
      setCameraActive(true);
      setCameraStatus("CAMERA_ACTIVE");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Initialize real Web Audio API level monitor
      if (audioMonitorRef.current) {
        audioMonitorRef.current.stop();
      }
      audioMonitorRef.current = createAudioMonitor(stream, (level) => {
        setAudioLevel(level);
      });

      return stream;
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraActive(false);
      setVideoTrackLive(false);
      let errMsg = "Camera access is required for proctored examination.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraStatus("CAMERA_PERMISSION_DENIED");
        errMsg = "Camera permission was denied. Please allow camera access in browser settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraStatus("CAMERA_NO_VIDEO");
        errMsg = "No camera found. Please connect a webcam.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setCameraStatus("CAMERA_ERROR");
        errMsg = "Camera is currently in use by another application.";
      } else {
        setCameraStatus("CAMERA_ERROR");
      }
      setCameraError(errMsg);
      showToast(errMsg, "error");
      return null;
    }
  }, [showToast]);

  // 4. Load MediaPipe AI Vision Model
  useEffect(() => {
    let isMounted = true;
    const loadVision = async () => {
      try {
        const landmarker = await initFaceLandmarker();
        if (isMounted) {
          landmarkerRef.current = landmarker;
          setAiModelLoaded(true);
          setModelError(null);
        }
      } catch (err) {
        console.error("MediaPipe FaceLandmarker load error:", err);
        if (isMounted) {
          setAiModelLoaded(false);
          setModelError(err.message || "Failed to load MediaPipe vision model");
        }
      }
    };

    loadVision();
    initHardware();

    return () => {
      isMounted = false;
    };
  }, [initHardware]);

  // Reliable Video Attachment Callback Ref
  const attachVideoRef = useCallback((node) => {
    videoRef.current = node;
    if (node && cameraStream) {
      if (node.srcObject !== cameraStream) {
        node.srcObject = cameraStream;
      }
      node.play().catch(() => {});
    }
  }, [cameraStream]);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      if (videoRef.current.srcObject !== cameraStream) {
        videoRef.current.srcObject = cameraStream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStream, loading]);

  // 5. Continuous Real-Time AI Proctoring Inference Loop (with Temporal State Machine)
  useEffect(() => {
    let isMounted = true;

    const runInferenceLoop = () => {
      if (!isMounted) return;

      const now = performance.now();
      // Run inference every ~100ms (10 FPS)
      if (now - lastInferenceTimeRef.current >= 100) {
        lastInferenceTimeRef.current = now;

        const videoEl = videoRef.current;

        // If camera stream is not active or video is not ready:
        if (!cameraActive || !videoEl || !videoEl.srcObject) {
          if (cameraStatus === "CAMERA_ACTIVE") {
            setCameraStatus("CAMERA_STOPPED");
          }
          setVideoReadyState(0);
          setVideoDims({ w: 0, h: 0 });
          setStableFaceCount(0);
          setIsFaceAbsent(true);
          setIsMultipleFaces(false);
          setStableHeadStatus("Not detected");
          setStableGazeStatus("Not detected");
          inferenceFrameIdRef.current = requestAnimationFrame(runInferenceLoop);
          return;
        }

        if (videoEl.paused || videoEl.readyState < 2) {
          videoEl.play().catch(() => {});
        }

        setVideoReadyState(videoEl.readyState);

        // Verify video dimensions and readyState
        if (
          videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          videoEl.videoWidth > 0 &&
          videoEl.videoHeight > 0
        ) {
          if (videoDims.w !== videoEl.videoWidth || videoDims.h !== videoEl.videoHeight) {
            setVideoDims({ w: videoEl.videoWidth, h: videoEl.videoHeight });
          }

          // Real MediaPipe detection on actual video frame
          const analysis = analyzeVideoFrame(videoEl, landmarkerRef.current, now);

          setFramesProcessed(prev => prev + 1);
          setLastDetectionTime(Date.now());

          // ==============================================================
          // STATE MACHINE CONFIRMATION FOR FACE DETECTION
          // ==============================================================

          // Case A: Exactly 1 Face Detected (Normal Candidate State)
          if (analysis.faceCount === 1) {
            consecutiveNormalFramesRef.current++;
            consecutiveAbsentFramesRef.current = 0;
            consecutiveMultipleFramesRef.current = 0;

            if (consecutiveNormalFramesRef.current >= 2) {
              setStableFaceCount(1);
              setIsFaceAbsent(false);
              setIsMultipleFaces(false);
              setStableFaceBox(analysis.faceBoundingBox);
              setStableGazeStatus(analysis.gazeStatus);
              setStableHeadStatus(analysis.headStatus);
            }
          }
          // Case B: 0 Faces Detected (Face Absence Check with 2.0s confirmation)
          else if (analysis.faceCount === 0) {
            consecutiveAbsentFramesRef.current++;
            consecutiveNormalFramesRef.current = 0;
            consecutiveMultipleFramesRef.current = 0;

            // Require 20 consecutive frames (~2.0 seconds sustained) to confirm absence
            if (consecutiveAbsentFramesRef.current >= 20) {
              setStableFaceCount(0);
              setIsFaceAbsent(true);
              setIsMultipleFaces(false);
              setStableFaceBox(null);
              setStableGazeStatus("Not detected");
              setStableHeadStatus("Not detected");

              // Debounced backend incident logging with 15-second cooldown
              if (now - lastAbsentEventTimeRef.current > 15000) {
                lastAbsentEventTimeRef.current = now;
                logSecurityViolation(
                  "FACE_ABSENT",
                  "Face not detected. Candidate must remain continuously visible in front of camera."
                );
              }
            }
          }
          // Case C: 2+ Faces Detected (Multiple Faces Check with 1.5s confirmation)
          else if (analysis.faceCount >= 2) {
            consecutiveMultipleFramesRef.current++;
            consecutiveNormalFramesRef.current = 0;
            consecutiveAbsentFramesRef.current = 0;

            // Require 15 consecutive frames (~1.5 seconds sustained) to confirm multiple people
            if (consecutiveMultipleFramesRef.current >= 15) {
              setStableFaceCount(analysis.faceCount);
              setIsMultipleFaces(true);
              setIsFaceAbsent(false);
              setStableFaceBox(analysis.faceBoundingBox);
              setStableGazeStatus("Multiple Faces");
              setStableHeadStatus("Multiple Faces");

              // Debounced backend incident logging with 15-second cooldown
              if (now - lastMultipleEventTimeRef.current > 15000) {
                lastMultipleEventTimeRef.current = now;
                logSecurityViolation(
                  "MULTIPLE_FACES",
                  `Multiple people (${analysis.faceCount} faces) detected. Only the candidate may be visible.`
                );
              }
            }
          }

          // Case D: Gaze & Head Orientation Check (with 2.5s confirmation)
          if (analysis.faceCount === 1 && analysis.isLookingAway) {
            consecutiveGazeAwayFramesRef.current++;
            if (consecutiveGazeAwayFramesRef.current >= 25) {
              setIsGazeAway(true);
              if (now - lastGazeEventTimeRef.current > 15000) {
                lastGazeEventTimeRef.current = now;
                const evtType = analysis.headPose !== "CENTER" ? "HEAD_TURN" : "GAZE_AWAY";
                const reason = analysis.headPose !== "CENTER" 
                  ? `Head turned (${analysis.headStatus})` 
                  : `Looking away from screen (${analysis.gazeStatus})`;
                logSecurityViolation(
                  evtType,
                  `Warning: ${reason}. Please focus on your examination screen.`
                );
              }
            }
          } else {
            consecutiveGazeAwayFramesRef.current = 0;
            setIsGazeAway(false);
          }
        } else {
          setCameraStatus(cameraActive ? "CAMERA_NO_VIDEO" : "CAMERA_STOPPED");
          setStableFaceCount(0);
          setIsFaceAbsent(true);
          setStableHeadStatus("Not available");
          setStableGazeStatus("Not available");
        }
      }

      inferenceFrameIdRef.current = requestAnimationFrame(runInferenceLoop);
    };

    inferenceFrameIdRef.current = requestAnimationFrame(runInferenceLoop);

    return () => {
      isMounted = false;
      if (inferenceFrameIdRef.current) {
        cancelAnimationFrame(inferenceFrameIdRef.current);
      }
    };
  }, [cameraActive, cameraStatus, logSecurityViolation]);

  // 6. Fullscreen Lockdown & Incident Management
  useEffect(() => {
    // Attempt initial fullscreen request
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    const handleFullscreenChange = () => {
      const isCurrentlyFull = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFull);

      if (!isCurrentlyFull) {
        // Fullscreen was exited (e.g. by pressing ESC or minimizing)
        if (!fullscreenExitIncidentRef.current) {
          fullscreenExitIncidentRef.current = true;
          logSecurityViolation(
            "FULLSCREEN_EXIT",
            "Warning: Full-screen mode was exited. Full-screen mode is required during the examination."
          );
        }
      } else {
        // Fullscreen was restored
        fullscreenExitIncidentRef.current = false;
        setFullscreenError(null);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (!tabSwitchIncidentRef.current) {
          tabSwitchIncidentRef.current = true;
          logSecurityViolation(
            "TAB_SWITCH",
            "Warning: Switching tabs or minimizing browser is not allowed during the exam."
          );
        }
      } else {
        tabSwitchIncidentRef.current = false;
      }
    };

    const handleWindowBlur = () => {
      const now = Date.now();
      if (now - lastWindowBlurTimeRef.current > 4000) {
        lastWindowBlurTimeRef.current = now;
        logSecurityViolation(
          "WINDOW_BLUR",
          "Focus lost! Switching applications is prohibited during examination."
        );
      }
    };

    // Clipboard & Right-Click Security Guards
    const handleCopy = (e) => {
      e.preventDefault();
      showToast(t("exam_hall.tab_switch_alert", null, "Copying exam content is disabled."), "warning");
      const now = Date.now();
      if (now - lastClipboardEventTimeRef.current > 4000) {
        lastClipboardEventTimeRef.current = now;
        logSecurityViolation("COPY_ATTEMPT", "Candidate attempted to copy content from the examination screen.");
      }
    };

    const handlePaste = (e) => {
      e.preventDefault();
      showToast(t("exam_hall.tab_switch_alert", null, "Pasting content into the exam is disabled."), "warning");
      const now = Date.now();
      if (now - lastClipboardEventTimeRef.current > 4000) {
        lastClipboardEventTimeRef.current = now;
        logSecurityViolation("PASTE_ATTEMPT", "Candidate attempted to paste content into examination.");
      }
    };

    const handleCut = (e) => {
      e.preventDefault();
      showToast(t("exam_hall.tab_switch_alert", null, "Cutting content from exam is disabled."), "warning");
      const now = Date.now();
      if (now - lastClipboardEventTimeRef.current > 4000) {
        lastClipboardEventTimeRef.current = now;
        logSecurityViolation("CUT_ATTEMPT", "Candidate attempted to cut content from examination.");
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      showToast(t("exam_hall.tab_switch_alert", null, "Right-click context menu is disabled during examination."), "warning");
      const now = Date.now();
      if (now - lastClipboardEventTimeRef.current > 4000) {
        lastClipboardEventTimeRef.current = now;
        logSecurityViolation("RIGHT_CLICK_ATTEMPT", "Candidate attempted to open browser context menu.");
      }
    };

    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === "c" || k === "v" || k === "x") {
          e.preventDefault();
          showToast(`Ctrl+${k.toUpperCase()} is disabled during examination.`, "warning");
          return;
        }

        if (k === "a") {
          const target = e.target;
          const isInputField = target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT");
          if (!isInputField) {
            e.preventDefault();
            showToast("Select-all on exam questions is disabled.", "warning");
            return;
          }
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [logSecurityViolation, showToast, t]);

  // Request Fullscreen via User Interaction
  const handleEnterFullscreen = async () => {
    setFullscreenError(null);
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request error:", err);
      setFullscreenError("Unable to enter full-screen mode. Please click the button again.");
    }
  };

  // 7. Countdown Timer & Auto-Submit
  useEffect(() => {
    if (loading || timeLeftSeconds <= 0) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
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

  // 8. Autosave Answer Handler
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

  // 9. Question Navigation & Review Tagging
  const toggleMarkForReview = (questionId) => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      const isFlagged = !next.has(questionId);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      
      const curAns = answers[questionId] || {};
      api.saveSessionAnswer(sessionToken, {
        question_id: questionId,
        selected_option_ids: curAns.selected_option_ids || null,
        text_answer: curAns.text_answer || null,
        image_url: curAns.image_url || null,
        is_flagged: isFlagged
      }).catch(err => console.error("Error saving flag status:", err));

      return next;
    });
  };

  const clearCurrentResponse = (questionId) => {
    updateAnswer(questionId, {
      selected_option_ids: [],
      text_answer: "",
      image_url: null
    });
    showToast(t("exam_hall.clear_response", null, "Response cleared for this question"), "info");
  };

  // 10. Snapshot Capture for Handwritten Diagram Questions
  const captureWebcamSnapshot = (questionId) => {
    if (videoRef.current && canvasRef.current && cameraActive) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

      updateAnswer(questionId, { image_url: dataUrl });
      showToast(t("exam_hall.attached_diagram", null, "Handwritten diagram photo captured via webcam!"), "success");
    } else {
      showToast("Live webcam stream is not active. Please click 'Choose File / Upload Diagram' below.", "warning");
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

  // 11. Resource Cleanup
  const cleanupAllResources = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    if (audioMonitorRef.current) {
      audioMonitorRef.current.stop();
    }
    if (inferenceFrameIdRef.current) {
      cancelAnimationFrame(inferenceFrameIdRef.current);
    }
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, [cameraStream]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cleanupAllResources();
    };
  }, [cleanupAllResources]);

  // 12. Final Submission Handler
  const handleFinalSubmit = async () => {
    try {
      setSubmitting(true);
      const result = await api.submitExamSession(sessionToken, { final_confirmation: true });
      cleanupAllResources();
      showToast(t("toast.exam_submitted", null, "Examination submitted successfully! Generating scorecard..."), "success");
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
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>{t("exam_hall.loading_hall", null, "Entering Examination Hall...")}</h2>
          <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginTop: "0.5rem" }}>
            {t("exam_hall.loading_hall_sub", null, "Establishing encrypted vision stream and locking examination environment")}
          </p>
        </div>
      </div>
    );
  }

  // Active Examination Workspace & HUD (Questions Displayed Immediately)
  const questions = sessionData.questions || [];
  const currentQ = questions[currentQIndex];
  const currentAnswer = currentQ ? answers[currentQ.question_id] || {} : {};

  const answeredCount = questions.filter(q => {
    const ans = answers[q.question_id];
    return ans && (
      (ans.selected_option_ids && ans.selected_option_ids.length > 0) ||
      (ans.text_answer && ans.text_answer.trim().length > 0) ||
      (ans.image_url && ans.image_url.length > 0)
    );
  }).length;

  const markedCount = markedForReview.size;

  // Determine Vision Engine Status strictly from actual pipeline
  const isVisionActive = aiModelLoaded && cameraActive && videoDims.w > 0 && framesProcessed > 0;
  const visionStatusLabel = isVisionActive
    ? "● Active (MediaPipe FaceLandmarker)"
    : (modelError ? "✕ Model Error" : (!cameraActive ? "✕ Camera Unavailable" : "● Loading..."));

  // Translated Title & Subject (direct DB multilingual column or dictionary fallback)
  const displayExamTitle = sessionData[`exam_title_${language}`] || translateContent(sessionData.exam_title, language);
  const displayExamSubject = sessionData[`exam_subject_${language}`] || translateContent(sessionData.exam_subject, language);

  return (
    <div style={{ minHeight: "100vh", background: "#090d16", color: "#f3f4f6", display: "flex", flexDirection: "column", userSelect: "none", position: "relative" }}>
      {/* Hidden canvas for video snapshot capture */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* =====================================================================
          PROMINENT FULL-SCREEN MODE REQUIRED MODAL OVERLAY (ON ESC / EXIT)
          ===================================================================== */}
      {!isFullscreen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: "rgba(10, 15, 30, 0.96)",
            backdropFilter: "blur(16px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center"
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: "520px",
              width: "100%",
              padding: "2.75rem",
              background: "rgba(15, 23, 42, 0.95)",
              border: "2px solid #ef4444",
              boxShadow: "0 0 40px rgba(239, 68, 68, 0.35)",
              borderRadius: "var(--radius-lg)"
            }}
          >
            <div
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.15)",
                border: "2px solid #ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
                animation: "pulse 2s infinite"
              }}
            >
              <AlertTriangle size={36} color="#ef4444" />
            </div>

            <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff", marginBottom: "0.75rem" }}>
              {t("exam_hall.fullscreen_modal_title", null, "FULL-SCREEN MODE REQUIRED")}
            </h2>

            <p style={{ fontSize: "0.95rem", color: "#cbd5e1", lineHeight: 1.6, marginBottom: "1.75rem" }}>
              {t("exam_hall.fullscreen_modal_desc", null, "Please return to full-screen mode to continue the examination. The exam workspace and question inputs remain locked while outside full-screen.")}
            </p>

            {fullscreenError && (
              <div style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", padding: "0.6rem 1rem", borderRadius: "6px", color: "#fca5a5", fontSize: "0.825rem", marginBottom: "1.5rem" }}>
                {fullscreenError}
              </div>
            )}

            <button
              onClick={handleEnterFullscreen}
              className="btn btn-emerald btn-lg"
              style={{
                width: "100%",
                padding: "0.95rem 1.75rem",
                fontSize: "1.05rem",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.6rem",
                boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)",
                cursor: "pointer"
              }}
            >
              <Maximize size={20} /> {t("exam_hall.enter_fullscreen_btn", null, "ENTER FULL SCREEN")}
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Timer Bar */}
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
              {displayExamTitle}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
              {t("common.department", null, "Subject")}: {displayExamSubject} &bull; {t("student_dashboard.total_marks_label", null, "Total Marks")}: {sessionData.total_marks}
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
            <span style={{ fontSize: "0.7rem", color: "#9ca3af", display: "block", lineHeight: 1 }}>
              {t("exam_hall.time_remaining", null, "TIME REMAINING")}
            </span>
            <span style={{ fontSize: "1.15rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: timeLeftSeconds < 300 ? "#f87171" : "#fff" }}>
              {formatTime(timeLeftSeconds)}
            </span>
          </div>
        </div>

        {/* Right: Language Selector & Submit Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Universal Language Selector directly on Exam Header */}
          <LanguageSelector variant="navbar" />

          {/* Autosave Status */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: saveStatus === "saving" ? "#fbbf24" : "#34d399" }}>
            {saveStatus === "saving" ? (
              <>
                <RefreshCw size={13} className="spin-animation" />
                <span>{t("exam_hall.saving_cloud", null, "Saving...")}</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={13} />
                <span>{t("exam_hall.saved_to_cloud", null, "Saved to cloud")}</span>
              </>
            )}
          </div>

          <button
            onClick={() => setConfirmSubmitModal(true)}
            className="btn btn-emerald"
            style={{ padding: "0.45rem 1.25rem", fontSize: "0.85rem", fontWeight: 700 }}
          >
            {t("exam_hall.finish_submit", null, "Finish & Submit Exam")}
          </button>
        </div>
      </header>

      {/* Security Violation Alert Banner */}
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
              <strong>{t("exam_hall.integrity_alert", null, "Integrity Alert:")}</strong> {translateContent(lastViolationMsg, language) || t("toast.proctor_warning", null, "Security warning recorded.")}
            </span>
          </div>
          <span className="badge badge-rejected" style={{ fontSize: "0.7rem", padding: "0.2rem 0.6rem" }}>
            {t("exam_hall.violations_logged", { count: violationsCount }, `Violations Logged: ${violationsCount}`)}
          </span>
        </div>
      )}

      {/* Main Examination Hall Grid */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 380px", gap: "1.75rem", padding: "1.75rem 2.25rem", overflow: "hidden" }}>
        
        {/* Left Column: Active Question Workspace */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", overflowY: "auto" }}>
          {currentQ ? (
            <div className="glass-card" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "2.25rem 2.5rem", background: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(99, 102, 241, 0.25)" }}>
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
                    {formatQuestionNumLabel(currentQIndex + 1, questions.length, language)}
                  </span>

                  <span className="badge badge-type">
                    {currentQ.question_type === "MCQ" ? t("status.mcq_single", null, "MCQ (Single)") : currentQ.question_type === "MULTI_SELECT" ? t("status.multi_select", null, "Multi-Select") : currentQ.question_type === "SHORT_ANSWER" ? t("status.short_answer", null, "Short Answer") : currentQ.question_type === "LONG_ANSWER" ? t("status.long_answer", null, "Long Answer") : t("status.image_upload", null, "Image / Diagram")}
                  </span>

                  <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7" }}>
                    {t("exam_hall.marks_count", { marks: currentQ.marks }, `${currentQ.marks} Marks`)}
                  </span>

                  {currentQ.negative_marks > 0 && (
                    <span className="badge badge-rejected" style={{ fontSize: "0.7rem" }}>
                      {t("exam_hall.neg_mark_badge", { marks: currentQ.negative_marks }, `-${currentQ.negative_marks} Neg Mark`)}
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
                    <span>{markedForReview.has(currentQ.question_id) ? t("exam_hall.marked_for_review", null, "Marked for Review") : t("exam_hall.mark_for_review", null, "Mark for Review")}</span>
                  </button>

                  <button
                    onClick={() => clearCurrentResponse(currentQ.question_id)}
                    className="btn btn-secondary"
                    style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", color: "#f87171" }}
                    title="Clear your answer for this question"
                  >
                    {t("exam_hall.clear_response", null, "Clear Response")}
                  </button>
                </div>
              </div>

              {/* Question Text (Fully Translated) */}
              <div style={{ marginBottom: "2.25rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f8fafc", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  {currentQ[`question_text_${language}`] || translateContent(currentQ.question_text, language)}
                </h2>
              </div>

              {/* Dynamic Answer Input Area (Fully Translated) */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                
                {/* 1. MCQ (Single Choice) */}
                {currentQ.question_type === "MCQ" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {currentQ.options.map((opt, oIdx) => {
                      const isSelected = (currentAnswer.selected_option_ids || [])[0] === opt.id;
                      const letter = getLocalizedOptionLabel(oIdx, language);
                      const displayOptionText = opt[`option_text_${language}`] || translateContent(opt.option_text, language);

                      return (
                        <div
                          key={opt.id}
                          onClick={() => updateAnswer(currentQ.question_id, { selected_option_ids: [opt.id] })}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1.25rem",
                            padding: "1.2rem 1.5rem",
                            borderRadius: "var(--radius-md)",
                            background: isSelected ? "rgba(99, 102, 241, 0.22)" : "rgba(30, 41, 59, 0.5)",
                            border: isSelected ? "2px solid #6366f1" : "1px solid rgba(255, 255, 255, 0.08)",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: isSelected ? "#6366f1" : "rgba(255, 255, 255, 0.05)",
                              color: isSelected ? "#fff" : "#94a3b8",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "0.95rem"
                            }}
                          >
                            {letter}
                          </div>
                          <span style={{ fontSize: "1rem", color: isSelected ? "#ffffff" : "#cbd5e1", fontWeight: isSelected ? 600 : 400 }}>
                            {displayOptionText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. MULTI_SELECT (Multiple Correct Options) */}
                {currentQ.question_type === "MULTI_SELECT" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ fontSize: "0.85rem", color: "#93c5fd", marginBottom: "0.5rem" }}>
                      {t("exam_hall.multi_select_hint", null, "Select all correct choices that apply.")}
                    </div>
                    {currentQ.options.map((opt, oIdx) => {
                      const selectedList = currentAnswer.selected_option_ids || [];
                      const isSelected = selectedList.includes(opt.id);
                      const letter = getLocalizedOptionLabel(oIdx, language);
                      const displayOptionText = opt[`option_text_${language}`] || translateContent(opt.option_text, language);

                      const toggleOption = () => {
                        let updated;
                        if (isSelected) {
                          updated = selectedList.filter(id => id !== opt.id);
                        } else {
                          updated = [...selectedList, opt.id];
                        }
                        updateAnswer(currentQ.question_id, { selected_option_ids: updated });
                      };

                      return (
                        <div
                          key={opt.id}
                          onClick={toggleOption}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1.25rem",
                            padding: "1.2rem 1.5rem",
                            borderRadius: "var(--radius-md)",
                            background: isSelected ? "rgba(168, 85, 247, 0.22)" : "rgba(30, 41, 59, 0.5)",
                            border: isSelected ? "2px solid #a855f7" : "1px solid rgba(255, 255, 255, 0.08)",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "8px",
                              background: isSelected ? "#a855f7" : "rgba(255, 255, 255, 0.05)",
                              color: isSelected ? "#fff" : "#94a3b8",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "0.95rem"
                            }}
                          >
                            {isSelected ? "✓" : letter}
                          </div>
                          <span style={{ fontSize: "1rem", color: isSelected ? "#ffffff" : "#cbd5e1", fontWeight: isSelected ? 600 : 400 }}>
                            {displayOptionText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. SHORT_ANSWER */}
                {currentQ.question_type === "SHORT_ANSWER" && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-subtle)", marginBottom: "0.5rem", fontWeight: 600 }}>
                      {t("exam_hall.concise_answer_label", null, "Type concise answer (auto-graded with AI keyword evaluation):")}
                    </label>
                    <textarea
                      rows={5}
                      className="form-control"
                      placeholder={t("exam_hall.concise_placeholder", null, "Enter concise answer...")}
                      style={{ flex: 1, fontSize: "1rem", lineHeight: 1.6, padding: "1.25rem", background: "rgba(15, 23, 42, 0.8)", resize: "none" }}
                      value={currentAnswer.text_answer || ""}
                      onChange={(e) => updateAnswer(currentQ.question_id, { text_answer: e.target.value })}
                    />
                  </div>
                )}

                {/* 4. LONG_ANSWER */}
                {currentQ.question_type === "LONG_ANSWER" && (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <label style={{ fontSize: "0.85rem", color: "var(--text-subtle)", marginBottom: "0.5rem", fontWeight: 600 }}>
                      {t("exam_hall.essay_label", null, "Write your comprehensive answer below:")}
                    </label>
                    <textarea
                      rows={10}
                      className="form-control"
                      placeholder={t("exam_hall.essay_placeholder", null, "Write comprehensive essay or code formulation...")}
                      style={{ flex: 1, fontSize: "0.975rem", lineHeight: 1.65, padding: "1.25rem", background: "rgba(15, 23, 42, 0.8)", resize: "none" }}
                      value={currentAnswer.text_answer || ""}
                      onChange={(e) => updateAnswer(currentQ.question_id, { text_answer: e.target.value })}
                    />
                  </div>
                )}

                {/* 5. IMAGE_UPLOAD (Handwritten Diagram / Formulation) */}
                {currentQ.question_type === "IMAGE_UPLOAD" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div style={{ background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: "var(--radius-sm)", padding: "1rem 1.25rem" }}>
                      <p style={{ fontSize: "0.875rem", color: "#e0e7ff", margin: 0, lineHeight: 1.5 }}>
                        {t("exam_hall.diagram_desc", null, "Draw your architectural or schematic diagram on paper. You can either snap a photo using your active webcam or upload an image file.")}
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                      <button
                        onClick={() => captureWebcamSnapshot(currentQ.question_id)}
                        className="btn btn-primary"
                        style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem" }}
                      >
                        <Camera size={18} /> {t("exam_hall.snap_webcam", null, "Snap Photo via Webcam")}
                      </button>

                      <label
                        className="btn btn-secondary"
                        style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", cursor: "pointer" }}
                      >
                        <Upload size={18} /> {t("exam_hall.upload_image_file", null, "Upload Image File")}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => handleFileUpload(currentQ.question_id, e)}
                        />
                      </label>
                    </div>

                    {currentAnswer.image_url && (
                      <div style={{ background: "rgba(15, 23, 42, 0.8)", padding: "1.25rem", borderRadius: "var(--radius-md)", border: "1px solid rgba(16, 185, 129, 0.4)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#34d399", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <CheckCircle2 size={16} /> {t("exam_hall.attached_diagram", null, "Attached Diagram Submission")}
                          </span>
                          <button
                            onClick={() => updateAnswer(currentQ.question_id, { image_url: null })}
                            className="btn btn-secondary btn-sm"
                            style={{ color: "#f87171" }}
                          >
                            {t("exam_hall.remove_image", null, "Remove Image")}
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
                  <ArrowLeft size={16} /> {t("exam_hall.previous_question", null, "Previous Question")}
                </button>

                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {formatQuestionNumLabel(currentQIndex + 1, questions.length, language)}
                </div>

                {currentQIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="btn btn-primary"
                  >
                    {t("exam_hall.save_next_question", null, "Save & Next Question")} <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmSubmitModal(true)}
                    className="btn btn-emerald"
                  >
                    {t("exam_hall.review_finish", null, "Review & Finish Exam")} <CheckCircle2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Column: Real AI Proctoring HUD & Question Palette */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", overflowY: "auto" }}>
          
          {/* AI Vision Proctoring Monitor Box */}
          <div className="glass-card" style={{ padding: "1.25rem", background: "rgba(15, 23, 42, 0.9)", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#a5b4fc", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Video size={14} color="#818cf8" /> {t("exam_hall.ai_proctor_vision", null, "AI PROCTOR VISION")}
              </span>
              <span className={`badge ${cameraActive && videoTrackLive && !isFaceAbsent ? "badge-approved" : "badge-rejected"}`} style={{ fontSize: "0.65rem" }}>
                {cameraActive && videoTrackLive 
                  ? (isFaceAbsent ? t("exam_hall.face_absent_badge", null, "Face Absent") : t("exam_hall.live_active_badge", null, "● Live & Active")) 
                  : (cameraStatus === "CAMERA_PERMISSION_DENIED" ? t("exam_hall.permission_denied_badge", null, "Permission Denied") : t("exam_hall.camera_off_badge", null, "Camera Off"))}
              </span>
            </div>

            {/* Video Frame with Real Computer Vision Overlays */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "170px",
                background: "#020617",
                borderRadius: "var(--radius-sm)",
                overflow: "hidden",
                border: (!cameraActive || videoDims.w === 0) 
                  ? "1px solid rgba(239, 68, 68, 0.4)" 
                  : (isFaceAbsent ? "1.5px solid #ef4444" : (isMultipleFaces ? "1.5px solid #ef4444" : (isGazeAway ? "1.5px solid #f59e0b" : "1px solid rgba(16, 185, 129, 0.4)")))
              }}
            >
              {/* Actual webcam stream */}
              <video
                ref={attachVideoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => {
                  setVideoDims({ w: e.target.videoWidth, h: e.target.videoHeight });
                  e.target.play().catch(() => {});
                }}
                onCanPlay={(e) => {
                  setVideoReadyState(e.target.readyState);
                  e.target.play().catch(() => {});
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)",
                  display: cameraActive ? "block" : "none"
                }}
              />

              {!cameraActive && (
                <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "#f87171" }}>
                  <VideoOff size={32} />
                  <span style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
                    {cameraStatus === "CAMERA_PERMISSION_DENIED" ? t("exam_hall.permission_denied_badge", null, "Camera Permission Denied") : (cameraError || t("exam_hall.camera_off_badge", null, "Camera Off"))}
                  </span>
                </div>
              )}

              {/* Facial Bounding Box Overlay with Live Real-Time Dynamic Status */}
              {cameraActive && videoDims.w > 0 && stableFaceBox && !isFaceAbsent && (
                <div
                  style={{
                    position: "absolute",
                    top: `${stableFaceBox.minY * 100}%`,
                    left: `${(1 - stableFaceBox.maxX) * 100}%`,
                    width: `${stableFaceBox.width * 100}%`,
                    height: `${stableFaceBox.height * 100}%`,
                    border: isMultipleFaces ? "2px solid #ef4444" : (isGazeAway ? "2px solid #f59e0b" : "2px solid #10b981"),
                    borderRadius: "6px",
                    pointerEvents: "none",
                    boxShadow: isMultipleFaces ? "0 0 12px rgba(239, 68, 68, 0.6)" : (isGazeAway ? "0 0 10px rgba(245, 158, 11, 0.5)" : "0 0 10px rgba(16, 185, 129, 0.5)"),
                    transition: "all 0.1s ease"
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: "-22px",
                      left: "0",
                      background: isMultipleFaces ? "#ef4444" : (isGazeAway ? "#f59e0b" : "#10b981"),
                      color: "#000",
                      fontSize: "0.625rem",
                      fontWeight: 800,
                      padding: "2px 6px",
                      borderRadius: "3px",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {isMultipleFaces 
                      ? `⚠ Multiple Faces (${stableFaceCount})` 
                      : (isGazeAway 
                          ? `⚠ ${translateContent(stableGazeStatus, language)}` 
                          : t("exam_hall.single_candidate_verified", null, "✓ Candidate • Focused on Screen"))}
                  </span>
                </div>
              )}

              {/* Face Absent Overlay Warning directly over video */}
              {cameraActive && videoDims.w > 0 && isFaceAbsent && (
                <div style={{ position: "absolute", top: "10px", left: "10px", right: "10px", background: "rgba(239, 68, 68, 0.85)", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.4rem", animation: "pulse 1.5s infinite" }}>
                  <AlertTriangle size={14} color="#fff" />
                  <span>{t("exam_hall.face_absent_banner", null, "Face Absent: Please remain in front of camera")}</span>
                </div>
              )}

              {/* Live Audio Level Meter */}
              {cameraActive && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "6px",
                    left: "6px",
                    right: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    background: "rgba(0, 0, 0, 0.75)",
                    padding: "3px 6px",
                    borderRadius: "4px"
                  }}
                >
                  <Mic size={11} color={audioLevel > 30 ? "#ef4444" : "#34d399"} />
                  <div style={{ flex: 1, height: "3px", background: "rgba(255, 255, 255, 0.2)", borderRadius: "2px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, audioLevel * 2.5)}%`,
                        background: audioLevel > 30 ? "#ef4444" : "#10b981",
                        transition: "width 0.2s ease"
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "0.6rem", color: "#94a3b8" }}>{audioLevel} dB</span>
                </div>
              )}
            </div>

            {/* Comprehensive AI Proctoring Telemetry Dashboard (Data-Driven from Real Pipeline) */}
            <div style={{ marginTop: "0.85rem", display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.75rem" }}>
              {/* 1. Camera Status */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(30, 41, 59, 0.4)", padding: "0.35rem 0.6rem", borderRadius: "4px" }}>
                <span style={{ color: "var(--text-subtle)", fontWeight: 600 }}>{t("exam_hall.camera_label", null, "Camera:")}</span>
                <span style={{ color: (cameraActive && videoTrackLive && videoDims.w > 0) ? "#34d399" : "#ef4444", fontWeight: 800 }}>
                  {cameraActive && videoTrackLive && videoDims.w > 0 
                    ? t("exam_hall.camera_active", null, "● Active") 
                    : (cameraStatus === "CAMERA_PERMISSION_DENIED" ? t("exam_hall.camera_permission_denied", null, "✕ Permission denied") : (cameraStatus === "CAMERA_STOPPED" ? t("exam_hall.camera_disconnected", null, "✕ Disconnected") : t("exam_hall.camera_off", null, "✕ Off")))}
                </span>
              </div>

              {/* 2. Face Visibility */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(30, 41, 59, 0.4)", padding: "0.35rem 0.6rem", borderRadius: "4px" }}>
                <span style={{ color: "var(--text-subtle)", fontWeight: 600 }}>{t("exam_hall.face_status_label", null, "Face Visibility:")}</span>
                <span style={{ color: (!isFaceAbsent && cameraActive && videoDims.w > 0) ? "#34d399" : "#ef4444", fontWeight: 800 }}>
                  {(!cameraActive || videoDims.w === 0) 
                    ? t("exam_hall.no_valid_video_frame", null, "✕ No valid video frame") 
                    : (!isFaceAbsent ? t("exam_hall.face_visible", null, "● Visible") : t("exam_hall.face_absent", null, "✕ Not Visible (Absent)"))}
                </span>
              </div>

              {/* 3. Candidate Presence / Real Face Count */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(30, 41, 59, 0.4)", padding: "0.35rem 0.6rem", borderRadius: "4px" }}>
                <span style={{ color: "var(--text-subtle)", fontWeight: 600 }}>{t("exam_hall.candidate_presence_label", null, "Candidate Presence:")}</span>
                <span style={{ color: (stableFaceCount === 1 && cameraActive && videoDims.w > 0) ? "#34d399" : "#ef4444", fontWeight: 800 }}>
                  {(!cameraActive || videoDims.w === 0)
                    ? t("exam_hall.cannot_detect", null, "✕ Cannot detect")
                    : (stableFaceCount === 1 
                        ? t("exam_hall.single_candidate", null, "● Single Candidate (1 Face)") 
                        : (stableFaceCount > 1 
                            ? t("exam_hall.multiple_faces_detected", { count: stableFaceCount }, `⚠ Multiple Faces (${stableFaceCount} Detected)`) 
                            : (stableFaceCount === 0 ? t("exam_hall.zero_faces_detected", null, "✕ 0 Faces Detected") : t("exam_hall.checking", null, "● Checking..."))))}
                </span>
              </div>

              {/* 4. Screen Attention / Gaze Tracking */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(30, 41, 59, 0.4)", padding: "0.35rem 0.6rem", borderRadius: "4px" }}>
                <span style={{ color: "var(--text-subtle)", fontWeight: 600 }}>{t("exam_hall.gaze_tracking_label", null, "Screen Attention:")}</span>
                <span style={{ color: (!cameraActive || videoDims.w === 0 || isFaceAbsent) ? "#ef4444" : (isGazeAway ? "#fbbf24" : "#34d399"), fontWeight: 800 }}>
                  {(!cameraActive || videoDims.w === 0 || isFaceAbsent)
                    ? t("exam_hall.not_available", null, "✕ Not available")
                    : (isMultipleFaces 
                        ? t("exam_hall.multiple_faces_detected", { count: stableFaceCount }, "⚠ Multiple Faces") 
                        : (isGazeAway ? `⚠ ${translateContent(stableGazeStatus, language)}` : t("exam_hall.looking_toward_screen", null, "● Looking Toward Screen")))}
                </span>
              </div>

              {/* 5. Head Pose Orientation */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(30, 41, 59, 0.4)", padding: "0.35rem 0.6rem", borderRadius: "4px" }}>
                <span style={{ color: "var(--text-subtle)", fontWeight: 600 }}>{t("exam_hall.head_pose_label", null, "Head Pose:")}</span>
                <span style={{ color: (!cameraActive || videoDims.w === 0 || isFaceAbsent) ? "#ef4444" : (stableHeadStatus === "Centered" ? "#34d399" : "#fbbf24"), fontWeight: 800 }}>
                  {(!cameraActive || videoDims.w === 0 || isFaceAbsent)
                    ? t("exam_hall.not_available", null, "✕ Not available")
                    : (isMultipleFaces 
                        ? t("exam_hall.multiple_faces_detected", { count: stableFaceCount }, "⚠ Multiple Faces") 
                        : (stableHeadStatus === "Centered" ? t("exam_hall.head_centered", null, "● Centered") : `⚠ ${translateContent(stableHeadStatus, language)}`)) }
                </span>
              </div>

              {/* 6. Vision Engine Status */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(30, 41, 59, 0.4)", padding: "0.35rem 0.6rem", borderRadius: "4px" }}>
                <span style={{ color: "var(--text-subtle)", fontWeight: 600 }}>{t("exam_hall.vision_engine_label", null, "Vision Engine:")}</span>
                <span style={{ color: isVisionActive ? "#34d399" : (modelError ? "#ef4444" : "#fbbf24"), fontWeight: 700 }}>
                  {visionStatusLabel}
                </span>
              </div>

              {/* 7. Fullscreen Lockdown */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(30, 41, 59, 0.4)", padding: "0.35rem 0.6rem", borderRadius: "4px" }}>
                <span style={{ color: "var(--text-subtle)", fontWeight: 600 }}>{t("exam_hall.fullscreen_mode_label", null, "Fullscreen Mode:")}</span>
                <span style={{ color: isFullscreen ? "#34d399" : "#ef4444", fontWeight: 800 }}>
                  {isFullscreen ? t("exam_hall.fullscreen_active", null, "● Active & Locked") : t("exam_hall.fullscreen_exited", null, "⚠ Exited (Overlay Active)")}
                </span>
              </div>
            </div>

            {/* Developer Detection Debug Panel */}
            <div style={{ background: "rgba(0, 0, 0, 0.65)", border: "1px dashed rgba(99, 102, 241, 0.4)", padding: "0.6rem 0.75rem", borderRadius: "6px", fontSize: "0.7rem", fontFamily: "monospace", color: "#94a3b8", display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.75rem" }}>
              <div style={{ fontWeight: 700, color: "#818cf8" }}>--- REAL AI DETECTION TELEMETRY ---</div>
              <div>Camera stream: <span style={{ color: cameraActive ? "#34d399" : "#ef4444" }}>{cameraActive ? "ACTIVE" : "INACTIVE"}</span> ({cameraStatus})</div>
              <div>Video dimensions: {videoDims.w}x{videoDims.h}</div>
              <div>Video readyState: {videoReadyState}</div>
              <div>Video track: <span style={{ color: videoTrackLive ? "#34d399" : "#ef4444" }}>{videoTrackLive ? "live" : "ended/none"}</span></div>
              <div>AI model: <span style={{ color: aiModelLoaded ? "#34d399" : (modelError ? "#ef4444" : "#fbbf24") }}>{aiModelLoaded ? "LOADED" : (modelError ? "ERROR" : "LOADING")}</span></div>
              <div>Frames processed: {framesProcessed}</div>
              <div>Last detection: {lastDetectionTime ? `${Math.round(Date.now() - lastDetectionTime)}ms ago` : "None"}</div>
              <div>Detected faces: <span style={{ color: stableFaceCount === 1 ? "#34d399" : "#ef4444", fontWeight: 700 }}>{stableFaceCount !== null ? stableFaceCount : "Checking..."}</span></div>
            </div>
          </div>

          {/* Question Navigation Palette */}
          <div className="glass-card" style={{ flex: 1, padding: "1.75rem", background: "rgba(15, 23, 42, 0.9)" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "1rem" }}>
              {t("exam_hall.palette_title", { answered: answeredCount, total: questions.length }, `Question Palette (${answeredCount}/${questions.length} Answered)`)}
            </h3>

            {/* Progress Bar */}
            <div style={{ width: "100%", height: "8px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "4px", overflow: "hidden", marginBottom: "1.25rem" }}>
              <div
                style={{
                  height: "100%",
                  width: `${(answeredCount / Math.max(1, questions.length)) * 100}%`,
                  background: "linear-gradient(90deg, #4f46e5, #10b981)",
                  transition: "width 0.3s ease"
                }}
              />
            </div>

            {/* Question Badges Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.6rem", maxHeight: "240px", overflowY: "auto", paddingRight: "4px" }}>
              {questions.map((q, idx) => {
                const ans = answers[q.question_id];
                const isAnswered = ans && (
                  (ans.selected_option_ids && ans.selected_option_ids.length > 0) ||
                  (ans.text_answer && ans.text_answer.trim().length > 0) ||
                  (ans.image_url && ans.image_url.length > 0)
                );
                const isMarked = markedForReview.has(q.question_id);
                const isCurrent = idx === currentQIndex;

                let bg = "rgba(30, 41, 59, 0.7)";
                let color = "#94a3b8";
                let border = "1px solid rgba(255, 255, 255, 0.08)";

                if (isMarked && isAnswered) {
                  bg = "linear-gradient(135deg, #a855f7, #10b981)";
                  color = "#fff";
                } else if (isMarked) {
                  bg = "#a855f7";
                  color = "#fff";
                } else if (isAnswered) {
                  bg = "#10b981";
                  color = "#fff";
                }

                if (isCurrent) {
                  border = "2px solid #818cf8";
                  bg = isAnswered ? "#10b981" : "rgba(99, 102, 241, 0.4)";
                  color = "#fff";
                }

                return (
                  <button
                    key={q.question_id}
                    onClick={() => setCurrentQIndex(idx)}
                    style={{
                      height: "40px",
                      borderRadius: "6px",
                      background: bg,
                      color: color,
                      border: border,
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", fontSize: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#10b981" }} />
                <span style={{ color: "var(--text-muted)" }}>{t("exam_hall.answered_badge", null, "Answered")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "rgba(30, 41, 59, 0.7)", border: "1px solid rgba(255,255,255,0.15)" }} />
                <span style={{ color: "var(--text-muted)" }}>{t("exam_hall.unanswered_badge", null, "Unanswered")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#a855f7" }} />
                <span style={{ color: "var(--text-muted)" }}>{t("exam_hall.marked_badge", null, "Marked")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "3px", border: "2px solid #818cf8" }} />
                <span style={{ color: "var(--text-muted)" }}>{t("exam_hall.active_legend", null, "Current")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          CONFIRM SUBMISSION MODAL
          ===================================================================== */}
      {confirmSubmitModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem"
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: "500px",
              width: "100%",
              padding: "2.25rem",
              background: "rgba(15, 23, 42, 0.98)",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              borderRadius: "var(--radius-lg)"
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem"
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#fff", margin: "0 0 0.5rem" }}>
                {t("exam_hall.confirm_submit_title", null, "Ready to Submit Examination?")}
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
                {t("exam_hall.confirm_submit_desc", null, "Once submitted, your answers will be evaluated and an integrity report generated.")}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.75rem", textAlign: "center" }}>
              <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "0.75rem", borderRadius: "6px" }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>{t("exam_hall.answered_badge", null, "Answered")}</span>
                <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#34d399" }}>{answeredCount}</span>
              </div>
              <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "0.75rem", borderRadius: "6px" }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>{t("exam_hall.unanswered_badge", null, "Unanswered")}</span>
                <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f87171" }}>{questions.length - answeredCount}</span>
              </div>
              <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "0.75rem", borderRadius: "6px" }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>{t("exam_hall.marked_badge", null, "Marked")}</span>
                <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#d8b4fe" }}>{markedCount}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                disabled={submitting}
                onClick={() => setConfirmSubmitModal(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                {t("common.cancel", null, "Return to Exam")}
              </button>
              <button
                disabled={submitting}
                onClick={handleFinalSubmit}
                className="btn btn-emerald"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
              >
                {submitting ? <RefreshCw size={16} className="spin-animation" /> : <Check size={16} />}
                <span>{submitting ? t("exam_hall.evaluating_responses", null, "Submitting...") : t("exam_hall.confirm_submit", null, "Confirm & Submit")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
