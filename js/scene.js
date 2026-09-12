import * as THREE from "three";

/* ------------------------------------------------------------------ *
 *  João Vaz — 3D hero + background
 *  A faceted "crystal core" that breathes and reacts to mouse/scroll,
 *  wrapped in a drifting particle field and orbiting geometric rings.
 * ------------------------------------------------------------------ */

const canvas = document.getElementById("scene");
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x070a12, 0.055);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 9);

/* palette (matches CSS accents) */
const ACCENT = new THREE.Color(0x6ea8fe);
const ACCENT2 = new THREE.Color(0xb388ff);
const ACCENT3 = new THREE.Color(0x4fe0c8);

/* ------------------------------------------------------------------ *
 *  Hero crystal — icosahedron with a vertex-displacement shader
 * ------------------------------------------------------------------ */
const coreGeo = new THREE.IcosahedronGeometry(2.1, 5);

const coreMat = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: {
    uTime: { value: 0 },
    uAmp: { value: 0.2 },
    uShift: { value: 0.0 },
    uGlow: { value: 0.28 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uA: { value: ACCENT },
    uB: { value: ACCENT2 },
    uC: { value: ACCENT3 },
  },
  vertexShader: /* glsl */ `
    uniform float uTime;
    uniform float uAmp;
    uniform vec2 uMouse;
    varying vec3 vNormal;
    varying float vDisp;

    // classic simplex-ish noise (Ashima)
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod(i, 289.0);
      vec4 p = permute(permute(permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 1.0/7.0;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    // smooth rolling displacement (low frequency, gentle second octave)
    float disp(vec3 dir) {
      float t = uTime * 0.32;
      float n = snoise(dir * 1.05 + vec3(t, t * 0.6, uMouse.x + uMouse.y));
      n += 0.28 * snoise(dir * 1.9 - vec3(t * 0.75));
      return n;
    }

    void main() {
      vec3 nrm = normalize(normal);
      float rad = length(position);           // vertices lie on a sphere of this radius
      float n = disp(nrm);
      vDisp = n;
      vec3 pos = nrm * (rad + n * uAmp);

      // reconstruct a soft surface normal from the displaced neighbourhood
      vec3 t1 = normalize(cross(nrm, abs(nrm.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
      vec3 t2 = normalize(cross(nrm, t1));
      float eps = 0.12;
      vec3 da = normalize(nrm + t1 * eps);
      vec3 db = normalize(nrm + t2 * eps);
      vec3 pa = da * (rad + disp(da) * uAmp);
      vec3 pb = db * (rad + disp(db) * uAmp);
      vec3 sn = normalize(cross(pa - pos, pb - pos));
      if (dot(sn, nrm) < 0.0) sn = -sn;

      vNormal = normalize(normalMatrix * sn);  // view-space normal for lighting
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uA;
    uniform vec3 uB;
    uniform vec3 uC;
    uniform float uShift;
    uniform float uGlow;
    varying vec3 vNormal;
    varying float vDisp;
    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = vec3(0.0, 0.0, 1.0);                 // toward camera (view space)
      vec3 L = normalize(vec3(0.35, 0.55, 0.75));   // soft key light

      // smooth colour gradient across the surface
      float f = clamp(vDisp * 0.55 + 0.5 + uShift, 0.0, 1.0);
      vec3 col = mix(uA, uB, smoothstep(0.0, 0.7, f));
      col = mix(col, uC, smoothstep(0.5, 1.0, f));

      // gentle diffuse + wrap lighting for a rounded, realistic feel
      float diff = dot(N, L) * 0.5 + 0.5;           // half-lambert, no hard terminator
      col *= 0.55 + 0.6 * diff;

      // soft fresnel rim
      float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.6);
      col += fres * uGlow;

      gl_FragColor = vec4(col, 0.95);
    }
  `,
});
const core = new THREE.Mesh(coreGeo, coreMat);
scene.add(core);

/* faint wireframe halo around the core — finer mesh, barely-there lines */
const shellGeo = new THREE.IcosahedronGeometry(2.62, 2);
const shellMat = new THREE.MeshBasicMaterial({
  color: 0x8ab4ff,
  wireframe: true,
  transparent: true,
  opacity: 0.06,
});
const shell = new THREE.Mesh(shellGeo, shellMat);
scene.add(shell);

/* orbiting rings */
const ringGroup = new THREE.Group();
const ringDefs = [
  { r: 3.4, tube: 0.008, color: ACCENT, rot: [1.2, 0.3, 0] },
  { r: 4.0, tube: 0.006, color: ACCENT2, rot: [0.4, 1.1, 0.5] },
  { r: 4.7, tube: 0.005, color: ACCENT3, rot: [-0.6, 0.8, 1.0] },
];
const rings = ringDefs.map((d) => {
  const g = new THREE.TorusGeometry(d.r, d.tube, 12, 160);
  const m = new THREE.MeshBasicMaterial({
    color: d.color,
    transparent: true,
    opacity: 0.5,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.rotation.set(d.rot[0], d.rot[1], d.rot[2]);
  ringGroup.add(mesh);
  return mesh;
});
scene.add(ringGroup);

/* ------------------------------------------------------------------ *
 *  Particle field background
 * ------------------------------------------------------------------ */
const P_COUNT = 1400;
const pPos = new Float32Array(P_COUNT * 3);
const pCol = new Float32Array(P_COUNT * 3);
const palette = [ACCENT, ACCENT2, ACCENT3];
for (let i = 0; i < P_COUNT; i++) {
  const r = 6 + Math.pow(Math.random(), 0.6) * 26;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
  pPos[i * 3 + 2] = r * Math.cos(phi) - 6;
  const c = palette[(Math.random() * palette.length) | 0];
  pCol[i * 3] = c.r;
  pCol[i * 3 + 1] = c.g;
  pCol[i * 3 + 2] = c.b;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
const pMat = new THREE.PointsMaterial({
  size: 0.05,
  vertexColors: true,
  transparent: true,
  opacity: 0.85,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  sizeAttenuation: true,
});
const particles = new THREE.Points(pGeo, pMat);
scene.add(particles);

/* lights (for any lit materials + ambient mood) */
scene.add(new THREE.AmbientLight(0x404a6b, 1.2));
const key = new THREE.PointLight(0x6ea8fe, 40, 40);
key.position.set(6, 6, 8);
scene.add(key);
const fill = new THREE.PointLight(0xb388ff, 24, 40);
fill.position.set(-8, -4, 4);
scene.add(fill);


/* ------------------------------------------------------------------ *
 *  Scroll storytelling
 *
 *  The crystal is the narrator. Each section owns a pose — where the
 *  object sits, how big it is, how loud its surface and rings are, and
 *  which end of the palette it leans on. Scroll interpolates between
 *  the poses, so the object reacts to the story instead of drifting.
 * ------------------------------------------------------------------ */
const S = window.Scroll;

/* One pose per section. x is in units of `spread`, so the object keeps
   the same relation to the text column at every width.

   The story: the crystal leads the hero, steps back behind the copy
   while you read, wakes up for the building section, and returns to
   meet you at the contact. Fog does the dimming for free.

   The reading sections keep it to the right of the 1120px text column —
   the left margin is only ~160px wide at 1440, and the sticky date
   column of the timeline lives there. Travel between poses is carried
   by depth, scale and energy rather than by crossing the copy. */
const POSES = {
  /*            x       y      z     scale  amp    rings  shift  glow   cam  */
  top:      { x:  1.05, y:  0.40, z:  0.0, s: 1.00, a: 0.20, r: 0.50, h:  0.00, g: 0.28, c: 9.0 },
  about:    { x:  2.05, y: -0.35, z: -6.0, s: 0.52, a: 0.12, r: 0.18, h: -0.18, g: 0.12, c: 9.4 },
  work:     { x:  2.30, y:  0.45, z: -7.5, s: 0.44, a: 0.09, r: 0.30, h:  0.10, g: 0.10, c: 9.6 },
  building: { x:  1.30, y:  0.30, z: -5.0, s: 0.66, a: 0.26, r: 0.55, h:  0.26, g: 0.22, c: 9.2 },
  skills:   { x:  2.30, y: -0.45, z: -7.0, s: 0.42, a: 0.10, r: 0.20, h: -0.10, g: 0.10, c: 9.5 },
  contact:  { x:  0.00, y:  0.55, z:  0.2, s: 0.95, a: 0.28, r: 0.75, h:  0.05, g: 0.34, c: 8.4 },
};
const ORDER = ["top", "about", "work", "building", "skills", "contact"];
const KEYS = ["x", "y", "z", "s", "a", "r", "h", "g", "c"];

let spread = 3.0;
let sizeFit = 1.0;
let yShift = 0.0;
let stops = [];

function computeLayout(state, anchors) {
  const w = state.vw;
  if (w > 1240) spread = 3.4;
  else if (w > 1040) spread = 2.8;
  else if (w > 860) spread = 2.2;
  else if (w > 700) spread = 1.3;
  else spread = 0.0; // phones: keep it centred, behind the veil

  /* At radius 2.1 the crystal is wider than a phone viewport, so it
     would bury the hero title. Shrink it to fit, and on phones drop it
     below the title instead of behind it. */
  sizeFit = S.clamp(0.55 + ((w - 375) / (1000 - 375)) * 0.45, 0.55, 1.0);
  yShift = w > 820 ? 0.0 : -1.05;

  /* Two stops per section — arrive, then hold. The object settles
     while you read a section and only travels between them. */
  stops = [];
  ORDER.forEach((id, i) => {
    const a = anchors[id];
    if (!a) return;
    const pose = POSES[id];
    const arrive = i === 0 ? 0 : a.top - state.vh * 0.35;
    const leave = a.top + a.height - state.vh * 0.80;
    stops.push({ id: id, at: arrive, pose: pose });
    if (leave > arrive) stops.push({ id: id + ":hold", at: leave, pose: pose });
  });
  stops.sort((p, q) => p.at - q.at);
}
S.onMeasure(computeLayout);

/* interpolate the pose track at the current scroll position */
const pose = Object.assign({}, POSES.top);
function samplePose(y) {
  if (!stops.length) return;
  if (y <= stops[0].at) {
    KEYS.forEach((k) => (pose[k] = stops[0].pose[k]));
    return;
  }
  const last = stops[stops.length - 1];
  if (y >= last.at) {
    KEYS.forEach((k) => (pose[k] = last.pose[k]));
    return;
  }
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (y >= a.at && y < b.at) {
      const t = S.smoothstep(S.invLerp(a.at, b.at, y));
      KEYS.forEach((k) => (pose[k] = S.lerp(a.pose[k], b.pose[k], t)));
      return;
    }
  }
}

/* ------------------------------------------------------------------ *
 *  Pointer parallax
 * ------------------------------------------------------------------ */
const pointer = new THREE.Vector2(0, 0);
const target = new THREE.Vector2(0, 0);

window.addEventListener("pointermove", (e) => {
  target.x = (e.clientX / window.innerWidth) * 2 - 1;
  target.y = -((e.clientY / window.innerHeight) * 2 - 1);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/* ------------------------------------------------------------------ *
 *  Render — driven by the shared scroll loop
 * ------------------------------------------------------------------ */
const clock = new THREE.Clock();

/* the pose is eased again on arrival, so a flick scroll glides */
const live = Object.assign({}, POSES.top);
let first = true;

function render(state) {
  const t = clock.getElapsedTime();

  samplePose(state.y);
  const k = first ? 1 : 0.08;
  KEYS.forEach((key) => (live[key] += (pose[key] - live[key]) * k));
  first = false;

  pointer.lerp(target, 0.035);

  /* surface */
  coreMat.uniforms.uTime.value = t;
  coreMat.uniforms.uAmp.value = live.a;
  coreMat.uniforms.uShift.value = live.h;
  coreMat.uniforms.uGlow.value = live.g;
  coreMat.uniforms.uMouse.value.set(pointer.x, pointer.y);

  /* rotation: time, pointer, and a slow roll paid for by scroll */
  const roll = state.y * 0.0007;
  core.rotation.y = t * 0.14 + pointer.x * 0.32 + roll;
  core.rotation.x = pointer.y * 0.26 + Math.sin(t * 0.24) * 0.1;

  shell.rotation.y = -t * 0.09 - roll * 0.6;
  shell.rotation.x = t * 0.05;

  ringGroup.rotation.y = t * 0.08 + pointer.x * 0.3 + roll * 1.4;
  ringGroup.rotation.x = pointer.y * 0.2;
  rings.forEach((ring, i) => {
    ring.rotation.z = t * (0.1 + i * 0.05);
    ring.material.opacity = live.r * (1 - i * 0.12);
  });

  particles.rotation.y = t * 0.02 + roll * 0.25;
  particles.rotation.x = pointer.y * 0.05;

  /* placement */
  core.position.set(live.x * spread, live.y + yShift, live.z);
  shell.position.copy(core.position);
  ringGroup.position.copy(core.position);

  const size = live.s * sizeFit;
  const pulse = 1 + Math.sin(t * 0.9) * 0.03;
  core.scale.setScalar(size * pulse);
  shell.scale.setScalar(size * (1 + Math.sin(t * 0.9 + 0.6) * 0.02));
  ringGroup.scale.setScalar(size);

  /* camera drifts in and out with the story */
  camera.position.x += (pointer.x * 0.6 - camera.position.x) * 0.04;
  camera.position.y += (pointer.y * 0.4 - camera.position.y) * 0.04;
  camera.position.z += (live.c - camera.position.z) * 0.06;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

if (prefersReduced) {
  /* one settled frame at the hero pose — no loop, no scroll reaction */
  coreMat.uniforms.uTime.value = 1.0;
  core.position.set(POSES.top.x * spread, POSES.top.y + yShift, POSES.top.z);
  shell.position.copy(core.position);
  ringGroup.position.copy(core.position);
  core.scale.setScalar(POSES.top.s * sizeFit);
  shell.scale.setScalar(POSES.top.s * sizeFit);
  ringGroup.scale.setScalar(POSES.top.s * sizeFit);
  renderer.render(scene, camera);
} else {
  S.onFrame(render);
}

