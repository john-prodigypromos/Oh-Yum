import * as THREE from 'three';
import { createEnemyShipGeometry, createPlayerShipGeometry } from './ships/ShipGeometry';
import { createPlayerMaterials, createEnemyMaterials, applyMaterials } from './ships/ShipMaterials';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a2030);

// Camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// Lighting
scene.add(new THREE.AmbientLight(0x334455, 0.5));
const key = new THREE.DirectionalLight(0xffffff, 1.8);
key.position.set(5, 8, 6);
scene.add(key);
const fill = new THREE.DirectionalLight(0x4488bb, 0.6);
fill.position.set(-4, 2, -3);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xff6644, 0.3);
rim.position.set(0, -3, -5);
scene.add(rim);

// Ground grid
const grid = new THREE.GridHelper(20, 20, 0x112233, 0x0a1520);
grid.position.y = -3;
scene.add(grid);

// Ship state
let shipGroup: THREE.Group | null = null;
let spinning = true;

function loadShip(type: 'enemy' | 'player') {
  if (shipGroup) scene.remove(shipGroup);

  const geo = type === 'enemy' ? createEnemyShipGeometry() : createPlayerShipGeometry();
  const mats = type === 'enemy' ? createEnemyMaterials() : createPlayerMaterials(0x00aaff);
  applyMaterials(geo, mats);

  // Center the ship
  const box = new THREE.Box3().setFromObject(geo);
  const center = box.getCenter(new THREE.Vector3());
  geo.position.sub(center);

  shipGroup = geo;
  scene.add(shipGroup);
}

loadShip('enemy');

// Orbit controls (manual)
let isDragging = false;
let prevMouse = { x: 0, y: 0 };
let orbitAngleX = 0;
let orbitAngleY = 0.3;
let orbitDist = 16;

renderer.domElement.addEventListener('pointerdown', (e) => {
  isDragging = true;
  prevMouse = { x: e.clientX, y: e.clientY };
});
window.addEventListener('pointerup', () => { isDragging = false; });
window.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  orbitAngleX -= (e.clientX - prevMouse.x) * 0.005;
  orbitAngleY = Math.max(-1.2, Math.min(1.2, orbitAngleY - (e.clientY - prevMouse.y) * 0.005));
  prevMouse = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener('wheel', (e) => {
  orbitDist = Math.max(5, Math.min(40, orbitDist + e.deltaY * 0.02));
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animate
function animate() {
  requestAnimationFrame(animate);
  if (spinning) orbitAngleX += 0.003;

  camera.position.set(
    Math.sin(orbitAngleX) * Math.cos(orbitAngleY) * orbitDist,
    Math.sin(orbitAngleY) * orbitDist,
    Math.cos(orbitAngleX) * Math.cos(orbitAngleY) * orbitDist,
  );
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}
animate();

// Button handlers
document.getElementById('btn-enemy')!.addEventListener('click', () => {
  loadShip('enemy');
  document.getElementById('label')!.textContent = 'ENEMY SHIP';
  document.getElementById('btn-enemy')!.className = 'active';
  document.getElementById('btn-player')!.className = '';
});
document.getElementById('btn-player')!.addEventListener('click', () => {
  loadShip('player');
  document.getElementById('label')!.textContent = 'PLAYER SHIP';
  document.getElementById('btn-player')!.className = 'active';
  document.getElementById('btn-enemy')!.className = '';
});
document.getElementById('btn-spin')!.addEventListener('click', () => {
  spinning = !spinning;
  document.getElementById('btn-spin')!.textContent = spinning ? 'PAUSE SPIN' : 'RESUME SPIN';
  document.getElementById('btn-spin')!.className = spinning ? '' : 'active';
});
