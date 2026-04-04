// ── OH-YUM BLASTER 3D — Main Entry Point ────────────────
// Three.js renderer, scene management, animation loop.

import * as THREE from 'three';
import { createRenderer, handleRendererResize, type RendererBundle } from './renderer/SetupRenderer';
import { createSpaceEnvironment, type SpaceEnvironment } from './renderer/Environment';
import { createPlayerShipGeometry, createEnemyShipGeometry } from './ships/ShipGeometry';
import { createPlayerMaterials, createEnemyMaterials, applyMaterials } from './ships/ShipMaterials';

// ── Globals ──
let bundle: RendererBundle;
let env: SpaceEnvironment;
let clock: THREE.Clock;
let playerShip: THREE.Group;
let enemyShip: THREE.Group;

function init() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('Missing #game-canvas element');

  // ── Create renderer + scene + camera + composer ──
  bundle = createRenderer(canvas);

  // ── Space environment (stars, nebulae, lighting, envMap) ──
  env = createSpaceEnvironment(bundle.scene, bundle.renderer, bundle.camera);

  // ── Player ship ──
  playerShip = createPlayerShipGeometry();
  const playerMats = createPlayerMaterials(0x88aacc);
  applyMaterials(playerShip, playerMats);
  playerShip.position.set(-5, 0, 0);
  playerShip.rotation.y = Math.PI * 0.1;
  bundle.scene.add(playerShip);

  // ── Enemy ship ──
  enemyShip = createEnemyShipGeometry();
  const enemyMats = createEnemyMaterials();
  applyMaterials(enemyShip, enemyMats);
  enemyShip.position.set(5, 0, 0);
  enemyShip.rotation.y = -Math.PI * 0.1;
  bundle.scene.add(enemyShip);

  // Position camera to see both ships
  bundle.camera.position.set(0, 5, 18);
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

  // Slow-rotate ships for showcase
  if (playerShip) playerShip.rotation.y += dt * 0.3;
  if (enemyShip) enemyShip.rotation.y -= dt * 0.25;

  bundle.composer.render();
}

// ── Bootstrap ──
if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}

export { bundle, env };
