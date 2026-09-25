/**
 * Real-Time AI Proctoring Vision & Audio Engine
 * Uses MediaPipe Tasks Vision FaceLandmarker with strict data-driven computation.
 * (Face count, landmarks, head orientation yaw/pitch/roll, gaze estimation, audio RMS)
 * NO Math.random() / NO hardcoded placeholder telemetry.
 */

import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

let landmarkerInstance = null;
let landmarkerLoadingPromise = null;
let lastVideoTimestamp = 0;

/**
 * Initialize MediaPipe FaceLandmarker singleton
 */
export async function initFaceLandmarker() {
  if (landmarkerInstance) {
    return landmarkerInstance;
  }
  if (landmarkerLoadingPromise) {
    return landmarkerLoadingPromise;
  }

  landmarkerLoadingPromise = (async () => {
    // List of wasm paths to try in order (local first, then CDN)
    const wasmPaths = [
      "/wasm",
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm",
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
    ];

    // List of model paths to try in order (local first, then Google Cloud Storage)
    const modelPaths = [
      "/models/face_landmarker.task",
      "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
    ];

    let lastError = null;

    for (const wasmPath of wasmPaths) {
      try {
        console.log(`[MediaPipe] Initializing vision tasks with WASM path: ${wasmPath}`);
        const filesetResolver = await FilesetResolver.forVisionTasks(wasmPath);

        for (const modelPath of modelPaths) {
          for (const delegate of ["GPU", "CPU"]) {
            try {
              console.log(`[MediaPipe] Loading FaceLandmarker with model: ${modelPath}, delegate: ${delegate}`);
              const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                  modelAssetPath: modelPath,
                  delegate: delegate
                },
                runningMode: "VIDEO",
                numFaces: 3,
                minFaceDetectionConfidence: 0.35,
                minFacePresenceConfidence: 0.35,
                minTrackingConfidence: 0.35,
                outputFaceBlendshapes: false,
                outputFacialTransformationMatrixes: false
              });

              if (landmarker) {
                console.log(`[MediaPipe] Successfully initialized FaceLandmarker (${delegate}, ${modelPath})`);
                landmarkerInstance = landmarker;
                return landmarkerInstance;
              }
            } catch (createErr) {
              lastError = createErr;
              console.warn(`[MediaPipe] FaceLandmarker creation failed with ${delegate} and ${modelPath}:`, createErr.message || createErr);
            }
          }
        }
      } catch (wasmErr) {
        lastError = wasmErr;
        console.warn(`[MediaPipe] WASM resolver failed for ${wasmPath}:`, wasmErr.message || wasmErr);
      }
    }

    landmarkerLoadingPromise = null;
    console.error("[MediaPipe] All FaceLandmarker initialization strategies failed.", lastError);
    throw lastError || new Error("Failed to initialize MediaPipe Face Landmarker");
  })();

  return landmarkerLoadingPromise;
}

/**
 * Analyze a single video frame with MediaPipe FaceLandmarker
 * @param {HTMLVideoElement} videoElement 
 * @param {FaceLandmarker|null} landmarker 
 * @param {number} timestampMs 
 * @returns {Object} Strictly data-driven telemetry results
 */
export function analyzeVideoFrame(videoElement, landmarker, timestampMs = performance.now()) {
  // If video is not ready, has no dimensions, or is paused: strictly report NO valid frame
  if (
    !videoElement || 
    videoElement.readyState < 2 || 
    !videoElement.videoWidth || 
    videoElement.videoWidth === 0 || 
    !videoElement.videoHeight || 
    videoElement.videoHeight === 0 || 
    videoElement.paused
  ) {
    return {
      faceCount: 0,
      faceVisible: false,
      headPose: "NOT_DETECTED",
      headStatus: "Not detected",
      gaze: "NOT_DETECTED",
      gazeStatus: "Not detected",
      isLookingAway: false,
      isMultipleFaces: false,
      isFaceAbsent: true,
      faceBoundingBox: null,
      landmarks: null,
      status: "NO_FRAME",
      engine: "No Active Frame",
      detectionSuccess: false
    };
  }

  // If AI model is not loaded yet, we cannot perform detection
  if (!landmarker) {
    return {
      faceCount: 0,
      faceVisible: false,
      headPose: "NOT_DETECTED",
      headStatus: "Not detected",
      gaze: "NOT_DETECTED",
      gazeStatus: "Not detected",
      isLookingAway: false,
      isMultipleFaces: false,
      isFaceAbsent: true,
      faceBoundingBox: null,
      landmarks: null,
      status: "MODEL_NOT_READY",
      engine: "AI Model Loading",
      detectionSuccess: false
    };
  }

  try {
    const safeTimestamp = Math.max(Math.floor(timestampMs), lastVideoTimestamp + 1);
    lastVideoTimestamp = safeTimestamp;

    const results = landmarker.detectForVideo(videoElement, safeTimestamp);

    // Extract, validate and deduplicate detected faces
    const validFaces = [];
    if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
      for (const faceLandmarks of results.faceLandmarks) {
        if (!faceLandmarks || faceLandmarks.length < 10) continue;

        let fMinX = 1, fMaxX = 0, fMinY = 1, fMaxY = 0;
        for (let i = 0; i < faceLandmarks.length; i++) {
          const pt = faceLandmarks[i];
          if (pt.x < fMinX) fMinX = pt.x;
          if (pt.x > fMaxX) fMaxX = pt.x;
          if (pt.y < fMinY) fMinY = pt.y;
          if (pt.y > fMaxY) fMaxY = pt.y;
        }

        const fW = fMaxX - fMinX;
        const fH = fMaxY - fMinY;
        if (fW < 0.04 || fH < 0.04) continue;

        const fCenterX = (fMinX + fMaxX) / 2;
        const fCenterY = (fMinY + fMaxY) / 2;

        let isDuplicate = false;
        for (const existing of validFaces) {
          const dx = Math.abs(existing.centerX - fCenterX);
          const dy = Math.abs(existing.centerY - fCenterY);
          const xOverlap = Math.max(0, Math.min(existing.maxX, fMaxX) - Math.max(existing.minX, fMinX));
          const yOverlap = Math.max(0, Math.min(existing.maxY, fMaxY) - Math.max(existing.minY, fMinY));
          const overlapArea = xOverlap * yOverlap;
          const minArea = Math.min(existing.width * existing.height, fW * fH);

          if (overlapArea / Math.max(0.0001, minArea) > 0.25 || (dx < 0.16 && dy < 0.16)) {
            isDuplicate = true;
            break;
          }
        }

        if (!isDuplicate) {
          validFaces.push({
            landmarks: faceLandmarks,
            minX: fMinX,
            maxX: fMaxX,
            minY: fMinY,
            maxY: fMaxY,
            width: fW,
            height: fH,
            centerX: fCenterX,
            centerY: fCenterY
          });
        }
      }
    }

    const numFaces = validFaces.length;

    // Zero faces detected
    if (numFaces === 0) {
      return {
        faceCount: 0,
        faceVisible: false,
        headPose: "NOT_DETECTED",
        headStatus: "Not detected",
        gaze: "NOT_DETECTED",
        gazeStatus: "Not detected",
        isLookingAway: false,
        isMultipleFaces: false,
        isFaceAbsent: true,
        faceBoundingBox: null,
        landmarks: null,
        status: "FACE_ABSENT",
        engine: "MediaPipe FaceLandmarker",
        detectionSuccess: true
      };
    }

    // Multiple faces detected
    if (numFaces > 1) {
      return {
        faceCount: numFaces,
        faceVisible: true,
        headPose: "MULTIPLE",
        headStatus: "Multiple Faces",
        gaze: "MULTIPLE",
        gazeStatus: "Multiple Faces",
        isLookingAway: false,
        isMultipleFaces: true,
        isFaceAbsent: false,
        faceBoundingBox: {
          minX: validFaces[0].minX,
          maxX: validFaces[0].maxX,
          minY: validFaces[0].minY,
          maxY: validFaces[0].maxY,
          width: validFaces[0].width,
          height: validFaces[0].height,
          centerX: validFaces[0].centerX,
          centerY: validFaces[0].centerY
        },
        landmarks: validFaces.map(f => f.landmarks),
        status: "MULTIPLE_FACES",
        engine: "MediaPipe FaceLandmarker",
        detectionSuccess: true
      };
    }

    // Exactly 1 valid face detected
    const primaryFace = validFaces[0];
    const landmarks = primaryFace.landmarks;

    const bbox = {
      minX: primaryFace.minX,
      maxX: primaryFace.maxX,
      minY: primaryFace.minY,
      maxY: primaryFace.maxY,
      width: primaryFace.width,
      height: primaryFace.height,
      centerX: primaryFace.centerX,
      centerY: primaryFace.centerY
    };

    // Calculate Head Pose (Yaw, Pitch, Roll)
    const nose = landmarks[1] || landmarks[4];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const forehead = landmarks[10];
    const chin = landmarks[152];
    const leftEyeOuter = landmarks[33];
    const rightEyeOuter = landmarks[263];

    let headPose = "CENTER";
    let headStatus = "Centered";
    let isHeadTurned = false;

    if (nose && leftCheek && rightCheek) {
      const distLeft = Math.abs(nose.x - leftCheek.x);
      const distRight = Math.abs(rightCheek.x - nose.x);
      const yawRatio = distLeft / Math.max(0.001, distRight);

      if (yawRatio < 0.35) {
        headPose = "LEFT";
        headStatus = "Turned Left";
        isHeadTurned = true;
      } else if (yawRatio > 2.85) {
        headPose = "RIGHT";
        headStatus = "Turned Right";
        isHeadTurned = true;
      }
    }

    if (nose && forehead && chin) {
      const distForehead = Math.abs(nose.y - forehead.y);
      const distChin = Math.abs(chin.y - nose.y);
      const pitchRatio = distForehead / Math.max(0.001, distChin);

      if (pitchRatio < 0.35) {
        headPose = "UP";
        headStatus = "Tilted Up";
        isHeadTurned = true;
      } else if (pitchRatio > 2.40) {
        headPose = "DOWN";
        headStatus = "Tilted Down";
        isHeadTurned = true;
      }
    }

    if (leftEyeOuter && rightEyeOuter) {
      const deltaY = rightEyeOuter.y - leftEyeOuter.y;
      const deltaX = rightEyeOuter.x - leftEyeOuter.x;
      const rollAngle = Math.atan2(deltaY, deltaX);

      if (Math.abs(rollAngle) > 0.45) {
        headPose = "TILTED";
        headStatus = "Head Tilted";
        isHeadTurned = true;
      }
    }

    // Calculate Eye Iris Gaze
    let gaze = "LOOKING_AT_SCREEN";
    let gazeStatus = "Looking Toward Screen";
    let isGazeAway = false;

    const leftIris = landmarks[468];
    const leftEyeInner = landmarks[133];
    const rightIris = landmarks[473];
    const rightEyeInner = landmarks[362];

    if (leftIris && leftEyeOuter && leftEyeInner && rightIris && rightEyeOuter && rightEyeInner) {
      const leftEyeSpan = Math.abs(leftEyeInner.x - leftEyeOuter.x);
      const rightEyeSpan = Math.abs(rightEyeOuter.x - rightEyeInner.x);

      if (leftEyeSpan > 0.005 && rightEyeSpan > 0.005) {
        const leftIrisPos = (leftIris.x - Math.min(leftEyeOuter.x, leftEyeInner.x)) / leftEyeSpan;
        const rightIrisPos = (rightIris.x - Math.min(rightEyeOuter.x, rightEyeInner.x)) / rightEyeSpan;
        const avgIrisPos = (leftIrisPos + rightIrisPos) / 2;

        if (avgIrisPos < 0.20) {
          gaze = "LOOKING_AWAY_LEFT";
          gazeStatus = "Looking Away (Left)";
          isGazeAway = true;
        } else if (avgIrisPos > 0.80) {
          gaze = "LOOKING_AWAY_RIGHT";
          gazeStatus = "Looking Away (Right)";
          isGazeAway = true;
        }
      }
    }

    const lookingAway = isHeadTurned || isGazeAway;

    return {
      faceCount: 1,
      faceVisible: true,
      headPose,
      headStatus,
      gaze,
      gazeStatus,
      isLookingAway: lookingAway,
      isMultipleFaces: false,
      isFaceAbsent: false,
      faceBoundingBox: bbox,
      landmarks,
      status: lookingAway ? "GAZE_AWAY" : "NORMAL",
      engine: "MediaPipe FaceLandmarker",
      detectionSuccess: true
    };
  } catch (err) {
    console.error("MediaPipe detectForVideo execution error:", err);
    return {
      faceCount: 0,
      faceVisible: false,
      headPose: "NOT_DETECTED",
      headStatus: "Not detected",
      gaze: "NOT_DETECTED",
      gazeStatus: "Not detected",
      isLookingAway: false,
      isMultipleFaces: false,
      isFaceAbsent: true,
      faceBoundingBox: null,
      landmarks: null,
      status: "EXEC_ERROR",
      engine: "MediaPipe FaceLandmarker",
      detectionSuccess: false
    };
  }
}

/**
 * Real Web Audio API Audio Level Monitor
 */
export function createAudioMonitor(stream, onLevelChange) {
  if (!stream || !stream.getAudioTracks().length) {
    return { stop: () => {} };
  }

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return { stop: () => {} };

    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationId = null;
    let isActive = true;

    const checkAudio = () => {
      if (!isActive) return;
      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const level = Math.min(100, Math.round((average / 128) * 100));

      if (onLevelChange) {
        onLevelChange(level);
      }

      animationId = requestAnimationFrame(checkAudio);
    };

    animationId = requestAnimationFrame(checkAudio);

    return {
      stop: () => {
        isActive = false;
        if (animationId) cancelAnimationFrame(animationId);
        try {
          source.disconnect();
          analyser.disconnect();
          if (audioContext.state !== "closed") {
            audioContext.close();
          }
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  } catch (err) {
    console.warn("Web Audio API monitor initialization notice:", err);
    return { stop: () => {} };
  }
}
