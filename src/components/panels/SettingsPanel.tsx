import React from 'react';
import { Camera, Video, VideoOff, Cpu } from 'lucide-react';
import { CameraPreview } from './CameraPreview';
import type { AppSettings, TrackingStatus, PerformanceMode } from '../../types';
import type { TrackingData } from '../../utils/kalidoSolver';

interface SettingsPanelProps {
  settings: AppSettings;
  updateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  availableDevices: MediaDeviceInfo[];
  setPreviewCallback: (callback: ((video: HTMLVideoElement, data: TrackingData) => void) | null) => void;
  trackingStatus: TrackingStatus;
  isVirtualCamRunning: boolean;
  virtualCamDeviceName: string;
  onToggleVirtualCam: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  updateSettings,
  availableDevices,
  setPreviewCallback,
  trackingStatus,
  isVirtualCamRunning,
  virtualCamDeviceName,
  onToggleVirtualCam,
}) => {
  // パフォーマンスモード切り替え
  const handlePerformanceModeChange = (mode: PerformanceMode) => {
    updateSettings((prev) => {
      if (mode === 'economy') {
        return {
          ...prev,
          performanceMode: 'economy',
          tracking: {
            ...prev.tracking,
            handsEnabled: false, // 手のトラッキングをOFFにしてCPU/GPU消費を大幅軽減
            targetFps: 24,       // 推論を24fpsに抑える
          },
          virtualCam: {
            ...prev.virtualCam,
            fps: 24,             // 仮想カメラも24fpsで負荷・転送量を抑制
          },
        };
      } else {
        return {
          ...prev,
          performanceMode: 'balanced',
          tracking: {
            ...prev.tracking,
            handsEnabled: true,
            targetFps: 30,
          },
          virtualCam: {
            ...prev.virtualCam,
            fps: 30,
          },
        };
      }
    });
  };

  return (
    <div className="space-y-6 text-sm text-slate-200">
      {/* 1. パフォーマンス動作モード (Meet同時利用向け省電力) */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          動作パフォーマンス
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handlePerformanceModeChange('economy')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              settings.performanceMode === 'economy'
                ? 'bg-emerald-950/40 border-emerald-500/60 text-white shadow-sm shadow-emerald-900/30'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="text-xs font-semibold flex items-center gap-1.5 text-emerald-300">
              🌿 エコモード
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Google Meet推奨。手追従OFF・24FPSでCPU/GPU負荷を最小化
            </div>
          </button>

          <button
            onClick={() => handlePerformanceModeChange('balanced')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              settings.performanceMode === 'balanced'
                ? 'bg-indigo-950/40 border-indigo-500/60 text-white shadow-sm shadow-indigo-900/30'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="text-xs font-semibold flex items-center gap-1.5 text-indigo-300">
              ⚖️ 標準モード
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              標準設定。手追従ON・30FPSのフル機能追従
            </div>
          </button>
        </div>
      </div>

      {/* 2. Webカメラ選択 */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          <Camera className="w-4 h-4 text-indigo-400" />
          Webカメラ入力
        </label>
        <select
          value={settings.selectedCameraId}
          onChange={(e) =>
            updateSettings((prev) => ({
              ...prev,
              selectedCameraId: e.target.value,
            }))
          }
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
        >
          {availableDevices.map((device, idx) => (
            <option key={device.deviceId || idx} value={device.deviceId}>
              {device.label || `カメラ ${idx + 1}`}
            </option>
          ))}
          {availableDevices.length === 0 && (
            <option value="">利用可能なカメラが見つかりません</option>
          )}
        </select>
      </div>

      {/* 3. 入力プレビュー (プライバシー保護仕様) */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          カメラ認識確認
        </label>
        <CameraPreview
          setPreviewCallback={setPreviewCallback}
          isOpen={true}
        />
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>顔追従: {trackingStatus.faceDetected ? '✅ 認識中' : '❌ 未検出'}</span>
          <span>手認識: {trackingStatus.leftHandDetected || trackingStatus.rightHandDetected ? '✅ 認識中' : '未検出'}</span>
        </div>
      </div>

      {/* 4. 仮想カメラ出力 (FR-6要件) */}
      <div className="pt-2 border-t border-slate-800">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          {isVirtualCamRunning ? (
            <Video className="w-4 h-4 text-emerald-400" />
          ) : (
            <VideoOff className="w-4 h-4 text-slate-500" />
          )}
          仮想カメラ出力 (Web会議向け)
        </label>

        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white">
                {isVirtualCamRunning ? virtualCamDeviceName : '仮想カメラデバイス'}
              </p>
              <p className="text-[11px] text-slate-400">
                {isVirtualCamRunning
                  ? 'Google Meet等のカメラ設定で選択してください'
                  : 'Web会議アプリへアバター映像を出力'}
              </p>
            </div>
            <button
              onClick={onToggleVirtualCam}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                isVirtualCamRunning
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30'
              }`}
            >
              {isVirtualCamRunning ? '送出停止' : '仮想カメラ開始'}
            </button>
          </div>

          <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
            <span>解像度: 1280×720 (16:9)</span>
            <div className="flex items-center gap-1.5">
              <span>送出FPS:</span>
              <select
                disabled={isVirtualCamRunning}
                value={settings.virtualCam.fps}
                onChange={(e) => {
                  const fps = Number(e.target.value);
                  updateSettings((prev) => ({
                    ...prev,
                    virtualCam: { ...prev.virtualCam, fps },
                    tracking: { ...prev.tracking, targetFps: fps },
                  }));
                }}
                className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-200 focus:outline-none disabled:opacity-50"
              >
                <option value={15}>15 FPS (超軽量)</option>
                <option value={24}>24 FPS (省エネ・Meet推奨)</option>
                <option value={30}>30 FPS (標準)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

