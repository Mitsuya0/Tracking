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
  const DEFAULT_CAM_POS = useRef(new THREE.Vector3(0, 1.35, 0.9));
  const DEFAULT_CAM_TARGET = useRef(new THREE.Vector3(0, 1.32, 0));

  // Three.js シーンの初期化
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(settings.background.color);

    // 2. Camera (画角 30度で歪みの少ないポートレート向き設定)
    const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 20.0);
    camera.position.copy(DEFAULT_CAM_POS.current);
    camera.lookAt(DEFAULT_CAM_TARGET.current);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true, // 仮想カメラへのフレーム送出に必要
      powerPreference: 'high-performance',
    });
    renderer.setSize(1280, 720, false);
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    // 4. OrbitControls による自由なマウス操作 (位置・向き・距離の無段階調整)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(DEFAULT_CAM_TARGET.current);
    controls.enableDamping = true; // 滑らかな慣性移動
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true; // 右ドラッグで画面平行移動
    controls.minDistance = 0.2; // 近づきすぎ防止
    controls.maxDistance = 6.0; // 遠ざかりすぎ防止
    controls.maxPolarAngle = Math.PI - 0.05; // 地面下からのひっくり返り防止
    controls.minPolarAngle = 0.05;

    // リセット用ハンドラーの伝播
    if (onResetCameraReady) {
      onResetCameraReady(() => {
        camera.position.copy(DEFAULT_CAM_POS.current);
        controls.target.copy(DEFAULT_CAM_TARGET.current);
        controls.update();
      });
    }

    // 5. Lighting
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(1.0, 1.5, 1.5).normalize();
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
    backLight.position.set(-1.0, 1.5, -1.0).normalize();
    scene.add(backLight);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambLight);

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

      renderer.render(scene, camera);

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
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-charcoal-bg overflow-hidden"
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
        <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-charcoal-surface/85 border border-charcoal-border px-2 py-1 rounded-full text-xs text-charcoal-text backdrop-blur-md pointer-events-none select-none z-10 shadow-sm">
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
