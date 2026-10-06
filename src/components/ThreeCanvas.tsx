import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useVRM } from '../hooks/useVRM';
import type { AppSettings, TrackingStatus } from '../types';
import type { TrackingData } from '../utils/kalidoSolver';

interface ThreeCanvasProps {
  settings: AppSettings;
  latestTrackingDataRef: React.MutableRefObject<TrackingData>;
  trackingStatus: TrackingStatus;
  isTrackingInitialized?: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  onResetCameraReady?: (resetHandler: () => void) => void;
  onFrameRendered?: (gl: WebGLRenderingContext | WebGL2RenderingContext, canvas: HTMLCanvasElement) => void;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  settings,
  latestTrackingDataRef,
  trackingStatus,
  isTrackingInitialized = true,
  onCanvasReady,
  onResetCameraReady,
  onFrameRendered,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [sceneState, setSceneState] = useState<THREE.Scene | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // ライティング・レンダラー・カメラ参照
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const backLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambLightRef = useRef<THREE.AmbientLight | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const perspCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const activeCameraRef = useRef<THREE.Camera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const prevFovRef = useRef<number>(settings.lighting?.cameraFov ?? 0);

  // useVRM フック
  const { currentVrm, isLoading, loadError, updateVRM } = useVRM({
    scene: sceneState,
    backgroundSettings: settings.background,
    customVrmUrl: settings.customVrmUrl,
  });

  // 最新のコールバックと設定値を ref に保持（renderLoop 内でのクロージャ問題を完全に回避）
  const updateVRMRef = useRef(updateVRM);
  updateVRMRef.current = updateVRM;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const onFrameRenderedRef = useRef(onFrameRendered);
  onFrameRenderedRef.current = onFrameRendered;

  // デフォルトカメラ位置・注視点
  const DEFAULT_CAM_TARGET = useRef(new THREE.Vector3(0, 1.32, 0));

  // FOV に応じたキャラの見かけサイズを維持する理想カメラ距離の算出 (透視投影用)
  const getIdealCamDistance = (fov: number): number => {
    const baseFovRad = (30 * Math.PI) / 360; // 15度
    const effectiveFov = Math.max(1, Math.min(90, fov));
    const newFovRad = (effectiveFov * Math.PI) / 360;
    const baseDist = 0.9;
    return baseDist * (Math.tan(baseFovRad) / Math.tan(newFovRad));
  };

  // Three.js シーンの初期化
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(settings.background.color);

    // 2. Cameras (正射影カメラ: FOV=0 歪みなし用 / 透視投影カメラ: FOV>0 用)
    const initFov = settingsRef.current.lighting?.cameraFov ?? 0;
    prevFovRef.current = initFov;
    const isOrtho = initFov === 0;

    // 正射影 (Orthographic) カメラ設定 (距離0.9m・FOV30度相当の胸上バストアップサイズ)
    const orthoH = 2 * 0.9 * Math.tan((15 * Math.PI) / 180); // 約 0.482m
    const orthoW = orthoH * (16 / 9); // 約 0.857m
    const orthoCamera = new THREE.OrthographicCamera(
      -orthoW / 2,
      orthoW / 2,
      orthoH / 2,
      -orthoH / 2,
      0.1,
      20.0
    );
    orthoCamera.position.set(0, 1.35, 0.9);
    orthoCamera.lookAt(DEFAULT_CAM_TARGET.current);
    orthoCameraRef.current = orthoCamera;

    // 透視投影 (Perspective) カメラ設定
    const perspCamera = new THREE.PerspectiveCamera(
      initFov > 0 ? initFov : 20,
      16 / 9,
      0.1,
      20.0
    );
    const initDist = getIdealCamDistance(initFov > 0 ? initFov : 20);
    const initDir = new THREE.Vector3(0, 0.03, 0.9).normalize();
    perspCamera.position.copy(DEFAULT_CAM_TARGET.current).addScaledVector(initDir, initDist);
    perspCamera.lookAt(DEFAULT_CAM_TARGET.current);
    perspCameraRef.current = perspCamera;

    const initialCamera = isOrtho ? orthoCamera : perspCamera;
    activeCameraRef.current = initialCamera;

    const initLighting = settingsRef.current.lighting;

    // 3. Renderer (トーンマッピングは THREE.LinearToneMapping に固定)
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true, // 仮想カメラへのフレーム送出に必要
      powerPreference: 'high-performance',
    });
    renderer.setSize(1280, 720, false);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.LinearToneMapping;

    // 4. OrbitControls による自由なマウス操作 (位置・向き・距離の無段階調整)
    const controls = new OrbitControls(initialCamera, renderer.domElement);
    controls.target.copy(DEFAULT_CAM_TARGET.current);
    controls.enableDamping = true; // 滑らかな慣性移動
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true; // 右ドラッグで画面平行移動
    controls.minDistance = 0.2; // 近づきすぎ防止
    controls.maxDistance = 6.0; // 遠ざかりすぎ防止
    controls.maxPolarAngle = Math.PI - 0.05; // 地面下からのひっくり返り防止
    controls.minPolarAngle = 0.05;
    controlsRef.current = controls;

    // リセット用ハンドラーの伝播
    if (onResetCameraReady) {
      onResetCameraReady(() => {
        const curFov = settingsRef.current.lighting?.cameraFov ?? 0;
        const curIsOrtho = curFov === 0;
        if (curIsOrtho && orthoCameraRef.current) {
          const ortho = orthoCameraRef.current;
          ortho.position.set(0, 1.35, 0.9);
          ortho.zoom = 1;
          ortho.updateProjectionMatrix();
          controls.object = ortho;
          controls.target.copy(DEFAULT_CAM_TARGET.current);
          controls.update();
          activeCameraRef.current = ortho;
        } else if (perspCameraRef.current) {
          const persp = perspCameraRef.current;
          const dist = getIdealCamDistance(curFov > 0 ? curFov : 20);
          const dir = new THREE.Vector3(0, 0.03, 0.9).normalize();
          persp.fov = curFov > 0 ? curFov : 20;
          persp.updateProjectionMatrix();
          persp.position.copy(DEFAULT_CAM_TARGET.current).addScaledVector(dir, dist);
          controls.object = persp;
          controls.target.copy(DEFAULT_CAM_TARGET.current);
          controls.update();
          activeCameraRef.current = persp;
        }
      });
    }

    // 5. Lighting
    const dirLight = new THREE.DirectionalLight(
      initLighting?.mainLightColor || 0xffffff,
      initLighting?.mainLightIntensity ?? 1.0
    );
    if (initLighting) {
      const radX = (initLighting.mainLightAngleX * Math.PI) / 180;
      const radY = (initLighting.mainLightAngleY * Math.PI) / 180;
      const dist = 2.5;
      dirLight.position.set(
        dist * Math.cos(radY) * Math.sin(radX),
        dist * Math.sin(radY),
        dist * Math.cos(radY) * Math.cos(radX)
      );
    } else {
      dirLight.position.set(1.0, 1.5, 1.5).normalize();
    }
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(
      0xffffff,
      initLighting?.backLightIntensity ?? 1.0
    );
    backLight.position.set(-1.0, 1.5, -1.0).normalize();
    scene.add(backLight);

    const ambLight = new THREE.AmbientLight(
      initLighting?.ambientColor || 0xffffff,
      initLighting?.ambientIntensity ?? 1.0
    );
    scene.add(ambLight);

    if (initLighting) {
      renderer.toneMappingExposure = initLighting.exposure;
    }

    rendererRef.current = renderer;
    dirLightRef.current = dirLight;
    backLightRef.current = backLight;
    ambLightRef.current = ambLight;

    sceneRef.current = scene;
    setSceneState(scene);

    if (onCanvasReady) {
      onCanvasReady(canvas);
    }

    // 6. 描画ループ
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const renderLoop = () => {
      const delta = clock.getDelta();
      const currentSettings = settingsRef.current;

      // OrbitControls の更新 (ダンピング反映)
      controls.update();

      // トラッキングデータの適用
      if (latestTrackingDataRef.current && updateVRMRef.current) {
        updateVRMRef.current(
          latestTrackingDataRef.current,
          {
            faceSensitivity: currentSettings.tracking.faceSensitivity,
            faceSmoothing: currentSettings.tracking.faceSmoothing,
            blinkSensitivity: currentSettings.tracking.blinkSensitivity,
            mouthSensitivity: currentSettings.tracking.mouthSensitivity,
            handsEnabled: currentSettings.tracking.handsEnabled,
            handSmoothing: currentSettings.tracking.handSmoothing,
            armIKReach: currentSettings.tracking.armIKReach,
            returnLerpSpeed: currentSettings.tracking.returnLerpSpeed,
          },
          delta
        );
      }

      if (activeCameraRef.current) {
        renderer.render(scene, activeCameraRef.current);
      }

      // レンダリング直後の最新フレームを仮想カメラ送出ハンドラへ同期伝達
      if (onFrameRenderedRef.current) {
        const gl = renderer.getContext();
        onFrameRenderedRef.current(gl, canvas);
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      rendererRef.current = null;
      perspCameraRef.current = null;
      orthoCameraRef.current = null;
      activeCameraRef.current = null;
      controlsRef.current = null;
      dirLightRef.current = null;
      backLightRef.current = null;
      ambLightRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  // ライティング設定およびカメラFOVのリアルタイム動的更新
  useEffect(() => {
    const l = settings.lighting;
    if (!l) return;

    // カメラ画角 (FOV) の動的更新: 0 = 平行投影 (Orthographic), >0 = 透視投影 (Perspective)
    const targetFov = l.cameraFov ?? 0;
    const isOrtho = targetFov === 0;

    if (isOrtho) {
      if (activeCameraRef.current !== orthoCameraRef.current && orthoCameraRef.current) {
        const ortho = orthoCameraRef.current;
        const currentCam = activeCameraRef.current;
        if (currentCam) {
          ortho.position.copy(currentCam.position);
          ortho.quaternion.copy(currentCam.quaternion);
        }
        ortho.zoom = 1;
        ortho.updateProjectionMatrix();
        activeCameraRef.current = ortho;
        if (controlsRef.current) {
          controlsRef.current.object = ortho;
          controlsRef.current.update();
        }
      }
    } else {
      const persp = perspCameraRef.current;
      if (persp) {
        const prevFov = prevFovRef.current > 0 ? prevFovRef.current : 20;
        persp.fov = targetFov;
        persp.updateProjectionMatrix();

        if (activeCameraRef.current !== persp) {
          const currentCam = activeCameraRef.current;
          if (currentCam) {
            persp.position.copy(currentCam.position);
            persp.quaternion.copy(currentCam.quaternion);
          }
          activeCameraRef.current = persp;
          if (controlsRef.current) {
            controlsRef.current.object = persp;
          }
        } else {
          // Perspective 間でのドリー補正 (見かけサイズ維持)
          if (controlsRef.current && prevFov > 0) {
            const target = controlsRef.current.target;
            const offset = persp.position.clone().sub(target);
            const curDist = offset.length();
            if (curDist > 0.001) {
              const scale =
                Math.tan((prevFov * Math.PI) / 360) /
                Math.tan((targetFov * Math.PI) / 360);
              offset.multiplyScalar(scale);
              persp.position.copy(target).add(offset);
            }
          }
        }
        if (controlsRef.current) {
          controlsRef.current.update();
        }
      }
    }
    prevFovRef.current = targetFov;

    if (dirLightRef.current) {
      dirLightRef.current.intensity = l.mainLightIntensity;
      dirLightRef.current.color.set(l.mainLightColor);

      const radX = (l.mainLightAngleX * Math.PI) / 180;
      const radY = (l.mainLightAngleY * Math.PI) / 180;
      const dist = 2.5;
      dirLightRef.current.position.set(
        dist * Math.cos(radY) * Math.sin(radX),
        dist * Math.sin(radY),
        dist * Math.cos(radY) * Math.cos(radX)
      );
    }

    if (backLightRef.current) {
      backLightRef.current.intensity = l.backLightIntensity;
    }

    if (ambLightRef.current) {
      ambLightRef.current.intensity = l.ambientIntensity;
      ambLightRef.current.color.set(l.ambientColor);
    }

    if (rendererRef.current) {
      rendererRef.current.toneMappingExposure = l.exposure;
    }
  }, [settings.lighting]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-[#141414] overflow-hidden"
    >
      {/* 16:9 アスペクト比を維持するキャンバスラッパー */}
      <div
        className="relative aspect-video max-w-full max-h-full w-auto h-auto shadow-2xl flex items-center justify-center overflow-hidden"
        style={{ aspectRatio: '16 / 9' }}
      >
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full object-contain block cursor-grab active:cursor-grabbing"
        />

        {/* ロード中スピナー / 起動準備中オーバーレイ */}
        {(isLoading || !currentVrm || !isTrackingInitialized) && (
          <div className="absolute inset-0 bg-charcoal-bg/95 flex flex-col items-center justify-center backdrop-blur-md z-10">
            <div className="w-9 h-9 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
            <p className="text-charcoal-text text-sm font-medium tracking-wide mb-1">
              {!currentVrm || isLoading
                ? 'アバターモデルを読み込み中...'
                : 'AIトラッキングエンジンを準備中...'}
            </p>
            <p className="text-charcoal-text-muted text-xs">
              {!isTrackingInitialized
                ? 'カメラとMediaPipeを初期化しています'
                : 'まもなく準備が完了します'}
            </p>
          </div>
        )}

        {/* ロードエラー */}
        {loadError && (
          <div className="absolute bottom-4 left-4 right-4 bg-red-950/80 border border-red-500/50 p-4 rounded-lg text-red-200 text-xs backdrop-blur-md z-10">
            {loadError}
          </div>
        )}

        {/* ステータスバッジ (画面左下) */}
        <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-charcoal-container border border-charcoal-border px-2.5 py-1 rounded-full text-xs text-charcoal-text pointer-events-none select-none z-10 shadow-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              currentVrm && trackingStatus.faceDetected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span>{currentVrm ? (trackingStatus.faceDetected ? 'アバター追従中' : '顔探索中') : 'モデル待機中'}</span>
          {settings.tracking.handsEnabled && (
            <>
              <span className="text-charcoal-text-muted opacity-40">|</span>
              <span
                className={
                  trackingStatus.leftHandDetected || trackingStatus.rightHandDetected
                    ? 'text-emerald-500 font-medium'
                    : 'text-charcoal-text-muted'
                }
              >
                手: {trackingStatus.leftHandDetected ? '左' : ''}
                {trackingStatus.rightHandDetected ? '右' : ''}
                {!trackingStatus.leftHandDetected && !trackingStatus.rightHandDetected ? 'なし' : ''}
              </span>
            </>
          )}
          <span className="text-charcoal-text-muted opacity-40">|</span>
          <span className="text-charcoal-text-muted">{trackingStatus.fps} FPS</span>
        </div>
      </div>
    </div>
  );
};
