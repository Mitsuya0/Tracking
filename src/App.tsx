import React, { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ThreeCanvas } from './components/ThreeCanvas';
import { IconBar } from './components/IconBar';
import { DrawerPanel } from './components/DrawerPanel';
import { SettingsPanel } from './components/panels/SettingsPanel';
import { TrackingPanel } from './components/panels/TrackingPanel';
import { AssetsPanel } from './components/panels/AssetsPanel';
import { useTracking } from './hooks/useTracking';
import type { AppSettings, ActivePanel } from './types';

const STORAGE_KEY = 'solotracking_settings_v1';

const defaultSettings: AppSettings = {
  theme: 'light',
  selectedCameraId: '',
  performanceMode: 'balanced',
  background: {
    mode: 'color',
    color: '#f8fafc',
    imageUrl: null,
    fit: 'cover',
  },
  tracking: {
    faceEnabled: true,
    faceSensitivity: 1.0,
    faceSmoothing: 0.35,
    blinkSensitivity: 1.2,
    mouthSensitivity: 1.3,
    handsEnabled: true,
    handSmoothing: 0.4,
    armIKReach: 1.0,
    returnLerpSpeed: 0.08,
    targetFps: 30,
  },
  virtualCam: {
    enabled: false,
    width: 1280,
    height: 720,
    fps: 30,
  },
  customVrmUrl: null,
};

export const App: React.FC = () => {
  // 設定状態（ローカルストレージと同期）
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
    return defaultSettings;
  });

  // テーマ属性の同期
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme || 'light';
  }, [settings.theme]);

  // 設定保存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, [settings]);

  // UI状態
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const [isVirtualCamRunning, setIsVirtualCamRunning] = useState(false);
  const [virtualCamDeviceName, setVirtualCamDeviceName] = useState<string>('OBS Virtual Camera');

  // カメラ位置・向き・距離のリセットハンドラ参照 (マウス操作後の初期視点復帰用)
  const resetCameraRef = useRef<(() => void) | null>(null);

  // トラッキングフック
  const {
    videoRef,
    isInitialized: isTrackingInitialized,
    availableDevices,
    status: trackingStatus,
    latestTrackingDataRef,
    setPreviewCallback,
  } = useTracking({
    selectedCameraId: settings.selectedCameraId,
    handsEnabled: settings.tracking.handsEnabled,
    targetFps: settings.tracking.targetFps,
  });

  // 初回カメラ選択
  useEffect(() => {
    if (!settings.selectedCameraId && availableDevices.length > 0) {
      setSettings((prev) => ({
        ...prev,
        selectedCameraId: availableDevices[0].deviceId,
      }));
    }
  }, [availableDevices, settings.selectedCameraId]);

  // Canvas 参照（仮想カメラ送出用）
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // 再利用ピクセルバッファ (メモリ確保とガベージコレクションの完全ゼロ化)
  const pixelBufferRef = useRef<Uint8Array | null>(null);

  // 仮想カメラの起動/停止
  const toggleVirtualCam = useCallback(async () => {
    if (isVirtualCamRunning) {
      try {
        await invoke('stop_virtual_camera');
        setIsVirtualCamRunning(false);
      } catch (err) {
        console.error('Failed to stop virtual camera:', err);
      }
    } else {
      try {
        const deviceName = await invoke<string>('start_virtual_camera', {
          width: settings.virtualCam.width,
          height: settings.virtualCam.height,
          fps: settings.virtualCam.fps,
        });
        if (deviceName) {
          setVirtualCamDeviceName(deviceName);
        }
        setIsVirtualCamRunning(true);
      } catch (err: any) {
        console.error('Failed to start virtual camera:', err);
        alert(`仮想カメラの起動に失敗しました: ${err}`);
      }
    }
  }, [isVirtualCamRunning, settings.virtualCam]);

  // 仮想カメラフレーム送出ハンドラー（Three.js レンダリング直後に同期実行・キュー蓄積完全排除）
  const lastSendTimeRef = useRef(0);
  const isSendingRef = useRef(false);

  const handleFrameRendered = useCallback(
    async (gl: WebGLRenderingContext | WebGL2RenderingContext, canvas: HTMLCanvasElement) => {
      // 仮想カメラ未起動、または直前フレームの転送中なら即座にスキップ（古いフレームのキュー滞留を完全防止）
      if (!isVirtualCamRunning || isSendingRef.current) return;

      const now = performance.now();
      const minInterval = 1000 / settings.virtualCam.fps;
      if (now - lastSendTimeRef.current < minInterval) return;

      isSendingRef.current = true;
      lastSendTimeRef.current = now;

      try {
        const width = canvas.width;
        const height = canvas.height;
        const totalBytes = width * height * 4;

        // ピクセルバッファの再利用（GCスパイクゼロ）
        if (!pixelBufferRef.current || pixelBufferRef.current.byteLength !== totalBytes) {
          pixelBufferRef.current = new Uint8Array(totalBytes);
        }
        const pixels = pixelBufferRef.current;

        // レンダリング直後の描画バッファから最新ピクセルを取得（遅延ゼロ）
        gl.readPixels(
          0,
          0,
          width,
          height,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixels
        );

        // 生の Uint8Array をそのまま Tauri バイナリ IPC へ送出
        // （Rust側で高速1パスNV12変換され DirectShow へ即時書き込み）
        await invoke('send_camera_frame', {
          frame: pixels,
        });
      } catch (err) {
        console.error('Error sending frame to virtual camera:', err);
      } finally {
        isSendingRef.current = false;
      }
    },
    [isVirtualCamRunning, settings.virtualCam.fps]
  );

  // アングル・位置・距離のリセット
  const handleResetCamera = useCallback(() => {
    if (resetCameraRef.current) {
      resetCameraRef.current();
    }
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-charcoal-bg text-charcoal-text flex select-none">
      {/* 1. 不可視のWebカメラ映像 (プライバシー保護仕様: メイン画面には非表示) */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="hidden"
      />

      {/* 2. 16:9 レターボックス アバターキャンバス */}
      <div className="flex-1 w-full h-full relative">
        <ThreeCanvas
          settings={settings}
          latestTrackingDataRef={latestTrackingDataRef}
          trackingStatus={trackingStatus}
          isTrackingInitialized={isTrackingInitialized}
          onCanvasReady={(c) => {
            canvasRef.current = c;
          }}
          onResetCameraReady={(handler) => {
            resetCameraRef.current = handler;
          }}
          onFrameRendered={handleFrameRendered}
        />
      </div>

      {/* 3. アイコンバー (右端常駐) */}
      <IconBar
        activePanel={activePanel}
        onTogglePanel={setActivePanel}
        onResetCamera={handleResetCamera}
        isVirtualCamRunning={isVirtualCamRunning}
      />

      {/* 4. 開閉式サイドパネル */}
      <DrawerPanel
        activePanel={activePanel}
        onClose={() => setActivePanel('none')}
      >
        {activePanel === 'settings' && (
          <SettingsPanel
            settings={settings}
            updateSettings={setSettings}
            availableDevices={availableDevices}
            setPreviewCallback={setPreviewCallback}
            trackingStatus={trackingStatus}
            isVirtualCamRunning={isVirtualCamRunning}
            virtualCamDeviceName={virtualCamDeviceName}
            onToggleVirtualCam={toggleVirtualCam}
          />
        )}
        {activePanel === 'tracking' && (
          <TrackingPanel
            settings={settings}
            updateSettings={setSettings}
          />
        )}
        {activePanel === 'assets' && (
          <AssetsPanel
            settings={settings}
            updateSettings={setSettings}
            onResetCamera={handleResetCamera}
          />
        )}
      </DrawerPanel>
    </div>
  );
};

export default App;
