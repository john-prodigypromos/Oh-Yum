// ── OH-YUM BLASTER 3D — Main Entry Point ────────────────
// Three.js renderer, scene management, animation loop.

import * as THREE from 'three';
import { createRenderer, handleRendererResize, type RendererBundle } from './renderer/SetupRenderer';

// ── Globals ──
let bundle: RendererBundle;
let clock: THREE.Clock;

function init() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('Missing #game-canvas element');

  // ── Create renderer + scene + camera + composer ──
  bundle = createRenderer(canvas);

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
  bundle.scene.add(testCube);

  // Lighting
  const sun = new THREE.DirectionalLight(0xfff5e6, 3);
  sun.position.set(5, 10, 7);
  bundle.scene.add(sun);
  bundle.scene.add(new THREE.AmbientLight(0x222244, 0.3));

  // Position camera to see the cube
  bundle.camera.position.set(0, 2, 10);
  bundle.camera.lookAt(0, 0, 0);

  // ── Clock ──
  clock = new THREE.Clock();

  // ── Resize ──
  const onResize = () => handleRendererResize(bundle);
  window.addEventListener('resize', onResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onResize);
  }

  // ── Start loop ──
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  // Spin test cube (temporary)
  const cube = bundle.scene.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh | undefined;
  if (cube) {
    cube.rotation.x += dt * 0.5;
    cube.rotation.y += dt * 0.8;
  }

  bundle.composer.render();
}

// ── Bootstrap ──
if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}

export { bundle };
