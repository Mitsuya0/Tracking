import React, { useEffect, useRef } from 'react';
import type { TrackingData } from '../../utils/kalidoSolver';

interface CameraPreviewProps {
  setPreviewCallback: (callback: ((video: HTMLVideoElement, data: TrackingData) => void) | null) => void;
  isOpen: boolean;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  setPreviewCallback,
  isOpen,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // パネルが閉じているときは描画コールバックを解除（省電力・FR-4要件）
    if (!isOpen) {
      setPreviewCallback(null);
      return;
    }

    // パネルが開いている時のみ描画を実行
    setPreviewCallback((video: HTMLVideoElement, data: TrackingData) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // 1. ビデオ映像を鏡像反転で描画
      ctx.save();
      ctx.clearRect(0, 0, w, h);
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();

      // 半透明のダークオーバーレイ
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, w, h);

      // 2. 手のランドマーク描画 (鏡像反転に合わせて描画)
      const drawHand = (landmarks: any[], color: string) => {
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        for (const pt of landmarks) {
          // 鏡像反転しているため x を反転
          const px = (1 - pt.x) * w;
          const py = pt.y * h;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      };

      if (data.leftHand) {
        drawHand(data.leftHand, '#10b981'); // エメラルドグリーン
      }
      if (data.rightHand) {
        drawHand(data.rightHand, '#38bdf8'); // スカイブルー
      }

      // 3. 顔認識インジケータ
      if (data.face) {
        ctx.strokeStyle = '#a855f7'; // パープル
        ctx.lineWidth = 1.5;
        ctx.strokeRect(w * 0.25, h * 0.15, w * 0.5, h * 0.6);
      }
    });

    return () => {
      setPreviewCallback(null);
    };
  }, [isOpen, setPreviewCallback]);

  return (
    <div className="relative w-full aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-700/60 shadow-inner">
      <canvas
        ref={canvasRef}
        width={320}
        height={180}
        className="w-full h-full object-cover block"
      />
      {!isOpen && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
          プレビュー停止中
        </div>
      )}
      <div className="absolute bottom-1.5 left-2 text-[10px] text-slate-400 font-mono bg-black/60 px-1.5 py-0.5 rounded">
        カメラ入力確認 (プライバシー保護)
      </div>
    </div>
  );
};
