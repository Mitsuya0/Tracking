import React from 'react';
import { Modal, ModalHeader, ModalBody } from '@charcoal-ui/react';
import type { ActivePanel } from '../types';

interface ModalPanelProps {
  activePanel: ActivePanel;
  onClose: () => void;
  children: React.ReactNode;
}

export const ModalPanel: React.FC<ModalPanelProps> = ({
  activePanel,
  onClose,
  children,
}) => {
  const isOpen = activePanel !== 'none';

  const titles: Record<ActivePanel, string> = {
    none: '',
    settings: '基本設定 & カメラ',
    tracking: 'トラッキング調整',
    lighting: 'ライティング・演出設定',
    assets: 'アセット・背景管理',
  };

  return (
    <Modal
      title={titles[activePanel]}
      isOpen={isOpen}
      onClose={onClose}
      isDismissable={true}
      size="M"
      zIndex={50}
    >
      <ModalHeader />
      <ModalBody className="max-h-[calc(100vh-140px)] overflow-y-auto px-6 pb-6 custom-scrollbar">
        {children}
      </ModalBody>
    </Modal>
  );
};
