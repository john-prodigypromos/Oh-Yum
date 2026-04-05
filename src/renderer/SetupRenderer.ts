// ── Renderer Factory ─────────────────────────────────────
// Creates WebGLRenderer + EffectComposer pipeline.
// All post-processing (bloom, AA, tonemapping) configured here.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export interface RendererBundle {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  bloomPass: UnrealBloomPass;
}

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export function createRenderer(canvas: HTMLCanvasElement): RendererBundle {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // ── WebGL Renderer ──
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false, // SMAA handles AA via post-processing
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // ── Scene ──
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020508);

  // ── Camera ──
  const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 10000);
  camera.position.set(0, 0, 0);

  // ── Post-Processing ──
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // Bloom — always half-res for performance
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(Math.floor(w / 2), Math.floor(h / 2)),
    0.5,  // strength
    0.4,  // radius
    0.95, // threshold
  );
  composer.addPass(bloomPass);

  // Anti-aliasing — skip on mobile
  if (!isMobile) {
    composer.addPass(new SMAAPass());
  }

  // Final output (applies tonemapping + color space)
  composer.addPass(new OutputPass());

  return { renderer, composer, scene, camera, bloomPass };
}

export function handleRendererResize(bundle: RendererBundle): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  bundle.camera.aspect = w / h;
  bundle.camera.updateProjectionMatrix();
  bundle.renderer.setSize(w, h);
  bundle.composer.setSize(w, h);
}
