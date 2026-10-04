import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { AvatarSolver, type TrackingData, type SolverOptions } from '../utils/kalidoSolver';
import type { BackgroundSettings } from '../types';

interface UseVRMProps {
  scene: THREE.Scene | null;
  backgroundSettings: BackgroundSettings;
  customVrmUrl: string | null;
}

export function useVRM({ scene, backgroundSettings, customVrmUrl }: UseVRMProps) {
  const [currentVrm, setCurrentVrm] = useState<VRM | null>(null);
  const currentVrmRef = useRef<VRM | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const solverRef = useRef<AvatarSolver>(new AvatarSolver());
  const textureLoaderRef = useRef<THREE.TextureLoader>(new THREE.TextureLoader());
  const currentTextureRef = useRef<THREE.Texture | null>(null);

  // 背景の反映 (Color / Texture)
  useEffect(() => {
    if (!scene) return;

    if (backgroundSettings.mode === 'color') {
      if (currentTextureRef.current) {
        currentTextureRef.current.dispose();
        currentTextureRef.current = null;
      }
      scene.background = new THREE.Color(backgroundSettings.color);
    } else if (backgroundSettings.mode === 'image' && backgroundSettings.imageUrl) {
      textureLoaderRef.current.load(
        backgroundSettings.imageUrl,
        (texture) => {
          if (currentTextureRef.current) {
            currentTextureRef.current.dispose();
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          currentTextureRef.current = texture;
          scene.background = texture;
        },
        undefined,
        (err) => {
          console.error('Failed to load background image:', err);
          scene.background = new THREE.Color('#0b0f19');
        }
      );
    } else {
      scene.background = new THREE.Color('#0b0f19');
    }
  }, [scene, backgroundSettings]);

  // VRMモデルのロード処理
  const loadVRM = useCallback(
    async (url: string) => {
      if (!scene) return;

      setIsLoading(true);
      setLoadError(null);

      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      try {
        const gltf = await loader.loadAsync(url);
        const vrm = gltf.userData.vrm as VRM;

        if (!vrm) {
          throw new Error('GLTF does not contain valid VRM data');
        }

        // 既存モデルのアンロードとリソース解放
        if (currentVrm) {
          scene.remove(currentVrm.scene);
          VRMUtils.deepDispose(currentVrm.scene);
        }

        // モデルの初期補正 (Y軸反転などVRM0とVRM1の差分を吸収)
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        VRMUtils.rotateVRM0(vrm);

        // シーンに追加
        scene.add(vrm.scene);
        currentVrmRef.current = vrm;
        setCurrentVrm(vrm);
      } catch (err: any) {
        console.error('Failed to load VRM:', err);
        setLoadError(err.message || 'VRMファイルの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    },
    [scene, currentVrm]
  );

  // 初回および URL 変更時のモデルロード
  useEffect(() => {
    if (!scene) return;

    const targetUrl = customVrmUrl || '/assets/default_avatar.vrm';
    loadVRM(targetUrl);

    // クリーンアップ
    return () => {
      if (currentVrmRef.current && scene) {
        scene.remove(currentVrmRef.current.scene);
        VRMUtils.deepDispose(currentVrmRef.current.scene);
        currentVrmRef.current = null;
      }
    };
  }, [scene, customVrmUrl]);

  // 毎フレームのトラッキング適用 (currentVrmRef を参照するため常に最新のVRMを操作可能)
  const updateVRM = useCallback(
    (trackingData: TrackingData, options: SolverOptions, delta: number) => {
      const vrm = currentVrmRef.current;
      if (vrm) {
        solverRef.current.solve(vrm, trackingData, options, delta);
      }
    },
    []
  );

  return {
    currentVrm,
    isLoading,
    loadError,
    loadVRM,
    updateVRM,
  };
}
