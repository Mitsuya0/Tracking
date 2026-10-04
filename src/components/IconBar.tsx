import React from 'react';
import { Icon } from '@charcoal-ui/react';
import type { ActivePanel } from '../types';

interface IconBarProps {
  activePanel: ActivePanel;
  onTogglePanel: (panel: ActivePanel) => void;
  onResetCamera: () => void;
  isVirtualCamRunning: boolean;
}

export const IconBar: React.FC<IconBarProps> = ({
  activePanel,
  onTogglePanel,
  onResetCamera,
  isVirtualCamRunning,
}) => {
  const items: { id: ActivePanel; icon: React.ReactNode; label: string }[] = [
    {
      id: 'settings',
      icon: <Icon name="24/Settings" />,
      label: '基本設定 & カメラ',
    },
    {
      id: 'tracking',
      icon: <Icon name="24/FaceEdit" />,
      label: 'トラッキング調整',
    },
    {
      id: 'assets',
      icon: <Icon name="24/Palette" />,
      label: 'アセット・背景管理',
    },
  ];

  return (
    <div className="absolute top-0 right-0 h-full w-14 bg-slate-950/80 border-l border-slate-800/80 backdrop-blur-md flex flex-col items-center justify-between py-4 z-30 select-none">
      {/* 上部アイコン群 */}
      <div className="flex flex-col items-center gap-3">
        {items.map((item) => {
          const isActive = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTogglePanel(isActive ? 'none' : item.id)}
              className={`relative p-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title={item.label}
            >
              {item.icon}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-r-full" />
              )}
            </button>
          );
        })}

        {/* 視点リセットボタン */}
        <button
          onClick={onResetCamera}
          className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all mt-2"
          title="アングルをリセット"
        >
          <Icon name="24/Rotate90DegreesCc" />
        </button>
      </div>

      {/* 下部：仮想カメラ配信状態インジケータ */}
      <div className="flex flex-col items-center gap-1">
        <div
          className={`p-2 rounded-xl transition-all ${
            isVirtualCamRunning
              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
              : 'text-slate-600'
          }`}
          title={isVirtualCamRunning ? '仮想カメラ配信中' : '仮想カメラ停止中'}
        >
          <Icon name="24/CameraVideo" />
        </div>
      </div>
    </div>
  );
};
