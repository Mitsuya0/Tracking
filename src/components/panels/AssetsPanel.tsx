import React, { useRef } from 'react';
import { Button, Icon } from '@charcoal-ui/react';
import type { AppSettings } from '../../types';

interface AssetsPanelProps {
  settings: AppSettings;
  updateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  onResetCamera?: () => void;
}

export const AssetsPanel: React.FC<AssetsPanelProps> = ({
  settings,
  updateSettings,
  onResetCamera,
}) => {
  const vrmInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  // VRMファイル選択ハンドラ
  const handleVrmFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      updateSettings((prev) => ({
        ...prev,
        customVrmUrl: url,
      }));
    }
  };

  // VRMドロップハンドラ
  const handleVrmDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.vrm')) {
      const url = URL.createObjectURL(file);
      updateSettings((prev) => ({
        ...prev,
        customVrmUrl: url,
      }));
    }
  };

  // 背景画像選択ハンドラ
  const handleBgImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      updateSettings((prev) => ({
        ...prev,
        background: {
          ...prev.background,
          mode: 'image',
          imageUrl: url,
        },
      }));
    }
  };

  // カラープリセット
  const colorPresets = [
    { label: 'ダーク', color: '#0b0f19' },
    { label: 'グリーン (Chroma)', color: '#00ff00' },
    { label: 'ブルー (Chroma)', color: '#0000ff' },
    { label: 'オフィス', color: '#1e293b' },
    { label: 'ウォーム', color: '#27202b' },
  ];

  return (
    <div className="space-y-6 text-sm text-slate-200">
      {/* 1. VRMアバターの変更 */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          <Icon name="24/Body" className="text-indigo-400" />
          VRM アバター切り替え
        </label>

        <input
          ref={vrmInputRef}
          type="file"
          accept=".vrm"
          onChange={handleVrmFileChange}
          className="hidden"
        />

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleVrmDrop}
          onClick={() => vrmInputRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-700 hover:border-indigo-500/80 bg-slate-900/60 hover:bg-slate-900/90 rounded-lg p-4 text-center cursor-pointer transition-all group"
        >
          <div className="flex justify-center mb-2">
            <Icon name="24/AddImage" className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
          </div>
          <p className="text-xs font-medium text-slate-200">
            {settings.customVrmUrl ? 'カスタムVRM適用中' : 'デフォルトVRM表示中'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            クリックまたは .vrm をドラッグ＆ドロップ
          </p>
        </div>

        {settings.customVrmUrl && (
          <div className="mt-2">
            <Button
              variant="Default"
              size="S"
              onClick={() =>
                updateSettings((prev) => ({ ...prev, customVrmUrl: null }))
              }
            >
              デフォルトアバターに戻す
            </Button>
          </div>
        )}
      </div>

      {/* 2. 背景の変更 */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          <Icon name="24/Palette" className="text-pink-400" />
          背景設定 (シーン内合成)
        </label>

        <div className="space-y-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-lg">
          {/* 単色カラープリセット */}
          <div>
            <p className="text-xs text-slate-300 mb-2">単色・クロマキー背景</p>
            <div className="flex items-center gap-2">
              {colorPresets.map((p) => (
                <button
                  key={p.color}
                  onClick={() =>
                    updateSettings((prev) => ({
                      ...prev,
                      background: {
                        ...prev.background,
                        mode: 'color',
                        color: p.color,
                      },
                    }))
                  }
                  title={p.label}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    settings.background.mode === 'color' &&
                    settings.background.color.toLowerCase() === p.color.toLowerCase()
                      ? 'border-indigo-400 scale-105'
                      : 'border-slate-700'
                  }`}
                  style={{ backgroundColor: p.color }}
                />
              ))}

              {/* カスタムカラーピッカー */}
              <input
                type="color"
                value={settings.background.color}
                onChange={(e) =>
                  updateSettings((prev) => ({
                    ...prev,
                    background: {
                      ...prev.background,
                      mode: 'color',
                      color: e.target.value,
                    },
                  }))
                }
                className="w-7 h-7 rounded-full overflow-hidden cursor-pointer border border-slate-700 bg-transparent p-0"
              />
            </div>
          </div>

          {/* 背景画像 */}
          <div className="pt-2 border-t border-slate-800">
            <input
              ref={bgImageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleBgImageChange}
              className="hidden"
            />
            <Button
              variant="Default"
              size="S"
              fullWidth
              onClick={() => bgImageInputRef.current?.click()}
            >
              <span className="flex items-center justify-center gap-2">
                <Icon name="24/Image" />
                ローカル画像ファイルを選択
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* 3. アバター位置・カメラ操作 (マウス直感操作) */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          <Icon name="24/Move1" className="text-amber-400" />
          アバター位置・カメラ操作
        </label>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-lg space-y-3">
          <p className="text-xs text-slate-300">
            プレビュー画面上でマウスを直接操作して、位置・向き・距離を自在に調整できます。
          </p>

          <div className="space-y-1.5 text-[11px] text-slate-400 bg-slate-950/60 rounded p-2.5 border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span>🖱️ <strong className="text-slate-200">左ドラッグ</strong>:</span>
              <span className="text-indigo-300">アバターの向き (360°回転)</span>
            </div>
            <div className="flex items-center justify-between">
              <span>🖱️ <strong className="text-slate-200">右ドラッグ</strong> / <strong className="text-slate-200">Shift+左</strong>:</span>
              <span className="text-emerald-300">位置の平行移動 (左右上下)</span>
            </div>
            <div className="flex items-center justify-between">
              <span>🖱️ <strong className="text-slate-200">ホイールスクロール</strong>:</span>
              <span className="text-amber-300">カメラの距離 (ズームイン/アウト)</span>
            </div>
          </div>

          {onResetCamera && (
            <Button
              variant="Default"
              size="S"
              fullWidth
              onClick={onResetCamera}
            >
              <span className="flex items-center justify-center gap-2">
                <Icon name="24/Rotate90DegreesCc" />
                初期位置・アングルにリセット
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
