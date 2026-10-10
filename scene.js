/* 3D background: dotted rotating globe, orbit rings, floating orbs and a starfield.
   Reacts to mouse / touch movement. Falls back silently if WebGL is unavailable. */
(function () {
  const canvas = document.getElementById('scene');
  if (!canvas || typeof THREE === 'undefined') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    canvas.style.display = 'none';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const world = new THREE.Group();
  scene.add(world);

  // Dotted globe (Fibonacci sphere)
  const R = 2.4;
  const N = 1800;
  const pos = new Float32Array(N * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i;
    pos[i * 3] = Math.cos(t) * r * R;
    pos[i * 3 + 1] = y * R;
    pos[i * 3 + 2] = Math.sin(t) * r * R;
  }
  const globeGeo = new THREE.BufferGeometry();
  globeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const globe = new THREE.Points(
    globeGeo,
    new THREE.PointsMaterial({ color: 0x7cc4ff, size: 0.035, transparent: true, opacity: 0.9, depthWrite: false })
  );
  world.add(globe);

  // Inner glow sphere
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.98, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x0b1f4a, transparent: true, opacity: 0.55 })
  );
  world.add(core);

  // Atmosphere halo
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.12, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x4aa8ff, transparent: true, opacity: 0.07, side: THREE.BackSide })
  );
  world.add(halo);

  // Orbit rings with a satellite each
  const rings = [];
  function addRing(radius, tiltX, tiltZ, color, speed) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.008, 8, 160),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 })
    );
    const sat = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    sat.position.set(radius, 0, 0);
    const pivot = new THREE.Group();
    pivot.add(sat);
    g.add(ring, pivot);
    g.rotation.x = tiltX;
    g.rotation.z = tiltZ;
    world.add(g);
    rings.push({ pivot, speed });
  }
  addRing(3.3, 1.2, 0.3, 0x7cc4ff, 0.6);
  addRing(3.9, 0.5, -0.6, 0xc08bff, -0.4);

  // Floating soft orbs (warm sun-ish + cool)
  const orbs = [];
  const orbColors = [0xffc857, 0x6ee7ff, 0xb48cff, 0xff8fb1];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.1 + Math.random() * 0.22, 24, 24),
      new THREE.MeshBasicMaterial({ color: orbColors[i % orbColors.length], transparent: true, opacity: 0.35 })
    );
    m.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 9, -2 - Math.random() * 6);
    m.userData = { base: m.position.clone(), speed: 0.3 + Math.random() * 0.6, phase: Math.random() * 6.28 };
    scene.add(m);
    orbs.push(m);
  }

  // Starfield
  const SN = 700;
  const sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) {
    sp[i * 3] = (Math.random() - 0.5) * 60;
    sp[i * 3 + 1] = (Math.random() - 0.5) * 36;
    sp[i * 3 + 2] = -8 - Math.random() * 26;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.8, depthWrite: false })
  );
  scene.add(stars);

  // Layout: globe sits behind the hero on desktop, higher and smaller on mobile
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const narrow = w < 700;
    world.scale.setScalar(narrow ? 0.62 : 1);
    world.position.set(narrow ? 0 : 3.4, narrow ? 2.6 : 0.9, 0);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // Pointer parallax
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  function onMove(x, y) {
    target.x = (x / window.innerWidth - 0.5) * 2;
    target.y = (y / window.innerHeight - 0.5) * 2;
  }
  window.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY), { passive: true });

  // Tint the scene based on the most recent weather (called from script.js)
  const tint = new THREE.Color(0x7cc4ff);
  const tintTo = new THREE.Color(0x7cc4ff);
  window.setSceneMood = function (hex) {
    tintTo.set(hex);
  };

  const clock = new THREE.Clock();
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) loop();
  });

  function frame() {
    const t = clock.getElapsedTime();
    if (!reduceMotion) {
      globe.rotation.y = t * 0.12;
      core.rotation.y = t * 0.12;
      rings.forEach((r) => (r.pivot.rotation.y = t * r.speed));
      stars.rotation.z = t * 0.006;
      orbs.forEach((o) => {
        const d = o.userData;
        o.position.y = d.base.y + Math.sin(t * d.speed + d.phase) * 0.6;
        o.position.x = d.base.x + Math.cos(t * d.speed * 0.7 + d.phase) * 0.4;
      });
    }
    cur.x += (target.x - cur.x) * 0.05;
    cur.y += (target.y - cur.y) * 0.05;
    world.rotation.x = cur.y * 0.25;
    world.rotation.z = -cur.x * 0.06;
    camera.position.x = cur.x * 0.5;
    camera.position.y = -cur.y * 0.3;
    camera.lookAt(0, 0, 0);

    tint.lerp(tintTo, 0.03);
    globe.material.color.copy(tint);
    renderer.render(scene, camera);
  }

  function loop() {
    if (!running) return;
    frame();
    requestAnimationFrame(loop);
  }
  loop();
})();
