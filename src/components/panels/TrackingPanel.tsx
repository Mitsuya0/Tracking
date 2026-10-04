import React from 'react';
import { Switch, Icon } from '@charcoal-ui/react';
import type { AppSettings } from '../../types';

interface TrackingPanelProps {
  settings: AppSettings;
  updateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
}

export const TrackingPanel: React.FC<TrackingPanelProps> = ({
  settings,
  updateSettings,
}) => {
  const tracking = settings.tracking;

  const updateTracking = <K extends keyof typeof tracking>(
    key: K,
    value: (typeof tracking)[K]
  ) => {
    updateSettings((prev) => ({
      ...prev,
      tracking: {
        ...prev.tracking,
        [key]: value,
      },
    }));
  };

  return (
    <div className="space-y-6 text-sm text-slate-200">
      {/* 1. 顔トラッキング設定 */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          <Icon name="24/FaceEdit" className="text-purple-400" />
          顔・表情トラッキング
        </label>

        <div className="space-y-4 bg-slate-900/60 border border-slate-800 p-3.5 rounded-lg">
          {/* 顔追従感度 */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">頭部追従感度</span>
              <span className="text-indigo-400 font-mono">{tracking.faceSensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              value={tracking.faceSensitivity}
              onChange={(e) => updateTracking('faceSensitivity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* スムージング強度 */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">頭部スムージング (ブレ抑制)</span>
              <span className="text-indigo-400 font-mono">{(tracking.faceSmoothing * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.9"
              step="0.05"
              value={tracking.faceSmoothing}
              onChange={(e) => updateTracking('faceSmoothing', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* まばたき感度 */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">まばたき感度</span>
              <span className="text-indigo-400 font-mono">{tracking.blinkSensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={tracking.blinkSensitivity}
              onChange={(e) => updateTracking('blinkSensitivity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* リップシンク感度 */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">口の開閉・リップシンク感度</span>
              <span className="text-indigo-400 font-mono">{tracking.mouthSensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={tracking.mouthSensitivity}
              onChange={(e) => updateTracking('mouthSensitivity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* トラッキング推論FPS (負荷調整) */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">推論レート (低スペック対策)</span>
              <span className="text-purple-400 font-mono">{tracking.targetFps || 30} FPS</span>
            </div>
            <input
              type="range"
              min="15"
              max="30"
              step="3"
              value={tracking.targetFps || 30}
              onChange={(e) => updateTracking('targetFps', parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              数値を下げるとMediaPipeのAI推論負荷が下がり、Meet等の動作が軽くなります
            </p>
          </div>
        </div>
      </div>

      {/* 2. ハンドトラッキング設定 */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          <Icon name="24/Body" className="text-emerald-400" />
          ハンドトラッキング (両手・指)
        </label>

        <div className="space-y-4 bg-slate-900/60 border border-slate-800 p-3.5 rounded-lg">
          {/* 有効・無効トグル (負荷軽減用) */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white">手の追従を有効化</p>
              <p className="text-[11px] text-slate-400">オフにするとCPU/GPU負荷を軽減</p>
            </div>
            <Switch
              checked={tracking.handsEnabled}
              onChange={(checked) => updateTracking('handsEnabled', checked)}
            />
          </div>

          {tracking.handsEnabled && (
            <>
              {/* 腕の可動域 (IK Reach) */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">腕の可動域 (IK Reach)</span>
                  <span className="text-emerald-400 font-mono">{tracking.armIKReach.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.8"
                  step="0.1"
                  value={tracking.armIKReach}
                  onChange={(e) => updateTracking('armIKReach', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* 手のスムージング */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">手のスムージング</span>
                  <span className="text-emerald-400 font-mono">{(tracking.handSmoothing * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.9"
                  step="0.05"
                  value={tracking.handSmoothing}
                  onChange={(e) => updateTracking('handSmoothing', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* ロスト時復帰速度 */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">ロスト時の脱力復帰速度 (Lerp)</span>
                  <span className="text-emerald-400 font-mono">{(tracking.returnLerpSpeed * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.2"
                  step="0.01"
                  value={tracking.returnLerpSpeed}
                  onChange={(e) => updateTracking('returnLerpSpeed', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
