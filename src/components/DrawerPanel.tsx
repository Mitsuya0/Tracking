import React from 'react';
import { Icon } from '@charcoal-ui/react';
import type { ActivePanel } from '../types';

interface DrawerPanelProps {
  activePanel: ActivePanel;
  onClose: () => void;
  children: React.ReactNode;
}

export const DrawerPanel: React.FC<DrawerPanelProps> = ({
  activePanel,
  onClose,
  children,
}) => {
  const isOpen = activePanel !== 'none';

  const titles: Record<ActivePanel, string> = {
    none: '',
    settings: '基本設定 & カメラ',
    tracking: 'トラッキング調整',
    assets: 'アセット・外観管理',
  };

  return (
    <div
      className={`absolute top-0 right-14 h-full w-84 max-w-[calc(100vw-3.5rem)] bg-slate-950/90 border-l border-slate-800/80 backdrop-blur-xl shadow-2xl z-20 transition-all duration-300 ease-out transform ${
        isOpen
          ? 'translate-x-0 opacity-100 pointer-events-auto'
          : 'translate-x-full opacity-0 pointer-events-none'
      }`}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800/80">
        <h2 className="text-sm font-semibold text-white tracking-wide">
          {titles[activePanel]}
        </h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800/60 transition-colors"
          title="パネルを閉じる"
        >
          <Icon name="24/Close" />
        </button>
      </div>

      {/* コンテンツ領域 */}
      <div className="h-[calc(100%-53px)] overflow-y-auto p-4 custom-scrollbar">
        {children}
      </div>
    </div>
  );
};
