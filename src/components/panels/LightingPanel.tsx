import React from 'react';
import { Button, Icon } from '@charcoal-ui/react';
import type { AppSettings, LightingSettings } from '../../types';

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

  // ライティングプリセット
  const presets: { label: string; desc: string; config: LightingSettings }[] = [
    {
      label: 'スタジオ標準',
      desc: '自然でバランスの取れた標準ライティング',
      config: {
        mainLightIntensity: 1.4,
        mainLightColor: '#ffffff',
        mainLightAngleX: 30,
        mainLightAngleY: 45,
        ambientIntensity: 0.9,
        ambientColor: '#ffffff',
        backLightIntensity: 0.6,
        exposure: 1.0,
      },
    },
    {
      label: '美白・ブライト',
      desc: '明るく透明感のある美肌・配信向けトーン',
      config: {
        mainLightIntensity: 1.8,
        mainLightColor: '#ffffff',
        mainLightAngleX: 15,
        mainLightAngleY: 35,
        ambientIntensity: 1.1,
        ambientColor: '#ffffff',
        backLightIntensity: 0.8,
        exposure: 1.15,
      },
    },
    {
      label: 'ウォーム（夕暮れ）',
      desc: '温かみのある柔らかいアンビエント光',
      config: {
        mainLightIntensity: 1.5,
        mainLightColor: '#ffe5d0',
        mainLightAngleX: 45,
        mainLightAngleY: 30,
        ambientIntensity: 0.85,
        ambientColor: '#fff1e6',
        backLightIntensity: 0.7,
        exposure: 1.0,
      },
    },
    {
      label: 'クール・サイバー',
      desc: 'エッジの立った近未来的な青白いトーン',
      config: {
        mainLightIntensity: 1.3,
        mainLightColor: '#d6e4ff',
        mainLightAngleX: -40,
        mainLightAngleY: 50,
        ambientIntensity: 0.7,
        ambientColor: '#e0ecff',
        backLightIntensity: 1.2,
        exposure: 0.95,
      },
    },
  ];

  // 光色カラーパレット
  const lightColorPresets = [
    { label: 'ナチュラル (純白)', color: '#ffffff' },
    { label: '温白色 (ウォーム)', color: '#ffe8d6' },
    { label: '昼光色 (クール)', color: '#e8f0fe' },
    { label: 'サンセット (夕陽)', color: '#ffd6a5' },
    { label: 'サイバー (ネオン)', color: '#f3e8ff' },
  ];

  const applyPreset = (presetConfig: LightingSettings) => {
    updateSettings((prev) => ({
      ...prev,
      lighting: { ...presetConfig },
    }));
  };

  return (
    <div className="space-y-6 text-sm text-charcoal-text">
      {/* 0. クイックプリセット */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-charcoal-text-muted uppercase tracking-wider mb-2">
          <Icon name="24/Sun" className="text-charcoal-text-muted" />
          演出プリセット
        </label>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.config)}
              className="p-2 rounded-lg border border-charcoal-border bg-charcoal-container-secondary hover:bg-charcoal-container-tertiary transition-all text-left"
            >
              <div className="text-xs font-semibold text-charcoal-text">{p.label}</div>
              <div className="text-xs text-charcoal-text-muted mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 1. メインライト (主光源) */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-charcoal-text-muted uppercase tracking-wider mb-2">
          <Icon name="24/Sun" className="text-charcoal-text-muted" />
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
          <Icon name="24/Palette" className="text-charcoal-text-muted" />
          環境光・陰影バランス
        </label>

        <div className="space-y-4 bg-charcoal-container-secondary border border-charcoal-border p-4 rounded-lg">
          {/* 環境光 (全体底上げ) */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-charcoal-text">環境光 (全体の陰の明るさ)</span>
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
            <p className="text-xs text-charcoal-text-muted mt-1">
              数値を上げると影が薄くなり、ふんわりと明るくなります
            </p>
          </div>

          {/* バックライト / リムライト */}
          <div className="pt-2 border-t border-charcoal-border">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-charcoal-text">リムライト (背後からの輪郭光)</span>
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
            <p className="text-xs text-charcoal-text-muted mt-1">
              モデルの頭部や肩の輪郭にハイライトを当てて立体感を強調します
            </p>
          </div>
        </div>
      </div>

      {/* 3. 画面全体の露出・トーン */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-charcoal-text-muted uppercase tracking-wider mb-2">
          <Icon name="24/Settings" className="text-charcoal-text-muted" />
          画面全体の露出 (トーンマッピング)
        </label>

        <div className="space-y-4 bg-charcoal-container-secondary border border-charcoal-border p-4 rounded-lg">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-charcoal-text">露出度 (Exposure)</span>
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

          <div className="pt-2 border-t border-charcoal-border">
            <Button
              variant="Default"
              size="S"
              fullWidth
              onClick={() => applyPreset(presets[0].config)}
            >
              ライティング設定を初期値にリセット
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

