// Lighting and ground for the showroom-style scene.
// Three lights: a warm key, a cool fill, and a ground bounce. The dome is a
// large back-faced sphere with a vertical gradient drawn into its material.

import * as THREE from "three";

export function buildEnvironment(scene) {
  // Key light: principal direction, casts the shadow.
  const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
  keyLight.position.set(8, 12, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 40;
  const s = 8;
  keyLight.shadow.camera.left = -s;
  keyLight.shadow.camera.right = s;
  keyLight.shadow.camera.top = s;
  keyLight.shadow.camera.bottom = -s;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  // Cool rim from behind.
  const rim = new THREE.DirectionalLight(0x88aaff, 0.9);
  rim.position.set(-6, 5, -8);
  scene.add(rim);

  // Hemisphere for ambient bounce.
  const hemi = new THREE.HemisphereLight(0x9fb9ff, 0x1a1a22, 0.35);
  scene.add(hemi);

  // Ground: subtle radial gradient using a generated canvas texture so we do
  // not have to ship an image. Keeps the S3 bundle minimal.
  const groundTex = makeRadialGradientTexture("#1a2540", "#0b1020", 1024);
  groundTex.colorSpace = THREE.SRGBColorSpace;

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(40, 64),
    new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.9,
      metalness: 0.0,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Dome backdrop with vertical gradient.
  const domeTex = makeVerticalGradientTexture("#1a2540", "#06091a", 8, 256);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(80, 32, 32),
    new THREE.MeshBasicMaterial({
      map: domeTex,
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  scene.add(dome);
}

function makeRadialGradientTexture(inner, outer, size) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.05,
    size / 2,
    size / 2,
    size * 0.5
  );
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  return tex;
}

function makeVerticalGradientTexture(top, bottom, w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return new THREE.CanvasTexture(canvas);
}
