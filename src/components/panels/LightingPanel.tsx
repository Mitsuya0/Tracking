import React from 'react';
import { Button, Icon } from '@charcoal-ui/react';
import type { AppSettings, LightingSettings } from '../../types';

const DEFAULT_LIGHTING: LightingSettings = {
  mainLightIntensity: 1.0,
  mainLightColor: '#ffffff',
  mainLightAngleX: 0,
  mainLightAngleY: 0,
  ambientIntensity: 1.0,
  ambientColor: '#ffffff',
  backLightIntensity: 1.0,
  exposure: 1.0,
  cameraFov: 0,
};

interface LightingPanelProps {
  settings: AppSettings;
  updateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
}

export const LightingPanel: React.FC<LightingPanelProps> = ({
  settings,
  updateSettings,
}) => {
  const lighting = settings.lighting;

  const updateLighting = <K extends keyof LightingSettings>(
    key: K,
    value: LightingSettings[K]
  ) => {
    updateSettings((prev) => ({
      ...prev,
      lighting: {
        ...prev.lighting,
        [key]: value,
      },
    }));
  };

  // 光色カラーパレット
  const lightColorPresets = [
    { label: 'ナチュラル (純白)', color: '#ffffff' },
    { label: '温白色 (ウォーム)', color: '#ffe8d6' },
    { label: '昼光色 (クール)', color: '#e8f0fe' },
    { label: 'サンセット (夕陽)', color: '#ffd6a5' },
    { label: 'サイバー (ネオン)', color: '#f3e8ff' },
  ];

  const resetToDefault = () => {
    updateSettings((prev) => ({
      ...prev,
      lighting: { ...DEFAULT_LIGHTING },
    }));
  };

  return (
    <div className="space-y-6 text-sm text-charcoal-text">
      {/* 1. メインライト (主光源) */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-charcoal-text-muted uppercase tracking-wider mb-2">
          <Icon name="24/Sun" fixedSize={16} className="text-charcoal-text-muted" />
          メインライト (主光源)
        </label>

        <div className="space-y-4 bg-charcoal-container-secondary border border-charcoal-border p-4 rounded-lg">
          {/* 明るさ (強度) */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-charcoal-text">光の明るさ (強度)</span>
              <span className="text-indigo-500 dark:text-indigo-400 font-mono">
                {lighting.mainLightIntensity.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="3.0"
              step="0.1"
              value={lighting.mainLightIntensity}
              onChange={(e) => updateLighting('mainLightIntensity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-charcoal-container-tertiary rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* 光の色 */}
          <div>
            <p className="text-xs text-charcoal-text mb-2">光の色合い</p>
            <div className="flex items-center gap-2">
              {lightColorPresets.map((p) => (
                <button
                  key={p.color}
                  onClick={() => updateLighting('mainLightColor', p.color)}
                  title={p.label}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    lighting.mainLightColor.toLowerCase() === p.color.toLowerCase()
                      ? 'border-indigo-500 scale-105'
                      : 'border-charcoal-border'
                  }`}
                  style={{ backgroundColor: p.color }}
                />
              ))}

              {/* カスタムカラーピッカー */}
              <input
                type="color"
                value={lighting.mainLightColor}
                onChange={(e) => updateLighting('mainLightColor', e.target.value)}
                className="w-7 h-7 rounded-full overflow-hidden cursor-pointer border border-charcoal-border bg-transparent p-0"
              />
            </div>
          </div>

          {/* 光の照射角度 (左右・上下) */}
          <div className="pt-2 border-t border-charcoal-border space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-charcoal-text">照射方向 (左右水平角度)</span>
                <span className="text-indigo-500 dark:text-indigo-400 font-mono">
                  {lighting.mainLightAngleX > 0 ? `+${lighting.mainLightAngleX}` : lighting.mainLightAngleX}°
                </span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="5"
                value={lighting.mainLightAngleX}
                onChange={(e) => updateLighting('mainLightAngleX', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-charcoal-container-tertiary rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-charcoal-text">照射高さ (仰角・上下)</span>
                <span className="text-indigo-500 dark:text-indigo-400 font-mono">
                  {lighting.mainLightAngleY}°
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={lighting.mainLightAngleY}
                onChange={(e) => updateLighting('mainLightAngleY', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-charcoal-container-tertiary rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. 環境光 & リムライト (立体感と陰影調整) */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-charcoal-text-muted uppercase tracking-wider mb-2">
          <Icon name="24/Palette" fixedSize={16} className="text-charcoal-text-muted" />
          環境光・陰影バランス
        </label>

        <div className="space-y-4 bg-charcoal-container-secondary border border-charcoal-border p-4 rounded-lg">
          {/* 環境光 (全体底上げ) */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-charcoal-text">環境光 (全体の明るさ)</span>
              <span className="text-indigo-500 dark:text-indigo-400 font-mono">
                {lighting.ambientIntensity.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="2.0"
              step="0.05"
              value={lighting.ambientIntensity}
              onChange={(e) => updateLighting('ambientIntensity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-charcoal-container-tertiary rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* バックライト / リムライト */}
          <div className="pt-2 border-t border-charcoal-border">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-charcoal-text">リムライト (輪郭強調)</span>
              <span className="text-indigo-500 dark:text-indigo-400 font-mono">
                {lighting.backLightIntensity.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="2.0"
              step="0.1"
              value={lighting.backLightIntensity}
              onChange={(e) => updateLighting('backLightIntensity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-charcoal-container-tertiary rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 3. 画面全体の露出 */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-charcoal-text-muted uppercase tracking-wider mb-2">
          <Icon name="24/Settings" fixedSize={16} className="text-charcoal-text-muted" />
          露出度 (ToneMapping Exposure)
        </label>

        <div className="bg-charcoal-container-secondary border border-charcoal-border p-4 rounded-lg">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-charcoal-text">露出度</span>
            <span className="text-indigo-500 dark:text-indigo-400 font-mono">
              {lighting.exposure.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.05"
            value={lighting.exposure}
            onChange={(e) => updateLighting('exposure', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-charcoal-container-tertiary rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </div>

      {/* 4. カメラ視野角 (FOV) */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-charcoal-text-muted uppercase tracking-wider mb-2">
          <Icon name="24/Camera" fixedSize={16} className="text-charcoal-text-muted" />
          カメラ視野角 (FOV)
        </label>

        <div className="bg-charcoal-container-secondary border border-charcoal-border p-4 rounded-lg">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-charcoal-text">視野角 (Field of View)</span>
            <span className="text-indigo-500 dark:text-indigo-400 font-mono">
              {lighting.cameraFov === 0 ? '0° (平行投影・歪みなし)' : `${lighting.cameraFov}°`}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            step="1"
            value={lighting.cameraFov ?? 0}
            onChange={(e) => updateLighting('cameraFov', parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-charcoal-container-tertiary rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <p className="text-xs text-charcoal-text-muted mt-1 leading-relaxed">
            0° に設定するとパースペクティブ歪みのない平行投影になり、数値を上げると遠近感のついた透視投影になります。
          </p>
        </div>
      </div>

      {/* 初期値リセット */}
      <div className="pt-2">
        <Button
          variant="Default"
          size="S"
          fullWidth
          onClick={resetToDefault}
        >
          ライティング設定を初期値にリセット
        </Button>
      </div>
    </div>
  );
};
