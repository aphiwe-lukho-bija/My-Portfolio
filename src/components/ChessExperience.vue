<script setup>
/* ChessExperience.vue — the playable 3D board.
   Built on the original ChessIntro scene (same pieces, board, lamp and
   light), now interactive: click, tap or use the keyboard to move your
   white pieces; the computer answers as black. The camera opens with a
   short cinematic move that can be skipped, then hands control to the
   visitor (drag to orbit, scroll or pinch to zoom).
   ChessGate.vue wraps this and owns the dialog frame and Back button. */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Game, WHITE, BLACK, EMPTY, squareName } from '../chess/engine.js'
import { SQ, BOARD_TOP, makePiece, boardToWorld } from '../chess/pieces.js'
import { buildStage } from '../chess/stage.js'
import { quotes } from '../data/quotes.js'

const props = defineProps({
  reducedMotion: { type: Boolean, default: false }
})
const emit = defineEmits(['ready', 'unsupported'])

/* ---------- reactive UI state ---------- */
const host = ref(null)
const stageEl = ref(null)
const phase = ref(props.reducedMotion ? 'play' : 'entry')
const status = ref('Your move.')
const announcement = ref('')
const thinking = ref(false)
const canUndo = ref(false)
const gameOver = ref(false)
const level = ref('steady')
const quoteIdx = ref(0)

const LEVELS = {
  gentle: { depth: 1, noise: 90 },
  steady: { depth: 2, noise: 25 },
  sharp: { depth: 4, noise: 0 }
}
const levelOptions = [
  { id: 'gentle', label: 'Gentle' },
  { id: 'steady', label: 'Steady' },
  { id: 'sharp', label: 'Sharp' }
]
const TYPE = ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king']

/* ---------- three.js + game state (not reactive on purpose) ---------- */
const game = new Game()
const disposables = []
const track = (o) => { disposables.push(o); return o }

let renderer, scene, camera, controls, stage, raf, resizeObs, worker
let overlay, planeGeo, discGeo, ringGeo, cursorGeo
let mats = {}
let selected = -1
let legal = []
let lastMove = null
let cursor = { file: 4, row: 6 }
let kbActive = false
let hoverSq = -1
let busy = false
let dirty = true
let userMoved = false
let reqId = 0
let quoteTimer = null
let entryStart = 0
const pieceMeshes = new Map() // square index -> piece group
const tweens = []

const ENTRY_SECONDS = 5.2
const TARGET = new THREE.Vector3(0, 0.05, 0.3)
const clamp = THREE.MathUtils.clamp
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const now = () => performance.now() / 1000

const sqWorld = (sq) => boardToWorld(sq & 7, sq >> 3)

/* ---------- camera ---------- */
function playPosition (aspect) {
  const vfov = (camera.fov * Math.PI) / 180
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect)
  const dist = Math.max(2.9 / Math.tan(hfov / 2), 7.3)
  const elevation = aspect < 0.9 ? 1.08 : 0.83 // steeper on tall phone screens
  return new THREE.Vector3(
    0,
    Math.sin(elevation) * dist,
    Math.cos(elevation) * dist
  ).add(TARGET)
}

const entryKeys = (final) => [
  { t: 0.0, pos: new THREE.Vector3(1.55, 0.42, 1.9), look: new THREE.Vector3(0.1, 0.35, 0.1) },
  { t: 0.3, pos: new THREE.Vector3(-1.1, 0.5, 1.7), look: new THREE.Vector3(-0.2, 0.3, -0.1) },
  { t: 0.62, pos: new THREE.Vector3(-1.7, 1.4, 2.9), look: new THREE.Vector3(0, 0.2, 0) },
  { t: 1.0, pos: final, look: TARGET.clone() }
]

const _p = new THREE.Vector3()
const _l = new THREE.Vector3()
function sampleEntry (t, keys) {
  let i = 0
  while (i < keys.length - 2 && t > keys[i + 1].t) i++
  const k0 = keys[i]
  const k1 = keys[i + 1]
  const local = easeInOut(clamp((t - k0.t) / (k1.t - k0.t), 0, 1))
  _p.lerpVectors(k0.pos, k1.pos, local)
  _l.lerpVectors(k0.look, k1.look, local)
}

let keys = []

/* ---------- pieces ---------- */
function spawnPiece (p, sq) {
  const type = TYPE[Math.abs(p)]
  const white = p > 0
  const g = makePiece(track, type, white ? stage.matLight : stage.matDark)
  const pos = sqWorld(sq)
  g.position.set(pos.x, BOARD_TOP, pos.z)
  // knights face the opposing side; everything else keeps the original orientation
  g.rotation.y = type === 'knight' ? (white ? Math.PI / 2 : -Math.PI / 2) : (white ? Math.PI : 0)
  g.userData.sq = sq
  g.userData.baseScale = g.scale.x
  stage.boardGroup.add(g)
  pieceMeshes.set(sq, g)
  return g
}

function buildPieces () {
  for (const g of pieceMeshes.values()) stage.boardGroup.remove(g)
  pieceMeshes.clear()
  for (let sq = 0; sq < 64; sq++) {
    if (game.board[sq] !== EMPTY) spawnPiece(game.board[sq], sq)
  }
  dirty = true
}

/* ---------- tweens ---------- */
function tween (seconds, update, done) {
  const dur = props.reducedMotion ? 0.01 : seconds
  tweens.push({ t0: now(), dur, update, done })
}

function runTweens () {
  if (!tweens.length) return false
  const t = now()
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]
    const p = clamp((t - tw.t0) / tw.dur, 0, 1)
    tw.update(p)
    if (p >= 1) {
      tweens.splice(i, 1)
      tw.done && tw.done()
    }
  }
  return true
}

function animateMove (move, done) {
  const g = pieceMeshes.get(move.from)
  const A = sqWorld(move.from)
  const B = sqWorld(move.to)
  const type = g.userData.type
  const lift = type === 'knight' ? 0.5 : 0.13

  // anything captured, including en passant, shrinks into the board
  let victim = null
  let victimSq = move.to
  if (move.flag === 'ep') victimSq = move.to + (move.piece > 0 ? 8 : -8)
  if (move.captured !== EMPTY || move.flag === 'ep') {
    victim = pieceMeshes.get(victimSq)
    pieceMeshes.delete(victimSq)
  }

  // castling moves the rook as well
  let rook = null
  let rookA, rookB
  if (move.flag === 'castleK' || move.flag === 'castleQ') {
    const rf = move.flag === 'castleK' ? move.to + 1 : move.to - 2
    const rt = move.flag === 'castleK' ? move.to - 1 : move.to + 1
    rook = pieceMeshes.get(rf)
    pieceMeshes.delete(rf)
    pieceMeshes.set(rt, rook)
    rook.userData.sq = rt
    rookA = sqWorld(rf)
    rookB = sqWorld(rt)
  }

  pieceMeshes.delete(move.from)
  pieceMeshes.set(move.to, g)
  g.userData.sq = move.to

  const dist = A.distanceTo(B)
  const dur = clamp(0.4 + dist * 0.2, 0.5, 0.95)
  let victimStarted = false

  tween(dur, (p) => {
    const e = easeInOut(p)
    g.position.x = A.x + (B.x - A.x) * e
    g.position.z = A.z + (B.z - A.z) * e
    g.position.y = BOARD_TOP + Math.sin(Math.PI * p) * lift
    if (type === 'knight') g.rotation.z = Math.sin(p * Math.PI) * -0.08
    if (rook) {
      rook.position.x = rookA.x + (rookB.x - rookA.x) * e
      rook.position.z = rookA.z + (rookB.z - rookA.z) * e
      rook.position.y = BOARD_TOP + Math.sin(Math.PI * p) * 0.1
    }
    if (victim && !victimStarted && p > 0.62) {
      victimStarted = true
      tween(0.32, (q) => {
        victim.scale.setScalar(victim.userData.baseScale * (1 - q))
        victim.position.y = BOARD_TOP - 0.18 * q
      }, () => stage.boardGroup.remove(victim))
    }
    dirty = true
  }, () => {
    g.rotation.z = 0
    if (move.flag === 'promo') {
      stage.boardGroup.remove(g)
      const queen = spawnPiece(move.promo, move.to)
      const target = queen.userData.baseScale
      queen.scale.setScalar(0.01)
      tween(0.4, (q) => queen.scale.setScalar(Math.max(0.01, target * easeInOut(q))), null)
    }
    done()
  })
}

/* ---------- board highlights ---------- */
function makeOverlayAssets () {
  planeGeo = track(new THREE.PlaneGeometry(SQ * 0.98, SQ * 0.98))
  discGeo = track(new THREE.CircleGeometry(0.075, 32))
  ringGeo = track(new THREE.RingGeometry(0.17, 0.215, 40))
  cursorGeo = track(new THREE.EdgesGeometry(new THREE.PlaneGeometry(SQ * 0.94, SQ * 0.94)))
  const flat = (color, opacity) => track(new THREE.MeshBasicMaterial({
    color, opacity, transparent: true, depthWrite: false, toneMapped: false
  }))
  mats = {
    last: flat(0xd9993a, 0.2),
    selected: flat(0xd9993a, 0.38),
    check: flat(0xd9553a, 0.5),
    hover: flat(0xffffff, 0.07),
    dot: flat(0xd2ae72, 0.7),
    ring: flat(0xe0a040, 0.85),
    cursor: track(new THREE.LineBasicMaterial({ color: 0xefe6d3, toneMapped: false }))
  }
  overlay = new THREE.Group()
  stage.boardGroup.add(overlay)
}

function flatMesh (geo, mat, sq, lift) {
  const m = new THREE.Mesh(geo, mat)
  const p = sqWorld(sq)
  m.position.set(p.x, BOARD_TOP + lift, p.z)
  m.rotation.x = -Math.PI / 2
  m.renderOrder = 2
  overlay.add(m)
}

function refreshOverlay () {
  overlay.clear()
  if (lastMove) {
    flatMesh(planeGeo, mats.last, lastMove.from, 0.003)
    flatMesh(planeGeo, mats.last, lastMove.to, 0.003)
  }
  if (!gameOver.value || game.inCheck()) {
    if (game.inCheck()) flatMesh(planeGeo, mats.check, game.kingSquare(game.turn), 0.004)
  }
  if (selected >= 0) {
    flatMesh(planeGeo, mats.selected, selected, 0.005)
    for (const m of legal) {
      if (m.captured !== EMPTY || m.flag === 'ep') flatMesh(ringGeo, mats.ring, m.to, 0.007)
      else flatMesh(discGeo, mats.dot, m.to, 0.007)
    }
  }
  if (hoverSq >= 0 && hoverSq !== selected) flatMesh(planeGeo, mats.hover, hoverSq, 0.004)
  if (kbActive) {
    const sq = cursor.row * 8 + cursor.file
    const line = new THREE.LineSegments(cursorGeo, mats.cursor)
    const p = sqWorld(sq)
    line.position.set(p.x, BOARD_TOP + 0.009, p.z)
    line.rotation.x = -Math.PI / 2
    overlay.add(line)
  }
  dirty = true
}

/* ---------- game flow ---------- */
const canPlay = () => phase.value === 'play' && !busy && !gameOver.value && game.turn === WHITE

function describeEnd (s) {
  switch (s.result) {
    case 'checkmate': return s.winner === WHITE ? 'Checkmate. You win.' : 'Checkmate. Black wins.'
    case 'stalemate': return 'Stalemate. The game is a draw.'
    case 'insufficient': return 'Draw. Neither side has enough pieces to win.'
    case 'fifty': return 'Draw by the fifty-move rule.'
    case 'repetition': return 'Draw by repetition.'
    default: return ''
  }
}

function moveSentence (move, who) {
  const piece = TYPE[Math.abs(move.piece)]
  const cap = move.captured !== EMPTY ? `, capturing a ${TYPE[Math.abs(move.captured)]}` : ''
  const extra = move.flag === 'castleK' || move.flag === 'castleQ' ? ' (castling)' : move.flag === 'promo' ? ', promoting to a queen' : ''
  return `${who} moved ${piece} from ${squareName(move.from)} to ${squareName(move.to)}${cap}${extra}.`
}

function applyMove (move, who) {
  busy = true
  const sentence = moveSentence(move, who === 'you' ? 'You' : 'Black')
  game.play(move)
  lastMove = move
  selected = -1
  legal = []
  canUndo.value = false
  refreshOverlay()

  animateMove(move, () => {
    busy = false
    const s = game.status()
    gameOver.value = s.over
    canUndo.value = game.stack.length > 0
    if (s.over) {
      status.value = describeEnd(s)
      announcement.value = `${sentence} ${status.value}`
    } else if (game.turn === BLACK) {
      status.value = 'Black is thinking…'
      announcement.value = sentence
      aiTurn()
    } else {
      status.value = s.check ? 'Your move. You are in check.' : 'Your move.'
      announcement.value = `${sentence} ${status.value}`
    }
    refreshOverlay()
  })
}

function aiTurn () {
  busy = true
  thinking.value = true
  const id = ++reqId
  const cfg = LEVELS[level.value]
  const finish = (r) => {
    if (id !== reqId) return // a new game or undo made this answer stale
    thinking.value = false
    busy = false
    const move = r && game.legalMoves().find((m) => m.from === r.from && m.to === r.to && m.promo === r.promo)
    if (move) applyMove(move, 'ai')
    else refreshOverlay()
  }
  // fallback if workers are unavailable: search on the main thread
  const onMain = () => setTimeout(() => {
    const m = game.bestMove(cfg)
    finish(m ? { from: m.from, to: m.to, promo: m.promo } : null)
  }, 40)

  if (!worker) { onMain(); return }
  const state = {
    board: [...game.board],
    turn: game.turn,
    castling: game.castling,
    ep: game.ep,
    halfmove: game.halfmove
  }
  worker.onmessage = (e) => finish(e.data.move)
  worker.onerror = () => { worker = null; onMain() }
  // a short pause keeps the reply from feeling instant, even on easy settings
  setTimeout(() => worker && worker.postMessage({ id, state, ...cfg }), props.reducedMotion ? 0 : 450)
}

function activateSquare (sq) {
  if (!canPlay()) return
  const target = selected >= 0 && legal.find((m) => m.to === sq)
  if (target) {
    applyMove(target, 'you')
    return
  }
  const piece = game.board[sq]
  if (piece > 0 && sq !== selected) {
    selected = sq
    legal = game.legalMovesFrom(sq)
    if (!legal.length) {
      status.value = 'That piece has no legal moves right now.'
      selected = -1
    } else {
      status.value = `${TYPE[Math.abs(piece)][0].toUpperCase() + TYPE[Math.abs(piece)].slice(1)} on ${squareName(sq)} selected.`
    }
  } else {
    selected = -1
    legal = []
    status.value = 'Your move.'
  }
  announcement.value = status.value
  refreshOverlay()
}

function newGame () {
  reqId++ // discards any answer still being calculated
  thinking.value = false
  busy = false
  tweens.length = 0
  game.reset()
  selected = -1
  legal = []
  lastMove = null
  gameOver.value = false
  canUndo.value = false
  status.value = 'New game. Your move.'
  announcement.value = status.value
  buildPieces()
  refreshOverlay()
}

function undo () {
  if (busy && !gameOver.value) return
  if (!game.stack.length) return
  reqId++
  tweens.length = 0
  do { game.undo() } while (game.stack.length && game.turn !== WHITE)
  selected = -1
  legal = []
  lastMove = game.stack.length ? game.stack[game.stack.length - 1].move : null
  gameOver.value = false
  canUndo.value = game.stack.length > 0
  status.value = 'Move taken back. Your move.'
  announcement.value = status.value
  buildPieces()
  refreshOverlay()
}

function setLevel (id) {
  level.value = id
  announcement.value = `Opponent set to ${id}.`
}

/* ---------- picking (mouse, touch and keyboard) ---------- */
const raycaster = new THREE.Raycaster()
const ndc = new THREE.Vector2()
const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BOARD_TOP)
const hitPoint = new THREE.Vector3()

function pickSquare (ev) {
  const rect = renderer.domElement.getBoundingClientRect()
  ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1)
  raycaster.setFromCamera(ndc, camera)

  // a tall piece can be tapped on its body, not just the square beneath it
  const hits = raycaster.intersectObjects([...pieceMeshes.values()], true)
  if (hits.length) {
    let o = hits[0].object
    while (o && o.userData.sq === undefined) o = o.parent
    if (o) return o.userData.sq
  }
  if (raycaster.ray.intersectPlane(boardPlane, hitPoint)) {
    const file = Math.floor(hitPoint.x / SQ + 4)
    const row = Math.floor(hitPoint.z / SQ + 4)
    if (file >= 0 && file < 8 && row >= 0 && row < 8) return row * 8 + file
  }
  return -1
}

let down = null
function onPointerDown (ev) {
  down = { x: ev.clientX, y: ev.clientY, t: performance.now() }
  kbActive = false
}

function onPointerUp (ev) {
  if (!down || ev.button !== 0) return
  const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y)
  const quick = performance.now() - down.t < 700
  down = null
  if (moved > 6 || !quick) return // that was a drag to look around, not a tap
  if (phase.value === 'entry') { skipEntry(); return }
  const sq = pickSquare(ev)
  if (sq >= 0) activateSquare(sq)
  stageEl.value && stageEl.value.focus({ preventScroll: true })
}

function onPointerMove (ev) {
  if (ev.pointerType === 'touch' || phase.value !== 'play') return
  const sq = pickSquare(ev)
  const canAct = sq >= 0 && canPlay() && (game.board[sq] > 0 || legal.some((m) => m.to === sq))
  renderer.domElement.style.cursor = canAct ? 'pointer' : 'grab'
  const next = canAct ? sq : -1
  if (next !== hoverSq) {
    hoverSq = next
    refreshOverlay()
  }
}

function onKeyDown (ev) {
  if (phase.value !== 'play') return
  const k = ev.key
  const step = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k]
  if (step) {
    ev.preventDefault()
    kbActive = true
    cursor = {
      file: clamp(cursor.file + step[0], 0, 7),
      row: clamp(cursor.row + step[1], 0, 7)
    }
    const sq = cursor.row * 8 + cursor.file
    const piece = game.board[sq]
    announcement.value = `${squareName(sq)}${piece ? ', ' + (piece > 0 ? 'your ' : 'black ') + TYPE[Math.abs(piece)] : ', empty'}${legal.some((m) => m.to === sq) ? ', legal move' : ''}`
    refreshOverlay()
  } else if (k === 'Enter' || k === ' ') {
    ev.preventDefault()
    kbActive = true
    activateSquare(cursor.row * 8 + cursor.file)
  }
}

/* ---------- entry cinematic ---------- */
function finishEntry () {
  phase.value = 'play'
  camera.position.copy(playPosition(camera.aspect))
  controls.target.copy(TARGET)
  controls.enabled = true
  controls.update()
  dirty = true
  emit('ready')
  requestAnimationFrame(() => stageEl.value && stageEl.value.focus({ preventScroll: true }))
}

function skipEntry () {
  if (phase.value === 'entry') finishEntry()
}

/* ---------- loop, resize, lifecycle ---------- */
function tick () {
  raf = requestAnimationFrame(tick)
  let active = runTweens()

  if (phase.value === 'entry') {
    const t = clamp((now() - entryStart) / ENTRY_SECONDS, 0, 1)
    sampleEntry(t, keys)
    camera.position.copy(_p)
    camera.lookAt(_l)
    active = true
    if (t >= 1) finishEntry()
  } else if (controls.update()) {
    active = true
  }

  if (active || dirty) {
    renderer.render(scene, camera)
    dirty = false
  }
}

function resize () {
  if (!renderer || !host.value) return
  const w = host.value.clientWidth
  const h = host.value.clientHeight
  if (!w || !h) return
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  keys = entryKeys(playPosition(camera.aspect))
  if (phase.value === 'play' && !userMoved) {
    camera.position.copy(playPosition(camera.aspect))
    controls.update()
  }
  dirty = true
}

onMounted(() => {
  const w = host.value.clientWidth || window.innerWidth
  const h = host.value.clientHeight || window.innerHeight
  const small = Math.min(w, h) < 700

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100)

  try {
    renderer = new THREE.WebGLRenderer({ antialias: !small, powerPreference: 'high-performance' })
  } catch {
    // no WebGL (old browser, disabled GPU): let the gate explain instead of crashing
    renderer = null
    emit('unsupported')
    return
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2))
  renderer.setSize(w, h)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.66
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.setAttribute('aria-hidden', 'true')
  renderer.domElement.style.cursor = 'grab'
  host.value.appendChild(renderer.domElement)

  stage = buildStage(scene, renderer, track, { small })
  makeOverlayAssets()

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = false
  controls.rotateSpeed = 0.6
  controls.zoomSpeed = 0.7
  controls.minDistance = 3.4
  controls.maxDistance = 12
  controls.minPolarAngle = 0.15
  controls.maxPolarAngle = 1.38
  controls.target.copy(TARGET)
  controls.addEventListener('start', () => { userMoved = true })

  buildPieces()
  keys = entryKeys(playPosition(w / h))

  if (props.reducedMotion) {
    camera.position.copy(playPosition(w / h))
    camera.lookAt(TARGET)
    controls.update()
    emit('ready')
    requestAnimationFrame(() => stageEl.value && stageEl.value.focus({ preventScroll: true }))
  } else {
    controls.enabled = false
    entryStart = now()
    camera.position.copy(keys[0].pos)
    camera.lookAt(keys[0].look)
  }

  const el = renderer.domElement
  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('pointerup', onPointerUp)
  el.addEventListener('pointermove', onPointerMove)
  resizeObs = new ResizeObserver(resize)
  resizeObs.observe(host.value)

  try {
    worker = new Worker(new URL('../chess/ai.worker.js', import.meta.url), { type: 'module' })
  } catch {
    worker = null // the engine then runs on the main thread instead
  }

  quoteTimer = setInterval(() => {
    let n
    do { n = Math.floor(Math.random() * quotes.length) } while (n === quoteIdx.value)
    quoteIdx.value = n
  }, 9000)

  // test hook: lets the automated browser tests aim real mouse clicks at squares
  if (window.__PORTFOLIO_TEST__) {
    window.__chess = {
      squareToScreen (sq) {
        const p = sqWorld(sq).clone()
        p.y = BOARD_TOP + 0.05
        p.project(camera)
        const rect = renderer.domElement.getBoundingClientRect()
        return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height }
      },
      game
    }
  }

  tick()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearInterval(quoteTimer)
  reqId++
  resizeObs && resizeObs.disconnect()
  worker && worker.terminate()
  if (renderer) {
    const el = renderer.domElement
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointerup', onPointerUp)
    el.removeEventListener('pointermove', onPointerMove)
  }
  controls && controls.dispose()
  disposables.forEach((d) => d.dispose && d.dispose())
  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss()
    renderer.domElement.remove()
  }
  delete window.__chess
})
</script>

<template>
  <div class="chess-root">
    <div ref="host" class="chess-canvas"></div>

    <div
      ref="stageEl"
      class="chess-keys"
      tabindex="0"
      role="application"
      aria-label="Chess board. You play white. Arrow keys move the board cursor, Enter or Space selects a piece or a highlighted square."
      @keydown="onKeyDown"
    ></div>

    <div class="chess-vignette" aria-hidden="true"></div>

    <Transition name="entry-fade">
      <div v-if="phase === 'entry'" class="entry-title" aria-hidden="true">
        <p class="entry-name">The Next Move</p>
        <p class="entry-line">Every move has a purpose. Every line of code should, too.</p>
        <p class="entry-sub">Engineering thoughtful solutions through logic, design and precision.</p>
      </div>
    </Transition>

    <button v-if="phase === 'entry'" class="skip-intro" type="button" @click="skipEntry">
      Skip intro
    </button>

    <Transition name="hud-fade">
      <div v-if="phase === 'play'" class="hud">
        <div class="hud-controls">
          <div class="level" role="radiogroup" aria-label="Opponent strength">
            <button
              v-for="opt in levelOptions"
              :key="opt.id"
              type="button"
              role="radio"
              :aria-checked="level === opt.id"
              :class="{ on: level === opt.id }"
              @click="setLevel(opt.id)"
            >
              {{ opt.label }}
            </button>
          </div>
          <button type="button" class="hud-btn" :disabled="!canUndo || (thinking && !gameOver)" @click="undo">Undo</button>
          <button type="button" class="hud-btn" @click="newGame">New game</button>
        </div>

        <div class="hud-bottom">
          <div class="hud-status">
            <p class="status-line" :class="{ thinking }">{{ status }}</p>
            <p class="status-hint">
              Select a piece, then a highlighted square. Drag to look around, scroll or pinch to zoom.
            </p>
          </div>
          <Transition name="quote-fade" mode="out-in">
            <figure :key="quoteIdx" class="wisdom" aria-hidden="true">
              <blockquote>{{ quotes[quoteIdx].text }}</blockquote>
              <figcaption>{{ quotes[quoteIdx].by }}</figcaption>
            </figure>
          </Transition>
        </div>
      </div>
    </Transition>

    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

<style scoped>
.chess-root {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #050403;
}

.chess-canvas {
  position: absolute;
  inset: 0;
}

.chess-canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

/* invisible keyboard target that sits over the canvas without catching the mouse */
.chess-keys {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.chess-keys:focus-visible {
  outline: 2px solid var(--brass-2);
  outline-offset: -6px;
}

.chess-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.55) 100%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.5), transparent 18%, transparent 52%, rgba(0, 0, 0, 0.8));
}

/* --- entry titles --- */
.entry-title {
  position: absolute;
  left: clamp(1.5rem, 8vw, 7rem);
  bottom: clamp(5rem, 16vh, 10rem);
  max-width: min(38rem, 84vw);
  pointer-events: none;
  animation: titleRise 2.2s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both;
}

.entry-title::before {
  content: '';
  position: absolute;
  inset: -5rem -8rem -4rem -8rem;
  z-index: -1;
  background: radial-gradient(ellipse at 40% 55%, rgba(4, 3, 2, 0.78), transparent 70%);
}

.entry-name {
  margin: 0 0 1rem;
  color: var(--brass-2);
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.entry-line {
  margin: 0 0 0.9rem;
  font-family: var(--serif);
  font-weight: 300;
  font-size: clamp(1.7rem, 3.8vw, 3.1rem);
  line-height: 1.18;
  letter-spacing: -0.01em;
  color: var(--ivory);
  text-shadow: 0 2px 30px rgba(0, 0, 0, 0.8);
}

.entry-sub {
  margin: 0;
  font-size: clamp(0.85rem, 1.2vw, 1.02rem);
  color: rgba(224, 205, 170, 0.78);
  text-shadow: 0 1px 18px rgba(0, 0, 0, 0.8);
}

@keyframes titleRise {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: none; }
}

.entry-fade-leave-active {
  transition: opacity 0.7s ease;
}

.entry-fade-leave-to {
  opacity: 0;
}

.skip-intro {
  position: absolute;
  right: clamp(1rem, 3vw, 2rem);
  bottom: clamp(1rem, 3vw, 2rem);
  padding: 0.7rem 1.3rem;
  border: 1px solid rgba(210, 174, 114, 0.4);
  border-radius: 999px;
  background: rgba(10, 8, 6, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--ivory);
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  transition: border-color 0.3s, background 0.3s;
}

.skip-intro:hover {
  border-color: var(--brass-2);
  background: rgba(30, 22, 14, 0.7);
}

/* --- in-game HUD --- */
.hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hud > * {
  pointer-events: none;
}

.hud-controls {
  position: absolute;
  top: clamp(0.8rem, 2vw, 1.4rem);
  right: clamp(0.8rem, 2vw, 1.6rem);
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  pointer-events: auto;
}

.level {
  display: inline-flex;
  padding: 0.2rem;
  border: 1px solid rgba(210, 174, 114, 0.3);
  border-radius: 999px;
  background: rgba(10, 8, 6, 0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.level button {
  padding: 0.5rem 0.95rem;
  border-radius: 999px;
  color: rgba(239, 230, 211, 0.7);
  font-size: 0.82rem;
  transition: background 0.3s, color 0.3s;
}

.level button:hover {
  color: var(--ivory);
}

.level button.on {
  background: linear-gradient(180deg, #e9e3d4, #b4b0a7);
  color: #14110e;
  font-weight: 500;
}

.hud-btn {
  padding: 0.62rem 1.1rem;
  border: 1px solid rgba(210, 174, 114, 0.3);
  border-radius: 999px;
  background: rgba(10, 8, 6, 0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--ivory);
  font-size: 0.82rem;
  transition: border-color 0.3s, opacity 0.3s;
}

.hud-btn:hover:not(:disabled) {
  border-color: var(--brass-2);
}

.hud-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.hud-bottom {
  position: absolute;
  left: clamp(1rem, 3vw, 2.2rem);
  right: clamp(1rem, 3vw, 2.2rem);
  bottom: clamp(0.9rem, 2.4vw, 1.8rem);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
}

.hud-status {
  max-width: 30rem;
  padding: 0.9rem 1.1rem;
  border: 1px solid rgba(210, 174, 114, 0.2);
  border-radius: 6px;
  background: rgba(10, 8, 6, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.status-line {
  margin: 0;
  font-family: var(--serif);
  font-size: clamp(1.05rem, 1.6vw, 1.3rem);
  color: var(--ivory);
}

.status-line.thinking {
  animation: breathe 1.6s ease-in-out infinite;
}

@keyframes breathe {
  50% { opacity: 0.55; }
}

.status-hint {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  line-height: 1.5;
  color: rgba(239, 230, 211, 0.62);
}

.wisdom {
  margin: 0;
  max-width: min(22rem, 34vw);
  text-align: right;
}

.wisdom blockquote {
  margin: 0;
  font-family: var(--serif);
  font-style: italic;
  font-weight: 300;
  font-size: clamp(0.9rem, 1.2vw, 1.05rem);
  line-height: 1.55;
  color: rgba(239, 230, 211, 0.78);
  text-shadow: 0 1px 18px rgba(0, 0, 0, 0.9);
}

.wisdom figcaption {
  margin-top: 0.5rem;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(210, 174, 114, 0.75);
}

.hud-fade-enter-active { transition: opacity 0.9s ease 0.2s; }
.hud-fade-enter-from { opacity: 0; }

.quote-fade-enter-active { transition: opacity 1.1s ease; }
.quote-fade-leave-active { transition: opacity 0.5s ease; }
.quote-fade-enter-from,
.quote-fade-leave-to { opacity: 0; }

@media (max-width: 760px) {
  .wisdom { display: none; }
  .hud-status { max-width: none; flex: 1; }
  .status-hint { display: none; }
  .hud-controls { top: 3.6rem; }
}

@media (prefers-reduced-motion: reduce) {
  .entry-title { animation: none; }
  .status-line.thinking { animation: none; }
}
</style>
