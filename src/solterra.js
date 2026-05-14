// Procedural Subaru Solterra.
//
// The real Solterra is a compact electric SUV with very distinctive features:
//   - a closed front fascia with a slim LED bar (no traditional grille)
//   - thick black plastic cladding around the wheel arches and rocker panels
//   - a sloped, fastback-style rear with a roof spoiler
//   - boxy SUV silhouette overall, but with rounded edges
//
// Everything below is built from Three.js primitives, then grouped so the
// transform hierarchy is easy to follow: car -> body, wheels, lights, glass.
// No external 3D files are loaded, which keeps the S3 bundle to a few KB.

import * as THREE from "three";

// ----- Reusable shape helpers ------------------------------------------------

function roundedBoxGeometry(width, height, depth, radius = 0.15, segments = 4) {
  // ExtrudeGeometry from a rounded rectangle gives us soft edges cheaply.
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, Math.min(w, h) - 0.001);

  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: segments,
    bevelSize: r * 0.6,
    bevelThickness: r * 0.6,
    curveSegments: 16,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

// ----- Materials -------------------------------------------------------------

function makeMaterials(initialBodyColor = "#1f3a5f") {
  const body = new THREE.MeshPhysicalMaterial({
    color: initialBodyColor,
    metalness: 0.55,
    roughness: 0.32,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.1,
  });

  const cladding = new THREE.MeshStandardMaterial({
    color: 0x111418,
    roughness: 0.85,
    metalness: 0.05,
  });

  const trim = new THREE.MeshStandardMaterial({
    color: 0x1a1c20,
    roughness: 0.55,
    metalness: 0.4,
  });

  const chrome = new THREE.MeshStandardMaterial({
    color: 0xc9ccd1,
    roughness: 0.25,
    metalness: 1.0,
  });

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x0a0d12,
    transmission: 0.0,
    roughness: 0.08,
    metalness: 0.0,
    transparent: true,
    opacity: 0.55,
    envMapIntensity: 1.4,
  });

  const tire = new THREE.MeshStandardMaterial({
    color: 0x0a0a0c,
    roughness: 0.95,
    metalness: 0.0,
  });

  const rim = new THREE.MeshStandardMaterial({
    color: 0x2a2d33,
    roughness: 0.4,
    metalness: 0.85,
  });

  const headlight = new THREE.MeshStandardMaterial({
    color: 0xfff8e0,
    emissive: 0xfff1c4,
    emissiveIntensity: 0.7,
    roughness: 0.2,
    metalness: 0.1,
  });

  const taillight = new THREE.MeshStandardMaterial({
    color: 0x500000,
    emissive: 0xff2020,
    emissiveIntensity: 0.6,
    roughness: 0.3,
    metalness: 0.0,
  });

  return { body, cladding, trim, chrome, glass, tire, rim, headlight, taillight };
}

// ----- Wheel -----------------------------------------------------------------

function buildWheel(M) {
  const wheel = new THREE.Group();

  // Tire: torus rotated to lay flat on its axis.
  const tireGeo = new THREE.TorusGeometry(0.42, 0.18, 20, 40);
  const tire = new THREE.Mesh(tireGeo, M.tire);
  tire.rotation.y = Math.PI / 2;
  tire.castShadow = true;
  wheel.add(tire);

  // Hub disc.
  const hubGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 24);
  const hub = new THREE.Mesh(hubGeo, M.rim);
  hub.rotation.z = Math.PI / 2;
  hub.castShadow = true;
  wheel.add(hub);

  // Spokes: 5 thin boxes radiating from the hub. The Solterra's STI-style
  // wheels have a five-spoke Y-pattern, this is a stylized take.
  const spokeMat = M.rim;
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.55, 0.08),
      spokeMat
    );
    spoke.rotation.z = (i / 5) * Math.PI * 2;
    wheel.add(spoke);
  }

  // Center cap.
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.14, 16),
    M.chrome
  );
  cap.rotation.z = Math.PI / 2;
  wheel.add(cap);

  return wheel;
}

// ----- Body builders ---------------------------------------------------------

function buildLowerBody(M) {
  // Lower hull: black cladding + rocker panel area. A wide flat box.
  const group = new THREE.Group();

  const lower = new THREE.Mesh(
    roundedBoxGeometry(4.55, 0.55, 1.95, 0.18),
    M.cladding
  );
  lower.position.set(0, 0.45, 0);
  lower.rotation.x = Math.PI / 2;
  // Note: ExtrudeGeometry extrudes along +Z, so we rotate to align Z with the
  // car's depth axis. Same convention is used for the other extruded panels.
  lower.castShadow = true;
  lower.receiveShadow = true;
  group.add(lower);

  return group;
}

function buildMidBody(M) {
  // Painted body: the main belt of the car between cladding and greenhouse.
  const group = new THREE.Group();

  const mid = new THREE.Mesh(
    roundedBoxGeometry(4.45, 0.7, 1.9, 0.22),
    M.body
  );
  mid.position.set(0, 1.05, 0);
  mid.rotation.x = Math.PI / 2;
  mid.castShadow = true;
  mid.receiveShadow = true;
  group.add(mid);

  // Front fascia: a shorter painted block ahead of the cabin to shape the nose.
  const nose = new THREE.Mesh(
    roundedBoxGeometry(1.6, 0.55, 1.85, 0.2),
    M.body
  );
  nose.position.set(2.05, 0.85, 0);
  nose.rotation.x = Math.PI / 2;
  nose.castShadow = true;
  group.add(nose);

  // Rear haunch: similar block at the back, slightly taller for the SUV look.
  const haunch = new THREE.Mesh(
    roundedBoxGeometry(1.5, 0.75, 1.9, 0.22),
    M.body
  );
  haunch.position.set(-1.95, 0.95, 0);
  haunch.rotation.x = Math.PI / 2;
  haunch.castShadow = true;
  group.add(haunch);

  return group;
}

function buildGreenhouse(M) {
  // The "greenhouse" is the glassy upper cabin. We model it as a tapered box
  // built from a custom shape so the windshield rake and rear fastback slope
  // both look right.
  const group = new THREE.Group();

  // Roof side profile. Coordinates are (x = car length, y = height).
  // Origin is the car center on the ground plane.
  const profile = new THREE.Shape();
  profile.moveTo(-2.0, 1.4); // rear-bottom
  profile.lineTo(1.6, 1.4); // front-bottom
  profile.lineTo(1.45, 1.55); // start of windshield
  profile.bezierCurveTo(
    1.1,
    1.95,
    0.9,
    2.05,
    0.55,
    2.1 // top of windshield
  );
  profile.lineTo(-0.6, 2.12); // roof
  profile.bezierCurveTo(
    -1.2,
    2.1,
    -1.6,
    1.95,
    -1.95,
    1.55 // rear glass slope (fastback)
  );
  profile.lineTo(-2.0, 1.4);

  const greenhouseGeo = new THREE.ExtrudeGeometry(profile, {
    depth: 1.7,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: 0.06,
    bevelThickness: 0.06,
    curveSegments: 24,
  });
  greenhouseGeo.translate(0, 0, -0.85);

  // Two layers: an outer painted shell (the roof and pillars) and an inner
  // tinted glass volume offset slightly inward.
  const roof = new THREE.Mesh(greenhouseGeo, M.body);
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  // Glass: same profile but inset, with the trim material at the pillars hidden
  // by overlapping the painted roof.
  const glassProfile = new THREE.Shape();
  glassProfile.moveTo(-1.85, 1.42);
  glassProfile.lineTo(1.45, 1.42);
  glassProfile.lineTo(1.35, 1.55);
  glassProfile.bezierCurveTo(1.05, 1.92, 0.85, 2.0, 0.5, 2.05);
  glassProfile.lineTo(-0.55, 2.07);
  glassProfile.bezierCurveTo(-1.15, 2.05, -1.5, 1.92, -1.8, 1.55);
  glassProfile.lineTo(-1.85, 1.42);

  const glassGeo = new THREE.ExtrudeGeometry(glassProfile, {
    depth: 1.62,
    bevelEnabled: false,
    curveSegments: 24,
  });
  glassGeo.translate(0, 0, -0.81);
  const glass = new THREE.Mesh(glassGeo, M.glass);
  glass.renderOrder = 1;
  group.add(glass);

  // A-pillar / B-pillar / D-pillar trim strips along the sides.
  const pillarMat = M.trim;
  const pillarPositions = [
    // [xCenter, yCenter, length-along-roofline, rotationZ]
    [1.18, 1.78, 0.72, -0.45], // A-pillar
    [0.05, 2.07, 0.18, 0], // B-pillar (top portion)
    [-1.55, 1.78, 0.7, 0.5], // D-pillar
  ];
  for (const [x, y, len, rz] of pillarPositions) {
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, len, 0.05),
        pillarMat
      );
      p.position.set(x, y, side * 0.92);
      p.rotation.z = rz;
      group.add(p);
    }
  }

  return group;
}

function buildFenderFlares(M) {
  // The Solterra's most recognizable cue: thick black plastic fender arches.
  const group = new THREE.Group();

  // Each flare is an extruded ring sitting around a wheel well.
  const wheelXs = [1.42, -1.42];
  const wheelZs = [0.97, -0.97];

  for (const x of wheelXs) {
    for (const z of wheelZs) {
      const arch = makeFenderArch(M.cladding);
      arch.position.set(x, 0.55, z);
      // Flip the arch so it faces outward.
      if (z < 0) arch.rotation.y = Math.PI;
      group.add(arch);
    }
  }

  return group;
}

function makeFenderArch(material) {
  // A half-torus flattened slightly, then a thin outer lip.
  const arch = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.11, 14, 24, Math.PI),
    material
  );
  ring.rotation.y = Math.PI / 2;
  ring.position.y = 0.05;
  ring.castShadow = true;
  arch.add(ring);

  // Outer lip box to thicken the flare horizontally.
  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.18, 0.16),
    material
  );
  lip.position.set(0, 0.05, 0.07);
  lip.castShadow = true;
  arch.add(lip);

  return arch;
}

function buildLights(M) {
  const group = new THREE.Group();

  // Front: slim LED bar across the closed fascia, plus two C-shaped headlamps.
  const ledBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.05, 1.4),
    M.headlight
  );
  ledBar.position.set(2.86, 1.05, 0);
  group.add(ledBar);

  for (const z of [-0.7, 0.7]) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.18, 0.42),
      M.headlight
    );
    lamp.position.set(2.86, 0.95, z);
    group.add(lamp);
  }

  // Rear: full-width light bar (current Subaru design language).
  const tailBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.08, 1.65),
    M.taillight
  );
  tailBar.position.set(-2.72, 1.15, 0);
  group.add(tailBar);

  // Inset corner brake lights.
  for (const z of [-0.78, 0.78]) {
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.16, 0.32),
      M.taillight
    );
    tail.position.set(-2.72, 1.0, z);
    group.add(tail);
  }

  return group;
}

function buildDetails(M) {
  const group = new THREE.Group();

  // Side mirrors.
  for (const z of [-0.95, 0.95]) {
    const mirror = new THREE.Group();
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.08),
      M.body
    );
    arm.position.set(0, 0, 0);
    mirror.add(arm);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.18, 0.16),
      M.body
    );
    head.position.set(0.15, 0.02, 0);
    mirror.add(head);
    mirror.position.set(1.05, 1.55, z);
    group.add(mirror);
  }

  // Roof rails.
  for (const z of [-0.78, 0.78]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.08, 0.07),
      M.trim
    );
    rail.position.set(-0.2, 2.16, z);
    group.add(rail);
  }

  // Roof spoiler at the top of the rear glass.
  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.1, 1.55),
    M.body
  );
  spoiler.position.set(-1.55, 2.05, 0);
  spoiler.rotation.z = -0.15;
  group.add(spoiler);

  // Front skid plate (silver underbody trim).
  const skid = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.12, 1.2),
    M.chrome
  );
  skid.position.set(2.65, 0.45, 0);
  group.add(skid);

  // Rear skid plate.
  const rearSkid = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.12, 1.2),
    M.chrome
  );
  rearSkid.position.set(-2.55, 0.45, 0);
  group.add(rearSkid);

  // Door handles: one per door, four total.
  const handlePositions = [
    [0.95, 1.18, 0.97],
    [-0.35, 1.18, 0.97],
    [0.95, 1.18, -0.97],
    [-0.35, 1.18, -0.97],
  ];
  for (const [x, y, z] of handlePositions) {
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.05, 0.04),
      M.chrome
    );
    handle.position.set(x, y, z);
    group.add(handle);
  }

  // Subaru-style front badge accent.
  const badge = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.12, 0.28),
    M.chrome
  );
  badge.position.set(2.88, 1.2, 0);
  group.add(badge);

  return group;
}

// ----- Public API ------------------------------------------------------------

export function buildSolterra(initialBodyColor = "#1f3a5f") {
  const car = new THREE.Group();
  car.name = "Solterra";

  const M = makeMaterials(initialBodyColor);

  car.add(buildLowerBody(M));
  car.add(buildMidBody(M));
  car.add(buildGreenhouse(M));
  car.add(buildFenderFlares(M));
  car.add(buildLights(M));
  car.add(buildDetails(M));

  // Wheels: 4 instances. Track and wheelbase chosen to match the body.
  const wheels = [];
  const wheelPositions = [
    [1.42, 0.42, 0.97], // front-right
    [1.42, 0.42, -0.97], // front-left
    [-1.42, 0.42, 0.97], // rear-right
    [-1.42, 0.42, -0.97], // rear-left
  ];
  for (const [x, y, z] of wheelPositions) {
    const wheel = buildWheel(M);
    wheel.position.set(x, y, z);
    car.add(wheel);
    wheels.push(wheel);
  }

  // Make sure every mesh casts shadows by default.
  car.traverse((obj) => {
    if (obj.isMesh) {
      if (obj.userData.castShadow !== false) obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  // Expose handles on the car group so main.js can wire UI without coupling.
  car.userData.wheels = wheels;
  car.userData.materials = M;
  car.userData.setBodyColor = (hex) => {
    M.body.color.set(hex);
  };

  return car;
}
