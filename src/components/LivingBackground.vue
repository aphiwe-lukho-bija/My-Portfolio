<script setup>
/* LivingBackground.vue — one continuous environment behind every section.

   A single full-screen fragment shader (plain WebGL, no 3D library) draws
   a dark liquid-metal surface: slow folds of satin titanium lit by two
   drifting softboxes and a faint amber rim light. It reacts quietly to
   scroll and cursor (parallax), its palette drifts as you move down the
   page, and now and then a polished-silver ribbon crosses the dark like a
   re-entering object, once on arrival and softly on section changes.

   Cost control: renders at reduced resolution (the surface is soft, so you
   cannot tell), caps frame rate on weaker devices, lowers its own
   resolution if frames run slow, stops when the tab is hidden or the chess
   scene is open, and falls back to animated CSS gradients without WebGL.
   With "reduce motion" it draws a single still frame. */
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  paused: { type: Boolean, default: false },
  reducedMotion: { type: Boolean, default: false }
})

const canvas = ref(null)
const glReady = ref(false)

const VERT = `
attribute vec2 aPos;
void main () { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uScroll;    // scrolled distance in viewport heights
uniform float uSection;   // 0..1 progress down the page
uniform vec2 uStrikeA;    // x: progress 0..1 (negative = idle)
uniform vec2 uStrikeB;

float hash (vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise (vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm (vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p;
    a *= 0.5;
  }
  return v;
}

// a slowly folding silk-like height field
float silk (vec2 p, float t) {
  vec2 q = vec2(
    fbm(p * 0.7 + vec2(0.0, t * 0.018)),
    fbm(p * 0.7 + vec2(4.3, 1.7) - vec2(t * 0.014, 0.0))
  );
  return fbm(p * 0.8 + 2.4 * q + vec2(t * 0.012, -t * 0.008));
}

vec2 stretch (vec2 p) {
  // rotate and squash so the folds run in long diagonal sweeps
  float c = 0.82;
  float s = 0.57;
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  return vec2(p.x * 0.55, p.y * 1.15);
}

// reflections of the studio: two softboxes and a faint amber rim light
vec3 studio (vec2 r, vec2 l1, vec2 l2, vec2 l3, vec3 cool, vec3 warm) {
  float b1 = exp(-pow(length((r - l1) * vec2(1.0, 2.2)) / 0.34, 2.0));
  float b2 = exp(-pow(length((r - l2) * vec2(1.8, 1.0)) / 0.26, 2.0));
  float rim = exp(-pow(length(r - l3) / 0.36, 2.0));
  float sky = 0.5 + 0.5 * r.y;
  return cool * b1 * 0.3 + warm * b2 * 0.22 + vec3(0.92, 0.56, 0.2) * rim * 0.13 + cool * sky * 0.03;
}

vec3 layer (vec2 p, float t, float slope, vec2 l1, vec2 l2, vec2 l3, vec3 cool, vec3 warm, vec3 ebony, vec3 walnut, float brush) {
  vec2 sp = stretch(p);
  float e = 0.05;
  float h0 = silk(sp, t);
  float hx = silk(sp + vec2(e, 0.0), t);
  float hy = silk(sp + vec2(0.0, e), t);
  vec3 n = normalize(vec3(-(hx - h0) / e * slope, -(hy - h0) / e * slope, 1.0));
  vec2 r = 2.0 * n.z * n.xy;
  vec3 albedo = mix(ebony, walnut, smoothstep(0.32, 0.74, h0));
  float br = 0.88 + 0.24 * vnoise(vec2(p.x * 1.4, p.y * 90.0));
  vec3 env = studio(r, l1, l2, l3, cool, warm) * mix(1.0, br, brush);
  return albedo + env;
}

// a polished ribbon travelling along A -> B; returns glow (rgb) and cast light on the surface (a)
vec4 ribbon (vec2 c, vec2 A, vec2 B, float prog, float w0, float tail, float seed, float t) {
  if (prog < 0.0) return vec4(0.0);
  vec2 dir = B - A;
  float len = length(dir);
  dir /= len;
  vec2 nrm = vec2(-dir.y, dir.x);
  vec2 rel = c - A;
  float a = dot(rel, dir);
  float cr = dot(rel, nrm);

  float k = clamp(prog / 0.55, 0.0, 1.0);
  float head = len * (k * k * (3.0 - 2.0 * k));
  float u = head - a;                                   // distance behind the head
  float fade = 1.0 - smoothstep(0.5, 1.0, prog);        // dissolves into calm afterwards

  float wob = 0.024 * sin(a * 2.4 + seed) + 0.006 * sin(a * 6.0 - t * 1.2 + seed * 2.0);
  float cc = cr - wob * smoothstep(0.0, 0.35, u);

  float body = smoothstep(0.0, 0.06, u) * (1.0 - smoothstep(0.12 * tail, tail, u));
  float w = w0 * body + 0.0008;
  float soft = 0.0015 + 0.024 * clamp(u / tail, 0.0, 1.0);  // motion blur grows toward the tail
  float s = clamp(soft / w, 0.03, 1.4);
  float q = cc / w;
  float mask = (1.0 - smoothstep(1.0 - s, 1.0 + s, abs(q))) * step(-0.01, u);

  float nz = sqrt(max(0.0, 1.0 - min(q * q, 1.0)));
  vec3 nl = normalize(vec3(q, 0.08 * sin(u * 5.0 - t * 1.6 + seed) * nz, nz));
  vec2 rxy = (nrm * nl.x + dir * nl.y) * 2.0 * nl.z;

  float e1 = smoothstep(0.42, 0.95, sin(rxy.x * 4.0 + rxy.y * 2.0 + u * 1.8 + 1.3) * 0.5 + 0.5);
  float e2 = smoothstep(0.7, 1.0, sin(rxy.y * 5.0 - rxy.x * 2.0 - u * 1.3) * 0.5 + 0.5);
  vec3 chrome = mix(vec3(0.045, 0.048, 0.058), vec3(0.84, 0.86, 0.9), clamp(e1 * 0.8 + e2 * 0.45, 0.0, 1.0));
  chrome += vec3(1.0, 0.97, 0.92) * exp(-pow((q + 0.28) * 3.2, 2.0)) * 0.5;

  float rimK = exp(-3.0 * u / tail);
  chrome += vec3(0.95, 0.56, 0.16) * pow(abs(q), 5.0) * (0.3 + 0.8 * rimK);

  float inten = (0.14 + 0.86 * exp(-2.2 * u / tail)) * fade * mask;
  vec3 col = chrome * inten;

  // the bright, small head with a restrained amber halo
  vec2 hp = A + dir * head;
  float d = length(c - hp);
  float headVis = smoothstep(0.0, 0.05, prog) * (1.0 - smoothstep(0.5, 0.58, prog));
  col += (vec3(1.0, 0.9, 0.74) * exp(-d * d / 0.0004) * 0.75 + vec3(0.95, 0.55, 0.16) * exp(-d * d / 0.011) * 0.11) * headVis;

  float spill = exp(-pow(cr / 0.24, 2.0)) * smoothstep(-0.2, 0.2, u) * exp(-1.6 * u / tail) * fade * 0.075;
  return vec4(col, spill);
}

void main () {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 c = (uv - 0.5) * vec2(asp, 1.0);
  float t = uTime;
  float sct = uSection;

  // palette drifts gently from cool titanium to warm brass down the page
  float warmth = 0.5 + 0.5 * sin(sct * 5.2 + 0.4);
  vec3 ebony = vec3(0.028, 0.023, 0.02);
  vec3 walnut = mix(vec3(0.1, 0.066, 0.042), vec3(0.082, 0.056, 0.04), warmth);
  vec3 cool = mix(vec3(0.74, 0.77, 0.8), vec3(0.82, 0.78, 0.72), warmth);
  vec3 warm = mix(vec3(0.74, 0.56, 0.34), vec3(0.86, 0.66, 0.4), warmth);

  float a1 = t * 0.045 + sct * 2.4 + 0.6;
  float a2 = -t * 0.03 + 2.4 + sct * 1.5;
  float a3 = t * 0.02 + 4.0 - sct * 1.1;
  vec2 l1 = vec2(cos(a1), sin(a1)) * 0.3;
  vec2 l2 = vec2(cos(a2), sin(a2)) * 0.34;
  vec2 l3 = vec2(cos(a3), sin(a3)) * 0.4;

  vec2 far = c * 1.25 + uMouse * vec2(0.035, 0.025) + vec2(0.0, uScroll * 0.05);
  vec2 near = c * 2.7 + uMouse * vec2(0.09, 0.06) + vec2(0.0, uScroll * 0.12) + 7.0;

  vec3 col = layer(far, t, 2.4, l1, l2, l3, cool, warm, ebony, walnut, 0.0);
  col += (layer(near, t * 1.4, 1.6, l1, l2, l3, cool, warm, ebony, walnut, 1.0) - ebony) * 0.1;

  // the signature ribbon: one on arrival, a smaller one on section changes
  vec4 rA = ribbon(c, vec2(0.62 * asp + 0.3, 0.62), vec2(-0.62 * asp - 0.3, -0.5), uStrikeA.x, 0.034, 1.15, 1.0, t);
  vec4 rB = ribbon(c, vec2(-0.55 * asp - 0.25, 0.56), vec2(0.6 * asp + 0.3, -0.38), uStrikeB.x, 0.017, 0.75, 3.7, t);
  col += rA.rgb + rB.rgb;
  col += mix(cool, warm, 0.4) * (rA.a + rB.a);

  // depth: darker edges, a calm top for the navigation
  float vg = smoothstep(1.3, 0.2, length(c * vec2(0.75, 1.0)));
  col *= mix(0.42, 1.0, vg);
  col *= 1.0 - 0.4 * smoothstep(0.7, 1.0, uv.y);

  col = 1.0 - exp(-col * 1.45);
  col += (hash(gl_FragCoord.xy) - 0.5) * (1.6 / 255.0);
  gl_FragColor = vec4(col, 1.0);
}
`

let gl, program, buf, raf = 0, running = false
let uniforms = {}
let cssW = 0, cssH = 0
let scale = 0.5
let fpsInterval = 0
let last = 0, lastRender = 0
let slowFrames = 0
let mouseT = [0, 0], mouse = [0, 0]
let scrollSmooth = 0, sectionSmooth = 0
let t0 = 0
let strikeA = { start: -1, dur: 3.6 }
let strikeB = { start: -1, dur: 2.6 }
let lastSectionStrike = -1e9
let resizeTimer = 0
let staticFrameQueued = false
let introTimer = 0

const isTouch = () => window.matchMedia('(pointer: coarse)').matches
const nowSec = () => performance.now() / 1000

function compile (type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('Background shader failed:', gl.getShaderInfoLog(sh))
    return null
  }
  return sh
}

function initGL () {
  const cv = canvas.value
  gl = cv.getContext('webgl', {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: 'low-power', preserveDrawingBuffer: false
  })
  if (!gl) return false
  const vs = compile(gl.VERTEX_SHADER, VERT)
  const fs = compile(gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return false
  program = gl.createProgram()
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false
  gl.useProgram(program)

  buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(program, 'aPos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  uniforms = {}
  for (const n of ['uRes', 'uTime', 'uMouse', 'uScroll', 'uSection', 'uStrikeA', 'uStrikeB']) {
    uniforms[n] = gl.getUniformLocation(program, n)
  }
  return true
}

function size (force = false) {
  const w = window.innerWidth
  const h = window.innerHeight
  // ignore the small height changes of a mobile browser's collapsing toolbar
  if (!force && Math.abs(w - cssW) < 2 && Math.abs(h - cssH) < 120) return
  cssW = w
  cssH = h
  const cv = canvas.value
  cv.width = Math.max(2, Math.round(w * scale))
  cv.height = Math.max(2, Math.round(h * scale))
  gl && gl.viewport(0, 0, cv.width, cv.height)
  requestStaticFrame()
}

function draw (time) {
  if (!gl || gl.isContextLost()) return
  const cv = canvas.value
  const doc = document.documentElement
  const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight)
  gl.uniform2f(uniforms.uRes, cv.width, cv.height)
  gl.uniform1f(uniforms.uTime, time)
  gl.uniform2f(uniforms.uMouse, mouse[0], mouse[1])
  gl.uniform1f(uniforms.uScroll, scrollSmooth)
  gl.uniform1f(uniforms.uSection, sectionSmooth)
  const tNow = nowSec()
  const pa = strikeA.start >= 0 ? (tNow - strikeA.start) / strikeA.dur : -1
  const pb = strikeB.start >= 0 ? (tNow - strikeB.start) / strikeB.dur : -1
  gl.uniform2f(uniforms.uStrikeA, pa > 1 ? -1 : pa, 1)
  gl.uniform2f(uniforms.uStrikeB, pb > 1 ? -1 : pb, 1)
  if (pa > 1) strikeA.start = -1
  if (pb > 1) strikeB.start = -1
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  return maxScroll
}

function readScroll (dt, instant = false) {
  const doc = document.documentElement
  const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight)
  const y = window.scrollY
  const k = instant ? 1 : 1 - Math.exp(-dt * 3.2)
  scrollSmooth += (y / window.innerHeight - scrollSmooth) * k
  sectionSmooth += (y / maxScroll - sectionSmooth) * k
}

function frame (ts) {
  if (!running) return
  raf = requestAnimationFrame(frame)
  const dtMs = ts - lastRender
  if (dtMs < fpsInterval - 1) return // frame-rate cap on weaker devices
  const dt = Math.min(0.1, (ts - last) / 1000 || 0.016)
  last = ts
  lastRender = ts

  const km = 1 - Math.exp(-dt * 2.6)
  mouse[0] += (mouseT[0] - mouse[0]) * km
  mouse[1] += (mouseT[1] - mouse[1]) * km
  readScroll(dt)
  draw(nowSec() - t0 + 12)

  // quality governor: if frames keep arriving late, draw at a lower resolution
  if (dtMs > fpsInterval * 1.7 && dtMs < 400) slowFrames++
  else slowFrames = Math.max(0, slowFrames - 1)
  if (slowFrames > 40 && scale > 0.28) {
    scale = Math.max(0.28, scale * 0.8)
    slowFrames = 0
    size(true)
  }
}

function start () {
  if (running || !glReady.value || props.reducedMotion || props.paused || document.hidden) return
  running = true
  last = lastRender = performance.now()
  raf = requestAnimationFrame(frame)
}

function stop () {
  running = false
  cancelAnimationFrame(raf)
}

/* with reduced motion the scene is one still frame, redrawn only if the view changes */
function requestStaticFrame () {
  if (!props.reducedMotion || !glReady.value || staticFrameQueued) return
  staticFrameQueued = true
  requestAnimationFrame(() => {
    staticFrameQueued = false
    readScroll(0, true)
    draw(14)
  })
}

function onPointerMove (e) {
  mouseT = [(e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1)]
}

function onScroll () {
  if (props.reducedMotion) requestStaticFrame()
}

function onVisibility () {
  if (document.hidden) stop()
  else start()
}

function onResize () {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => size(), 150)
}

function onNavigate () {
  // a soft pass when the visitor jumps to another section
  if (props.reducedMotion || !glReady.value) return
  const t = nowSec()
  if (t - lastSectionStrike < 9 || strikeA.start >= 0) return
  lastSectionStrike = t
  strikeB = { start: t, dur: 2.6 }
}

function onContextLost (e) {
  e.preventDefault()
  stop()
  glReady.value = false
}

function onContextRestored () {
  if (initGL()) {
    size(true)
    glReady.value = true
    start()
  }
}

function setup () {
  const lowPower = isTouch() || (navigator.hardwareConcurrency || 8) <= 4
  scale = isTouch() || Math.min(window.innerWidth, window.innerHeight) < 700 ? 0.4 : 0.55
  fpsInterval = lowPower ? 1000 / 30 : 1000 / 60
  t0 = nowSec()
  if (!initGL()) return
  glReady.value = true
  size(true)
  readScroll(0, true)

  if (props.reducedMotion) {
    requestStaticFrame()
  } else {
    // the arrival: one ribbon, shortly after the page appears
    introTimer = setTimeout(() => { strikeA = { start: nowSec(), dur: 3.6 } }, 450)
    start()
  }
}

onMounted(() => {
  const cv = canvas.value
  cv.addEventListener('webglcontextlost', onContextLost)
  cv.addEventListener('webglcontextrestored', onContextRestored)
  window.addEventListener('resize', onResize)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('portfolio:navigate', onNavigate)
  document.addEventListener('visibilitychange', onVisibility)
  setup()
})

onBeforeUnmount(() => {
  stop()
  clearTimeout(resizeTimer)
  clearTimeout(introTimer)
  const cv = canvas.value
  cv && cv.removeEventListener('webglcontextlost', onContextLost)
  cv && cv.removeEventListener('webglcontextrestored', onContextRestored)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('portfolio:navigate', onNavigate)
  document.removeEventListener('visibilitychange', onVisibility)
  if (gl) {
    gl.deleteBuffer(buf)
    gl.deleteProgram(program)
    const ext = gl.getExtension('WEBGL_lose_context')
    ext && ext.loseContext()
  }
})

watch(() => props.paused, (p) => (p ? stop() : start()))

watch(() => props.reducedMotion, (reduced) => {
  if (reduced) {
    stop()
    strikeA.start = strikeB.start = -1
    requestStaticFrame()
  } else {
    start()
  }
})
</script>

<template>
  <div class="living-bg" aria-hidden="true">
    <!-- shown until WebGL is drawing, and kept for devices without it -->
    <div class="bg-fallback" :class="{ off: glReady }">
      <i></i><i></i><i></i>
    </div>
    <canvas ref="canvas" class="bg-canvas" :class="{ on: glReady }"></canvas>
    <div class="bg-grain"></div>
  </div>
</template>

<style scoped>
.living-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  height: 100lvh;
  z-index: 0;
  pointer-events: none;
  background: var(--ebony);
  overflow: hidden;
}

.bg-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 1.6s ease;
}

.bg-canvas.on {
  opacity: 1;
}

/* CSS-only stand-in: three large soft lights drifting over ebony */
.bg-fallback {
  position: absolute;
  inset: 0;
  transition: opacity 1.6s ease;
}

.bg-fallback.off {
  opacity: 0;
  visibility: hidden;
  transition: opacity 1.6s ease, visibility 0s 1.6s;
}

.bg-fallback i {
  position: absolute;
  width: 70vmax;
  height: 70vmax;
  border-radius: 50%;
  will-change: transform;
}

.bg-fallback i:nth-child(1) {
  top: -30vmax;
  left: -15vmax;
  background: radial-gradient(circle, rgba(190, 195, 200, 0.16), transparent 62%);
  animation: driftA 46s ease-in-out infinite alternate;
}

.bg-fallback i:nth-child(2) {
  bottom: -35vmax;
  right: -20vmax;
  background: radial-gradient(circle, rgba(176, 141, 87, 0.17), transparent 62%);
  animation: driftB 58s ease-in-out infinite alternate;
}

.bg-fallback i:nth-child(3) {
  top: 20vh;
  right: 10vw;
  width: 50vmax;
  height: 50vmax;
  background: radial-gradient(circle, rgba(92, 60, 36, 0.3), transparent 65%);
  animation: driftC 70s ease-in-out infinite alternate;
}

@keyframes driftA { to { transform: translate3d(22vw, 16vh, 0) scale(1.15); } }
@keyframes driftB { to { transform: translate3d(-24vw, -14vh, 0) scale(1.1); } }
@keyframes driftC { to { transform: translate3d(-30vw, 12vh, 0) scale(0.85); } }

/* fine static grain: hides banding in the dark gradients */
.bg-grain {
  position: absolute;
  inset: 0;
  opacity: 0.045;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

@media (prefers-reduced-motion: reduce) {
  .bg-fallback i { animation: none; }
  .bg-canvas,
  .bg-fallback { transition-duration: 0.01ms; }
}
</style>
