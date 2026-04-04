// ── OH-YUM BLASTER 3D — Main Entry Point ────────────────
// Three.js renderer, post-processing, scene management, animation loop.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ── Globals ──
let renderer: THREE.WebGLRenderer;
let composer: EffectComposer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let clock: THREE.Clock;

function init() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('Missing #game-canvas element');

  // ── Renderer ──
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false, // SMAA handles AA
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // ── Scene ──
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020508);

  // ── Camera ──
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000,
  );
  camera.position.set(0, 2, 10);
  camera.lookAt(0, 0, 0);

  // ── Post-Processing ──
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,  // strength
    0.6,  // radius
    0.85, // threshold
  );
  composer.addPass(bloomPass);

  const smaaPass = new SMAAPass();
  composer.addPass(smaaPass);

  composer.addPass(new OutputPass());

  // ── Temporary test content (verifies renderer + bloom) ──
  const testGeo = new THREE.BoxGeometry(2, 2, 2);
  const testMat = new THREE.MeshStandardMaterial({
    color: 0x0088ff,
    emissive: 0x0044ff,
    emissiveIntensity: 2.0,
    metalness: 0.9,
    roughness: 0.3,
  });
  const testCube = new THREE.Mesh(testGeo, testMat);
  scene.add(testCube);

  // Light so cube is visible
  const light = new THREE.DirectionalLight(0xfff5e6, 3);
  light.position.set(5, 10, 7);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x222244, 0.3));

  // ── Clock ──
  clock = new THREE.Clock();

  // ── Resize ──
  window.addEventListener('resize', handleResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize);
  }

  // ── Start loop ──
  animate();
}

function handleResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  // Spin test cube
  const cube = scene.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh | undefined;
  if (cube) {
    cube.rotation.x += dt * 0.5;
    cube.rotation.y += dt * 0.8;
  }

  composer.render();
}

// ── Bootstrap ──
if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}

// Export for future scene manager access
export { renderer, composer, scene, camera };
