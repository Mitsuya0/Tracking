import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, FaceLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';
import type { TrackingData } from '../utils/kalidoSolver';
import type { TrackingStatus } from '../types';

interface UseTrackingProps {
  selectedCameraId: string;
  handsEnabled: boolean;
  targetFps?: number;
}

export function useTracking({ selectedCameraId, handsEnabled, targetFps = 30 }: UseTrackingProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);

  const [status, setStatus] = useState<TrackingStatus>({
    cameraActive: false,
    faceDetected: false,
    leftHandDetected: false,
    rightHandDetected: false,
    fps: 0,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);

  // 最新のトラッキングデータ（レンダリングループから同期的に取得可能）
  const latestTrackingDataRef = useRef<TrackingData>({});

  // プレビュー描画用コールバック（設定パネルが開いている時のみ呼ぶ）
  const previewCallbackRef = useRef<((video: HTMLVideoElement, data: TrackingData) => void) | null>(null);

  // FPS 計算用 & 推論レート制限用
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const lastProcessTimeRef = useRef(0);

  // 1. 利用可能なカメラデバイス一覧の取得
  const updateDeviceList = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoDevices);
    } catch (err) {
      console.error('Failed to list video devices:', err);
    }
  }, []);

  // 2. MediaPipe Vision Tasks の初期化
  useEffect(() => {
    let isCancelled = false;

    async function initMediaPipe() {
      try {
        setInitError(null);
        // WASM リゾルバの読み込み
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (isCancelled) return;

        // Face Landmarker 初期化
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        });

        if (isCancelled) return;

        // Hand Landmarker 初期化
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });

        if (isCancelled) return;

        faceLandmarkerRef.current = faceLandmarker;
        handLandmarkerRef.current = handLandmarker;
        setIsInitialized(true);
      } catch (err: any) {
        console.error('Failed to initialize MediaPipe:', err);
        setInitError(err.message || 'MediaPipe の初期化に失敗しました');
      }
    }

    initMediaPipe();
    updateDeviceList();

    return () => {
      isCancelled = true;
      faceLandmarkerRef.current?.close();
      handLandmarkerRef.current?.close();
    };
  }, [updateDeviceList]);

  // 3. Webカメラストリームの起動・切り替え
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    async function startCamera() {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
            width: { ideal: 640 },
            height: { ideal: 360 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: false,
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus((prev) => ({ ...prev, cameraActive: true }));
        }
        updateDeviceList();
      } catch (err) {
        console.error('Failed to start camera:', err);
        setStatus((prev) => ({ ...prev, cameraActive: false }));
      }
    }

    startCamera();

    return () => {
      isCancelled = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [selectedCameraId, updateDeviceList]);

  // 4. トラッキング推論ループ
  useEffect(() => {
    let animationFrameId: number;

    const processLoop = () => {
      const video = videoRef.current;
      const faceLandmarker = faceLandmarkerRef.current;
      const handLandmarker = handLandmarkerRef.current;

      if (video && video.readyState >= 2 && faceLandmarker) {
        const now = performance.now();
        const minInterval = 1000 / (targetFps || 30);

        if (now - lastProcessTimeRef.current >= minInterval) {
          lastProcessTimeRef.current = now;

          // 1. フェイストラッキング
          const faceResults = faceLandmarker.detectForVideo(video, now);
          let faceDetected = false;
          let faceData: TrackingData['face'] = undefined;

          if (faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
            faceDetected = true;
            const lm = faceResults.faceLandmarks[0];

            // 鼻先 (1), あご (152), 左目外側 (33), 右目外側 (263) から頭部回転を計算
            const nose = lm[1];
            const chin = lm[152];
            const leftEye = lm[33];
            const rightEye = lm[263];

            // Roll (首かしげ)
            const deltaX = rightEye.x - leftEye.x;
            const deltaY = rightEye.y - leftEye.y;
            const rollDeg = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

            // Yaw (左右の振り向き)
            const eyeCenterX = (leftEye.x + rightEye.x) / 2;
            const eyeDist = Math.hypot(deltaX, deltaY);
            const yawRatio = (nose.x - eyeCenterX) / (eyeDist + 0.001);
            const yawDeg = yawRatio * 110;

            // Pitch (上下のうなずき)
            const eyeCenterY = (leftEye.y + rightEye.y) / 2;
            const faceHeight = Math.abs(chin.y - eyeCenterY);
            const noseRelY = (nose.y - eyeCenterY) / (faceHeight + 0.001);
            const pitchDeg = (noseRelY - 0.38) * 90;

            const matrix =
              faceResults.facialTransformationMatrixes && faceResults.facialTransformationMatrixes.length > 0
                ? Array.from(faceResults.facialTransformationMatrixes[0].data)
                : undefined;

            const blendshapes = faceResults.faceBlendshapes?.[0]?.categories.map((c) => ({
              categoryName: c.categoryName,
              score: c.score,
            }));

            faceData = {
              matrix,
              rotation: {
                pitch: pitchDeg,
                yaw: yawDeg,
                roll: rollDeg,
              },
              blendshapes,
            };
          }

          // 2. ハンドトラッキング (有効時のみ)
          let leftHand: any[] | undefined = undefined;
          let rightHand: any[] | undefined = undefined;

          if (handsEnabled && handLandmarker) {
            const handResults = handLandmarker.detectForVideo(video, now);
            if (handResults.landmarks && handResults.landmarks.length > 0) {
              for (let i = 0; i < handResults.landmarks.length; i++) {
                const handedness = handResults.handedness[i]?.[0]?.categoryName;
                // Webカメラの自撮り鏡像反転を考慮: Left判定ならユーザーの右手
                if (handedness === 'Left') {
                  rightHand = handResults.landmarks[i];
                } else {
                  leftHand = handResults.landmarks[i];
                }
              }
            }
          }

          // 最新トラッキングデータの格納
          const trackingData: TrackingData = {
            face: faceData,
            leftHand,
            rightHand,
          };
          latestTrackingDataRef.current = trackingData;

          // プレビュー描画コールバック呼び出し（設定パネルオープン時）
          if (previewCallbackRef.current) {
            previewCallbackRef.current(video, trackingData);
          }

          // FPS 計算
          frameCountRef.current++;
          if (now - lastFpsTimeRef.current >= 1000) {
            const fps = Math.round((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current));
            setStatus((prev) => ({
              ...prev,
              faceDetected,
              leftHandDetected: !!leftHand,
              rightHandDetected: !!rightHand,
              fps,
            }));
            frameCountRef.current = 0;
            lastFpsTimeRef.current = now;
          }
        }
      }

      animationFrameId = requestAnimationFrame(processLoop);
    };

    if (isInitialized) {
      animationFrameId = requestAnimationFrame(processLoop);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isInitialized, handsEnabled, targetFps]);

  // プレビュー用コールバックの登録
  const setPreviewCallback = useCallback(
    (callback: ((video: HTMLVideoElement, data: TrackingData) => void) | null) => {
      previewCallbackRef.current = callback;
    },
    []
  );

  return {
    videoRef,
    isInitialized,
    initError,
    availableDevices,
    status,
    latestTrackingDataRef,
    setPreviewCallback,
  };
}
