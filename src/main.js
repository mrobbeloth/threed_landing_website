// Entry point. Sets up the renderer, camera, controls, and animation loop.
// Keeping this file small lets students focus on solterra.js for modeling.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

import { buildSolterra } from "./solterra.js";
import { buildEnvironment } from "./environment.js";

const canvas = document.getElementById("scene");
const loadingEl = document.getElementById("loading");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);
scene.fog = new THREE.Fog(0x0b1020, 25, 80);

// PMREM environment gives the paint and chrome believable reflections without
// shipping any HDR texture files. Important for keeping the S3 bundle tiny.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(7.5, 3.2, 9.5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 5;
controls.maxDistance = 25;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // keep camera above ground
controls.target.set(0, 0.9, 0);
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;

buildEnvironment(scene);

const car = buildSolterra();
scene.add(car);

// UI wiring.
const bodyColorInput = document.getElementById("bodyColor");
const autoRotateInput = document.getElementById("autoRotate");
const shadowInput = document.getElementById("showShadow");

bodyColorInput.addEventListener("input", (e) => {
  car.userData.setBodyColor(e.target.value);
});
autoRotateInput.addEventListener("change", (e) => {
  controls.autoRotate = e.target.checked;
});
shadowInput.addEventListener("change", (e) => {
  renderer.shadowMap.enabled = e.target.checked;
  scene.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = e.target.checked && obj.userData.castShadow !== false;
  });
});

window.addEventListener("resize", onResize);
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

const clock = new THREE.Clock();

function animate() {
  const dt = clock.getDelta();
  controls.update();

  // Spin the wheels gently while auto-rotating so the car feels alive.
  if (controls.autoRotate && car.userData.wheels) {
    const speed = 1.2;
    for (const wheel of car.userData.wheels) {
      wheel.rotation.x += dt * speed;
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(() => {
  loadingEl.classList.add("hidden");
  animate();
});
