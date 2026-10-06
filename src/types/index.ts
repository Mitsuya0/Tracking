export type ActivePanel = 'none' | 'settings' | 'tracking' | 'assets' | 'lighting';

export interface LightingSettings {
  // メインライト（主光源）
  mainLightIntensity: number; // 0.0 - 3.0
  mainLightColor: string;     // hex color
  mainLightAngleX: number;    // 水平角度 -180 - 180
  mainLightAngleY: number;    // 垂直角度 0 - 90

  // 環境光（全体的な底上げ）
  ambientIntensity: number;   // 0.0 - 2.0
  ambientColor: string;       // hex color

  // バックライト / リムライト（輪郭強調）
  backLightIntensity: number; // 0.0 - 2.0

  // トーンマッピング露出（全体的な明るさ感）
  exposure: number;           // 0.5 - 2.0
}

export type BackgroundMode = 'color' | 'image';

export interface BackgroundSettings {
  mode: BackgroundMode;
  color: string;
  imageUrl: string | null;
  fit: 'cover' | 'contain';
}

export type PerformanceMode = 'balanced' | 'economy' | 'quality';

export type AppTheme = 'light' | 'dark';

export interface TrackingSettings {
  // 顔トラッキング
  faceEnabled: boolean;
  faceSensitivity: number; // 0.1 - 2.0
  faceSmoothing: number; // 0.0 - 0.95
  blinkSensitivity: number; // 0.5 - 2.0
  mouthSensitivity: number; // 0.5 - 2.0

  // ハンドトラッキング
  handsEnabled: boolean; // 負荷軽減トグル
  handSmoothing: number; // 0.0 - 0.95
  armIKReach: number; // 0.5 - 1.5
  returnLerpSpeed: number; // ロスト時の復帰速度 0.01 - 0.2

  // 推論レート制御 (fps)
  targetFps: number; // 15 - 30
}

export interface VirtualCamSettings {
  enabled: boolean;
  width: number;
  height: number;
  fps: number;
}

export interface AppSettings {
  theme: AppTheme;
  selectedCameraId: string;
  performanceMode: PerformanceMode;
  background: BackgroundSettings;
  tracking: TrackingSettings;
  virtualCam: VirtualCamSettings;
  customVrmUrl: string | null;
  lighting: LightingSettings;
}

export interface TrackingStatus {
  cameraActive: boolean;
  faceDetected: boolean;
  leftHandDetected: boolean;
  rightHandDetected: boolean;
  fps: number;
}
