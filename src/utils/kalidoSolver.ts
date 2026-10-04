import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';

// MediaPipe ランドマーク型
export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export interface TrackingData {
  face?: {
    matrix?: number[]; // 4x4 matrix
    rotation?: { pitch: number; yaw: number; roll: number };
    blendshapes?: { categoryName: string; score: number }[];
  };
  leftHand?: NormalizedLandmark[];
  rightHand?: NormalizedLandmark[];
}

export interface SolverOptions {
  faceSensitivity: number;
  faceSmoothing: number;
  blinkSensitivity: number;
  mouthSensitivity: number;
  handsEnabled: boolean;
  handSmoothing: number;
  armIKReach: number;
  returnLerpSpeed: number;
}

export class AvatarSolver {
  // スムージング用バッファ
  private headRotation = new THREE.Euler(0, 0, 0, 'YXZ');
  private targetHeadRotation = new THREE.Euler(0, 0, 0, 'YXZ');

  // デフォルト待機姿勢 (腕脱力)
  private readonly defaultArmRotation = {
    leftUpperArm: new THREE.Euler(0, 0, THREE.MathUtils.degToRad(-70)),
    leftLowerArm: new THREE.Euler(0, 0, THREE.MathUtils.degToRad(-15)),
    rightUpperArm: new THREE.Euler(0, 0, THREE.MathUtils.degToRad(70)),
    rightLowerArm: new THREE.Euler(0, 0, THREE.MathUtils.degToRad(15)),
  };

  private currentArmRotations = {
    leftUpperArm: new THREE.Euler(0, 0, THREE.MathUtils.degToRad(-70)),
    leftLowerArm: new THREE.Euler(0, 0, THREE.MathUtils.degToRad(-15)),
    rightUpperArm: new THREE.Euler(0, 0, THREE.MathUtils.degToRad(70)),
    rightLowerArm: new THREE.Euler(0, 0, THREE.MathUtils.degToRad(15)),
  };

  /**
   * VRMモデルにトラッキングデータを適用
   */
  public solve(vrm: VRM, data: TrackingData, options: SolverOptions, delta: number) {
    if (!vrm) return;

    // 1. 顔 & 頭部回転の解決
    this.solveFace(vrm, data.face, options);

    // 2. 表情 (Blendshapes) の解決
    this.solveExpressions(vrm, data.face?.blendshapes, options);

    // 3. 手 & 腕 (Hand / Arm) の解決
    if (options.handsEnabled) {
      this.solveHands(vrm, data.leftHand, data.rightHand, options, delta);
    } else {
      this.resetHandsToRest(vrm, options.returnLerpSpeed);
    }

    // VRM の更新
    vrm.update(delta);
  }

  /**
   * ボーンノード取得ヘルパー (Normalized または Raw)
   */
  private getBone(vrm: VRM, boneName: any): THREE.Object3D | null {
    if (!vrm.humanoid) return null;
    return (
      vrm.humanoid.getNormalizedBoneNode(boneName) ||
      vrm.humanoid.getRawBoneNode(boneName) ||
      null
    );
  }

  /**
   * 頭部・首の回転
   */
  private solveFace(vrm: VRM, faceData: TrackingData['face'], options: SolverOptions) {
    const headNode = this.getBone(vrm, 'head');
    const neckNode = this.getBone(vrm, 'neck');
    if (!headNode) return;

    if (faceData?.rotation) {
      // ランドマークから直接計算された回転（高安定・幾何学的）
      this.targetHeadRotation.x = THREE.MathUtils.degToRad(faceData.rotation.pitch * options.faceSensitivity);
      this.targetHeadRotation.y = THREE.MathUtils.degToRad(-faceData.rotation.yaw * options.faceSensitivity);
      this.targetHeadRotation.z = THREE.MathUtils.degToRad(-faceData.rotation.roll * options.faceSensitivity);
    } else if (faceData?.matrix && faceData.matrix.length === 16) {
      // 4x4 変換行列から回転を抽出
      const mat = new THREE.Matrix4().fromArray(faceData.matrix);
      const rot = new THREE.Euler().setFromRotationMatrix(mat, 'YXZ');
      this.targetHeadRotation.x = -rot.x * options.faceSensitivity;
      this.targetHeadRotation.y = -rot.y * options.faceSensitivity;
      this.targetHeadRotation.z = rot.z * options.faceSensitivity;
    }

    // スムージング (Lerp)
    const factor = THREE.MathUtils.clamp(1 - options.faceSmoothing, 0.05, 1.0);
    this.headRotation.x = THREE.MathUtils.lerp(this.headRotation.x, this.targetHeadRotation.x, factor);
    this.headRotation.y = THREE.MathUtils.lerp(this.headRotation.y, this.targetHeadRotation.y, factor);
    this.headRotation.z = THREE.MathUtils.lerp(this.headRotation.z, this.targetHeadRotation.z, factor);

    // 首と頭に回転を配分
    if (neckNode) {
      neckNode.rotation.x = this.headRotation.x * 0.3;
      neckNode.rotation.y = this.headRotation.y * 0.3;
      neckNode.rotation.z = this.headRotation.z * 0.3;
      headNode.rotation.x = this.headRotation.x * 0.7;
      headNode.rotation.y = this.headRotation.y * 0.7;
      headNode.rotation.z = this.headRotation.z * 0.7;
    } else {
      headNode.rotation.copy(this.headRotation);
    }
  }

  /**
   * 表情 (VRM ExpressionManager) のマッピング (VRM 0.x / 1.0 両対応)
   */
  private solveExpressions(
    vrm: VRM,
    blendshapes: { categoryName: string; score: number }[] | undefined,
    options: SolverOptions
  ) {
    const exprManager = vrm.expressionManager;
    if (!exprManager) return;

    if (!blendshapes || blendshapes.length === 0) return;

    const bsMap: Record<string, number> = {};
    for (const b of blendshapes) {
      bsMap[b.categoryName] = b.score;
    }

    // VRM 0.x / 1.0 両方のExpressionキー名に値をセット
    const setExpr = (vrm1: string, vrm0: string, val: number) => {
      const clamped = THREE.MathUtils.clamp(val, 0, 1);
      try {
        if (exprManager.getValue(vrm1) !== undefined) {
          exprManager.setValue(vrm1, clamped);
        }
      } catch (_) {}
      try {
        if (exprManager.getValue(vrm0) !== undefined) {
          exprManager.setValue(vrm0, clamped);
        }
      } catch (_) {}
    };

    // まばたき (Blink)
    const blinkL = (bsMap['eyeBlinkLeft'] || 0) * options.blinkSensitivity;
    const blinkR = (bsMap['eyeBlinkRight'] || 0) * options.blinkSensitivity;

    setExpr('blinkLeft', 'blink_l', blinkL);
    setExpr('blinkRight', 'blink_r', blinkR);
    setExpr('blink', 'blink', (blinkL + blinkR) * 0.5);

    // 口の開閉・リップシンク (Visemes)
    const jawOpen = (bsMap['jawOpen'] || 0) * options.mouthSensitivity;
    const mouthFunnel = (bsMap['mouthFunnel'] || 0) * options.mouthSensitivity;
    const mouthPucker = (bsMap['mouthPucker'] || 0) * options.mouthSensitivity;
    const smile = ((bsMap['mouthSmileLeft'] || 0) + (bsMap['mouthSmileRight'] || 0)) * 0.5;

    // VRM 母音マッピング: aa (あ), ih (い), ou (う), ee (え), oh (お)
    setExpr('aa', 'a', jawOpen * 1.2);
    setExpr('ih', 'i', smile * 0.8);
    setExpr('ou', 'u', mouthPucker * 1.0);
    setExpr('oh', 'o', mouthFunnel * 1.0);
    setExpr('ee', 'e', (smile + jawOpen * 0.5) * 0.6);

    // 笑顔 (Happy / Joy)
    setExpr('happy', 'joy', smile > 0.3 ? (smile - 0.3) * 1.4 : 0);
  }

  /**
   * 手と腕の姿勢制御 & 2-Bone IK
   */
  private solveHands(
    vrm: VRM,
    leftLandmarks: NormalizedLandmark[] | undefined,
    rightLandmarks: NormalizedLandmark[] | undefined,
    options: SolverOptions,
    _delta: number
  ) {
    const humanoid = vrm.humanoid;
    if (!humanoid) return;

    // 左手
    if (leftLandmarks && leftLandmarks.length >= 21) {
      this.solveSingleHand(vrm, 'left', leftLandmarks, options);
    } else {
      this.lerpArmToRest(vrm, 'left', options.returnLerpSpeed);
    }

    // 右手
    if (rightLandmarks && rightLandmarks.length >= 21) {
      this.solveSingleHand(vrm, 'right', rightLandmarks, options);
    } else {
      this.lerpArmToRest(vrm, 'right', options.returnLerpSpeed);
    }
  }

  /**
   * 片手・指・腕の姿勢計算
   */
  private solveSingleHand(
    vrm: VRM,
    side: 'left' | 'right',
    landmarks: NormalizedLandmark[],
    options: SolverOptions
  ) {
    const humanoid = vrm.humanoid;
    if (!humanoid) return;

    const isLeft = side === 'left';
    const upperArm = this.getBone(vrm, isLeft ? 'leftUpperArm' : 'rightUpperArm');
    const lowerArm = this.getBone(vrm, isLeft ? 'leftLowerArm' : 'rightLowerArm');
    const hand = this.getBone(vrm, isLeft ? 'leftHand' : 'rightHand');

    if (!upperArm || !lowerArm || !hand) return;

    // 手首 (0), 人差し指付け根 (5), 小指付け根 (17) から手のひらの位置と向きを推定
    const wrist = landmarks[0];
    const indexMCP = landmarks[5];
    const pinkyMCP = landmarks[17];

    // 手のひらの傾き (Roll) を計算
    const handRoll = Math.atan2(pinkyMCP.y - indexMCP.y, pinkyMCP.x - indexMCP.x);
    hand.rotation.z = isLeft ? handRoll : -handRoll;

    // カメラ座標 (0~1) を VRM 空間にマッピング
    // x: 0 (左) ~ 1 (右) -> 鏡像反転
    // y: 0 (上) ~ 1 (下)
    // z: 手前(-) / 奥(+)
    const handTargetX = (1 - wrist.x - 0.5) * 1.5 * options.armIKReach;
    const handTargetY = -(wrist.y - 0.6) * 1.5 * options.armIKReach;

    // 腕の回転（持ち上げ角と屈曲角）
    const targetUpperRotZ = isLeft
      ? THREE.MathUtils.degToRad(-70 + handTargetY * 60 - handTargetX * 30)
      : THREE.MathUtils.degToRad(70 - handTargetY * 60 - handTargetX * 30);

    const targetUpperRotX = THREE.MathUtils.degToRad(handTargetY * 40);
    const targetLowerRotX = THREE.MathUtils.degToRad(Math.max(0, -handTargetY * 70 + 20));

    // スムージング
    const factor = THREE.MathUtils.clamp(1 - options.handSmoothing, 0.05, 0.8);
    const currentUpper = isLeft ? this.currentArmRotations.leftUpperArm : this.currentArmRotations.rightUpperArm;
    const currentLower = isLeft ? this.currentArmRotations.leftLowerArm : this.currentArmRotations.rightLowerArm;

    currentUpper.z = THREE.MathUtils.lerp(currentUpper.z, targetUpperRotZ, factor);
    currentUpper.x = THREE.MathUtils.lerp(currentUpper.x, targetUpperRotX, factor);
    currentLower.x = THREE.MathUtils.lerp(currentLower.x, targetLowerRotX, factor);

    upperArm.rotation.set(currentUpper.x, 0, currentUpper.z);
    lowerArm.rotation.set(currentLower.x, 0, isLeft ? -0.2 : 0.2);

    // 指関節の屈曲計算 (Curl)
    this.solveFingers(vrm, side, landmarks);
  }

  /**
   * 指の曲がり（21点ランドマークから各指の角度を計算）
   */
  private solveFingers(vrm: VRM, side: 'left' | 'right', landmarks: NormalizedLandmark[]) {
    // 指のランドマークインデックス: [付け根, 第1, 第2, 指先]
    const fingerDefs = [
      { name: 'Thumb', tip: 4, dip: 3, pip: 2, mcp: 1 },
      { name: 'Index', tip: 8, dip: 7, pip: 6, mcp: 5 },
      { name: 'Middle', tip: 12, dip: 11, pip: 10, mcp: 9 },
      { name: 'Ring', tip: 16, dip: 15, pip: 14, mcp: 13 },
      { name: 'Little', tip: 20, dip: 19, pip: 18, mcp: 17 },
    ];

    const wrist = landmarks[0];

    for (const finger of fingerDefs) {
      const tip = landmarks[finger.tip];
      const mcp = landmarks[finger.mcp];

      // 指先と手首の距離 vs 付け根と手首の距離で曲がりを推定
      const distTipWrist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y, tip.z - wrist.z);
      const distMcpWrist = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y, mcp.z - wrist.z);

      // curl: 0.0 (伸び) ~ 1.0 (握り)
      const ratio = distTipWrist / (distMcpWrist * 1.5 + 0.001);
      const curl = THREE.MathUtils.clamp(1.2 - ratio, 0, 1);

      const curlRad = curl * THREE.MathUtils.degToRad(75);

      const proximalName = `${side}${finger.name}Proximal` as any;
      const intermediateName = `${side}${finger.name}Intermediate` as any;
      const distalName = `${side}${finger.name}Distal` as any;

      const proxNode = this.getBone(vrm, proximalName);
      const interNode = this.getBone(vrm, intermediateName);
      const distNode = this.getBone(vrm, distalName);

      if (proxNode) proxNode.rotation.x = curlRad * 0.4;
      if (interNode) interNode.rotation.x = curlRad * 0.35;
      if (distNode) distNode.rotation.x = curlRad * 0.25;
    }
  }

  /**
   * 手が画面外に出たときの Lerp 復帰処理 (FR-2要件)
   */
  private lerpArmToRest(vrm: VRM, side: 'left' | 'right', returnSpeed: number) {
    const isLeft = side === 'left';
    const upperArm = this.getBone(vrm, isLeft ? 'leftUpperArm' : 'rightUpperArm');
    const lowerArm = this.getBone(vrm, isLeft ? 'leftLowerArm' : 'rightLowerArm');
    if (!upperArm || !lowerArm) return;

    const currentUpper = isLeft ? this.currentArmRotations.leftUpperArm : this.currentArmRotations.rightUpperArm;
    const currentLower = isLeft ? this.currentArmRotations.leftLowerArm : this.currentArmRotations.rightLowerArm;
    const defaultUpper = isLeft ? this.defaultArmRotation.leftUpperArm : this.defaultArmRotation.rightUpperArm;
    const defaultLower = isLeft ? this.defaultArmRotation.leftLowerArm : this.defaultArmRotation.rightLowerArm;

    // 滑らかに脱力姿勢へ線形補間
    currentUpper.x = THREE.MathUtils.lerp(currentUpper.x, defaultUpper.x, returnSpeed);
    currentUpper.y = THREE.MathUtils.lerp(currentUpper.y, defaultUpper.y, returnSpeed);
    currentUpper.z = THREE.MathUtils.lerp(currentUpper.z, defaultUpper.z, returnSpeed);

    currentLower.x = THREE.MathUtils.lerp(currentLower.x, defaultLower.x, returnSpeed);
    currentLower.y = THREE.MathUtils.lerp(currentLower.y, defaultLower.y, returnSpeed);
    currentLower.z = THREE.MathUtils.lerp(currentLower.z, defaultLower.z, returnSpeed);

    upperArm.rotation.set(currentUpper.x, currentUpper.y, currentUpper.z);
    lowerArm.rotation.set(currentLower.x, currentLower.y, currentLower.z);
  }

  /**
   * 手が無効な時に両腕を待機姿勢へ
   */
  private resetHandsToRest(vrm: VRM, returnSpeed: number) {
    this.lerpArmToRest(vrm, 'left', returnSpeed);
    this.lerpArmToRest(vrm, 'right', returnSpeed);
  }
}
