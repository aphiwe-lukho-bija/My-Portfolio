<script setup>
/* ChessIntro.vue — cinematic real-time 3D opening scene.
   A lacquered walnut chessboard under warm lamp light; camera dollies low
   across the board, a knight makes one deliberate move, typography fades in,
   then the scene holds and emits "done" so App can reveal the site.
   Pieces follow Staunton proportions with physical clearcoat materials,
   image-based reflections (RoomEnvironment) and subtle depth of field. */
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

const props = defineProps({
  // manual mode (opened from the toolbar button) loops the scene
  // until the viewer closes it instead of auto-dismissing
  manual: { type: Boolean, default: false }
})
const emit = defineEmits(['done'])
const root = ref(null)
const showType = ref(false)

/* wisdom quotes that rotate through the scene for as long as it is open */
const quotes = [
  { text: 'Every battle is won before it is fought.', by: 'Sun Tzu' },
  { text: 'When you see a good move, wait — look for a better one.', by: 'Emanuel Lasker' },
  { text: 'It is not that we have a short time to live, but that we waste a great deal of it.', by: 'Seneca' },
  { text: 'You have power over your mind — not outside events. Realize this, and you will find strength.', by: 'Marcus Aurelius' },
  { text: 'A journey of a thousand miles begins with a single step.', by: 'Lao Tzu' },
  { text: 'Life can only be understood backwards; but it must be lived forwards.', by: 'Søren Kierkegaard' },
  { text: 'Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.', by: 'Antoine de Saint-Exupéry' },
  { text: 'Play the opening like a book, the middlegame like a magician, and the endgame like a machine.', by: 'Siegbert Tarrasch' },
  { text: 'A good player is always lucky.', by: 'José Raúl Capablanca' },
  { text: 'Pawns are the soul of chess.', by: 'François-André Philidor' },
  { text: 'Simplify, then add lightness.', by: 'Colin Chapman' },
  { text: 'Premature optimization is the root of all evil.', by: 'Donald Knuth' },
  { text: 'Simplicity is a great virtue, but it requires hard work to achieve it.', by: 'Edsger Dijkstra' },
  { text: 'Know thy enemy and know yourself; in a hundred battles you will never be in peril.', by: 'Sun Tzu' },
  { text: 'In the middle of difficulty lies opportunity.', by: 'Albert Einstein' },
  { text: 'If you don\u2019t know where you are going, any road will get you there.', by: 'Rudyard Kipling' },
  { text: 'A ship in harbour is safe, but that is not what ships are built for.', by: 'John A. Shedd' },
  { text: 'It does not matter how slowly you go, as long as you do not stop.', by: 'Confucius' },
  { text: 'Hack away at the unessential.', by: 'Bruce Lee' },
  { text: 'The successful warrior is the average man with laser-like focus.', by: 'Bruce Lee' }
]
const quoteIdx = ref(0)
let quoteTimer = null

function nextQuote () {
  let n
  do {
    n = Math.floor(Math.random() * quotes.length)
  } while (n === quoteIdx.value)
  quoteIdx.value = n
}

let renderer, scene, camera, composer, bokeh, clock, raf
let knight, knightStart, knightEnd, knightBaseRotY = -0.5
let animationDone = false
const disposables = []
const keyLight = { light: null }

/* ---------- procedural textures ---------- */

function makeWoodTexture ({ base = '#5b3a22', dark = '#3a2415', light = '#7a5230', size = 512 } = {}) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 90; i++) {
    const y = Math.random() * size
    ctx.strokeStyle = Math.random() > 0.5 ? dark : light
    ctx.globalAlpha = 0.04 + Math.random() * 0.10
    ctx.lineWidth = 0.6 + Math.random() * 1.8
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= size; x += 16) {
      ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * (2 + Math.random() * 3))
    }
    ctx.stroke()
  }
  const img = ctx.getImageData(0, 0, size, size)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 12
    d[i] += n; d[i + 1] += n; d[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  disposables.push(tex)
  return tex
}

function makeBoardTexture () {
  const S = 1600
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  const sq = S / 8
  const light = '#dcc194'
  const dark = '#41280f'
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const isDark = (r + f) % 2 === 1
      ctx.fillStyle = isDark ? dark : light
      ctx.fillRect(f * sq, r * sq, sq, sq)
      // fine grain per square
      for (let i = 0; i < 34; i++) {
        ctx.strokeStyle = isDark ? 'rgba(255,220,170,0.05)' : 'rgba(60,30,10,0.07)'
        ctx.lineWidth = 0.5 + Math.random()
        const y = r * sq + Math.random() * sq
        ctx.beginPath()
        ctx.moveTo(f * sq, y)
        ctx.lineTo((f + 1) * sq, y + (Math.random() - 0.5) * 4)
        ctx.stroke()
      }
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  disposables.push(tex)
  return tex
}

function makeLampShadeTexture () {
  const c = document.createElement('canvas')
  c.width = 4; c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 64)
  g.addColorStop(0, '#2a1c10')
  g.addColorStop(0.5, '#3a2814')
  g.addColorStop(1, '#1a1008')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 64)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  disposables.push(tex)
  return tex
}

/* ---------- Staunton piece profiles ---------- */

const V = (x, y) => new THREE.Vector2(x, y)

/* spherical finial resting on a neck of radius neckR at height neckY,
   rising to topY — solves the circle through the neck point exactly */
function ball (neckR, neckY, topY, seg = 16) {
  const cy = (topY * topY - neckY * neckY - neckR * neckR) / (2 * (topY - neckY))
  const r = topY - cy
  const a0 = Math.atan2(neckY - cy, neckR)
  const pts = []
  for (let i = 1; i <= seg; i++) {
    const a = a0 + (Math.PI / 2 - a0) * (i / seg)
    pts.push(V(Math.cos(a) * r, cy + Math.sin(a) * r))
  }
  return pts
}

/* shared plinth: flat foot, rolled edge, concave cove, base ring */
function stauntonBase () {
  return [
    V(0, 0), V(0.28, 0), V(0.33, 0.018), V(0.338, 0.05),
    V(0.325, 0.085), V(0.295, 0.115), V(0.258, 0.147),
    V(0.226, 0.177), V(0.206, 0.206), V(0.197, 0.231),
    V(0.181, 0.247), V(0.165, 0.257), V(0.16, 0.271),
    V(0.172, 0.286)
  ]
}

function pieceProfile (type) {
  switch (type) {
    case 'pawn':
      return [...stauntonBase(),
        V(0.155, 0.31), V(0.132, 0.40), V(0.116, 0.50), V(0.111, 0.555),
        V(0.127, 0.583), V(0.131, 0.613), V(0.115, 0.636), V(0.095, 0.652),
        ...ball(0.095, 0.652, 0.985)]

    case 'rook':
      return [...stauntonBase(),
        V(0.166, 0.31), V(0.156, 0.55), V(0.15, 0.80), V(0.155, 0.95),
        V(0.181, 1.00), V(0.226, 1.045), V(0.236, 1.09), V(0.236, 1.15),
        V(0.23, 1.17), V(0.19, 1.17), V(0.187, 1.10), V(0, 1.10)]

    case 'bishop':
      return [...stauntonBase(),
        V(0.15, 0.31), V(0.126, 0.45), V(0.111, 0.56), V(0.127, 0.587),
        V(0.131, 0.616), V(0.115, 0.641), V(0.10, 0.662),
        V(0.156, 0.70), V(0.186, 0.76), V(0.191, 0.83), V(0.176, 0.92),
        V(0.146, 1.02), V(0.111, 1.12), V(0.081, 1.20), V(0.061, 1.25),
        ...ball(0.061, 1.25, 1.345)]

    case 'queen':
      return [...stauntonBase(),
        V(0.16, 0.31), V(0.131, 0.48), V(0.116, 0.65), V(0.106, 0.82),
        V(0.116, 0.86), V(0.131, 0.90), V(0.121, 0.94), V(0.106, 0.97),
        V(0.141, 1.00), V(0.181, 1.05), V(0.211, 1.12), V(0.221, 1.18),
        V(0.216, 1.21), V(0.176, 1.21), V(0.171, 1.16), V(0.141, 1.11),
        V(0.116, 1.13),
        ...ball(0.116, 1.13, 1.40)]

    case 'king':
      return [...stauntonBase(),
        V(0.166, 0.31), V(0.136, 0.50), V(0.121, 0.72), V(0.111, 0.92),
        V(0.121, 0.96), V(0.136, 1.00), V(0.121, 1.04), V(0.106, 1.07),
        V(0.151, 1.11), V(0.191, 1.17), V(0.211, 1.24), V(0.206, 1.28),
        V(0.166, 1.29), V(0.151, 1.32), V(0.111, 1.36), V(0.096, 1.39),
        ...ball(0.096, 1.39, 1.555)]

    case 'knight':
      // lathe plinth only — the horse head is extruded on top
      return [...stauntonBase(),
        V(0.16, 0.31), V(0.15, 0.45), V(0.155, 0.52), V(0.172, 0.56),
        V(0.172, 0.585), V(0, 0.585)]

    default:
      return stauntonBase()
  }
}

/* knight horse-head silhouette, drawn facing +x, extruded with a soft bevel */
function knightHeadGeometry () {
  const s = new THREE.Shape()
  s.moveTo(-0.13, 0.545)
  // back of the neck / mane
  s.bezierCurveTo(-0.175, 0.72, -0.165, 0.95, -0.135, 1.10)
  // ears
  s.bezierCurveTo(-0.125, 1.18, -0.10, 1.26, -0.075, 1.315)
  s.lineTo(-0.035, 1.245)
  s.lineTo(0.005, 1.325)
  s.lineTo(0.035, 1.235)
  // forehead and brow
  s.bezierCurveTo(0.075, 1.17, 0.115, 1.11, 0.15, 1.055)
  // muzzle
  s.bezierCurveTo(0.21, 0.99, 0.26, 0.955, 0.272, 0.925)
  s.bezierCurveTo(0.276, 0.895, 0.255, 0.878, 0.225, 0.875)
  // jaw and throat
  s.bezierCurveTo(0.18, 0.87, 0.14, 0.85, 0.10, 0.81)
  s.bezierCurveTo(0.05, 0.76, 0.01, 0.68, -0.03, 0.60)
  s.bezierCurveTo(-0.055, 0.56, -0.09, 0.54, -0.13, 0.545)
  s.closePath()

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.145,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.022,
    bevelSegments: 4,
    curveSegments: 14
  })
  geo.translate(0, 0, -(0.145 + 0.044) / 2)
  geo.computeVertexNormals()
  disposables.push(geo)
  return geo
}

/* ---------- piece assembly ---------- */

function makePiece (type, mat, squareSize) {
  const group = new THREE.Group()
  const typeScale = type === 'pawn' ? 0.86 : type === 'rook' ? 0.94 : 1

  const profile = pieceProfile(type)
  const latheGeo = new THREE.LatheGeometry(profile, 56)
  latheGeo.computeVertexNormals()
  disposables.push(latheGeo)
  const body = new THREE.Mesh(latheGeo, mat)
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  if (type === 'knight') {
    const head = new THREE.Mesh(knightHeadGeometry(), mat)
    head.castShadow = true
    head.receiveShadow = true
    group.add(head)
  }

  if (type === 'rook') {
    // crenellated battlements around the turret rim
    const toothGeo = new THREE.BoxGeometry(0.08, 0.09, 0.052)
    disposables.push(toothGeo)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      const tooth = new THREE.Mesh(toothGeo, mat)
      tooth.position.set(Math.cos(a) * 0.211, 1.212, Math.sin(a) * 0.211)
      tooth.rotation.y = -a - Math.PI / 2
      tooth.castShadow = true
      group.add(tooth)
    }
  }

  if (type === 'bishop') {
    // the mitre slit — a thin dark incision crossing the cap
    const slitGeo = new THREE.BoxGeometry(0.024, 0.175, 0.30)
    disposables.push(slitGeo)
    const slitMat = new THREE.MeshStandardMaterial({ color: 0x0d0805, roughness: 0.85 })
    disposables.push(slitMat)
    const slit = new THREE.Mesh(slitGeo, slitMat)
    slit.position.set(0.02, 1.075, 0)
    slit.rotation.z = -0.78
    group.add(slit)
  }

  if (type === 'queen') {
    // coronet pearls seated on the crown rim
    const pearlGeo = new THREE.SphereGeometry(0.028, 16, 12)
    disposables.push(pearlGeo)
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      const pearl = new THREE.Mesh(pearlGeo, mat)
      pearl.position.set(Math.cos(a) * 0.213, 1.228, Math.sin(a) * 0.213)
      pearl.castShadow = true
      group.add(pearl)
    }
  }

  if (type === 'king') {
    // cross finial
    const vGeo = new THREE.BoxGeometry(0.034, 0.21, 0.034)
    const hGeo = new THREE.BoxGeometry(0.135, 0.032, 0.034)
    disposables.push(vGeo, hGeo)
    const vBar = new THREE.Mesh(vGeo, mat)
    vBar.position.y = 1.645
    const hBar = new THREE.Mesh(hGeo, mat)
    hBar.position.y = 1.665
    vBar.castShadow = hBar.castShadow = true
    group.add(vBar, hBar)
  }

  group.scale.setScalar(squareSize * 0.92 * typeScale)
  return group
}

function boardToWorld (file, rank, squareSize) {
  return new THREE.Vector3(
    (file - 3.5) * squareSize,
    0,
    (rank - 3.5) * squareSize
  )
}

/* ---------- scene build ---------- */

const SQ = 0.5
const BOARD_TOP = 0.176

function buildScene () {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050403)
  scene.fog = new THREE.FogExp2(0x050403, 0.05)

  camera = new THREE.PerspectiveCamera(38, root.value.clientWidth / root.value.clientHeight, 0.1, 100)

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(root.value.clientWidth, root.value.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.95
  renderer.outputColorSpace = THREE.SRGBColorSpace
  root.value.appendChild(renderer.domElement)

  // image-based lighting so lacquer, brass and ebony catch real reflections
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTex
  disposables.push(envTex)
  pmrem.dispose()

  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  bokeh = new BokehPass(scene, camera, { focus: 4, aperture: 0.00016, maxblur: 0.0075 })
  composer.addPass(bokeh)
  composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(root.value.clientWidth, root.value.clientHeight), 0.06, 0.5, 0.96
  ))
  composer.addPass(new OutputPass())

  clock = new THREE.Clock()

  /* ---- materials ---- */
  const deskTex = makeWoodTexture({ base: '#3b2413', dark: '#241206', light: '#5a3a1e' })
  deskTex.repeat.set(2, 1.3)
  const deskMat = new THREE.MeshStandardMaterial({
    map: deskTex, bumpMap: deskTex, bumpScale: 0.35, roughness: 0.55, metalness: 0.05
  })
  disposables.push(deskMat)

  const frameTex = makeWoodTexture({ base: '#4a2e18', dark: '#2c1808', light: '#6b4524' })
  frameTex.repeat.set(2, 2)
  const frameMat = new THREE.MeshPhysicalMaterial({
    map: frameTex, bumpMap: frameTex, bumpScale: 0.25,
    roughness: 0.55, metalness: 0.04,
    clearcoat: 0.1, clearcoatRoughness: 0.5, envMapIntensity: 0.2
  })
  disposables.push(frameMat)

  const boardTex = makeBoardTexture()
  const boardMat = new THREE.MeshPhysicalMaterial({
    map: boardTex, roughness: 0.55, metalness: 0.02,
    clearcoat: 0.12, clearcoatRoughness: 0.5, envMapIntensity: 0.22
  })
  disposables.push(boardMat)

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xb08d57, roughness: 0.52, metalness: 0.85, envMapIntensity: 0.3
  })
  disposables.push(brassMat)

  // lacquered boxwood (light) and polished ebony (dark)
  const pieceGrain = makeWoodTexture({ base: '#c9a978', dark: '#a5854f', light: '#e6cda2', size: 256 })
  pieceGrain.repeat.set(1.5, 3)
  const matLight = new THREE.MeshPhysicalMaterial({
    map: pieceGrain, color: 0xffffff, roughness: 0.52, metalness: 0.02,
    clearcoat: 0.1, clearcoatRoughness: 0.5, envMapIntensity: 0.22,
    bumpMap: pieceGrain, bumpScale: 0.12
  })
  const matDark = new THREE.MeshPhysicalMaterial({
    color: 0x1c1109, roughness: 0.5, metalness: 0.03,
    clearcoat: 0.12, clearcoatRoughness: 0.48, envMapIntensity: 0.26,
    bumpMap: pieceGrain, bumpScale: 0.08
  })
  disposables.push(matLight, matDark)

  /* ---- desk: a real writing desk, 1.4 m × 0.9 m at 1 unit = 10 cm,
         so the 45 cm board sits at true chessboard scale on it ---- */
  const deskGeo = new THREE.BoxGeometry(14, 0.5, 9)
  disposables.push(deskGeo)
  const desk = new THREE.Mesh(deskGeo, deskMat)
  desk.position.y = -0.26
  desk.receiveShadow = true
  scene.add(desk)

  /* ---- chessboard: stepped frame, raised rails, brass edge ---- */
  const boardGroup = new THREE.Group()
  scene.add(boardGroup)

  const frameGeo = new THREE.BoxGeometry(8 * SQ + 0.5, 0.17, 8 * SQ + 0.5)
  disposables.push(frameGeo)
  const frame = new THREE.Mesh(frameGeo, frameMat)
  frame.position.y = 0.085
  frame.castShadow = true
  frame.receiveShadow = true
  boardGroup.add(frame)

  // inner bed the playing surface sits in
  const bedGeo = new THREE.BoxGeometry(4.14, 0.06, 4.14)
  disposables.push(bedGeo)
  const bed = new THREE.Mesh(bedGeo, frameMat)
  bed.position.y = 0.145
  bed.receiveShadow = true
  boardGroup.add(bed)

  const surfaceGeo = new THREE.PlaneGeometry(8 * SQ, 8 * SQ)
  disposables.push(surfaceGeo)
  const surface = new THREE.Mesh(surfaceGeo, boardMat)
  surface.rotation.x = -Math.PI / 2
  surface.position.y = BOARD_TOP
  surface.receiveShadow = true
  boardGroup.add(surface)

  // brass edge band inlaid around the frame
  const bandLong = new THREE.BoxGeometry(8 * SQ + 0.5, 0.008, 0.035)
  const bandSide = new THREE.BoxGeometry(0.035, 0.008, 8 * SQ + 0.5)
  disposables.push(bandLong, bandSide)
  const edge = 2 * SQ + 0.25 - 0.02
  for (const [geo, x, z] of [
    [bandLong, 0, -edge], [bandLong, 0, edge],
    [bandSide, -edge, 0], [bandSide, edge, 0]
  ]) {
    const band = new THREE.Mesh(geo, brassMat)
    band.position.set(x, 0.172, z)
    boardGroup.add(band)
  }

  /* ---- pieces: a small deliberate endgame arrangement ---- */
  const place = (type, file, rank, dark = false, rot = 0) => {
    const p = makePiece(type, dark ? matDark : matLight, SQ)
    const pos = boardToWorld(file, rank, SQ)
    p.position.set(pos.x, BOARD_TOP, pos.z)
    p.rotation.y = rot
    boardGroup.add(p)
    return p
  }

  place('king', 4, 6, false, Math.PI)        // white king — faces up-board
  place('queen', 3, 5, false, Math.PI)
  place('rook', 0, 0, true, 0)               // black rook
  place('bishop', 2, 7, true, 0)             // black bishop
  place('pawn', 5, 4, false, Math.PI)
  place('pawn', 6, 3, true, 0)
  place('pawn', 3, 2, true, 0)
  // hero knight — near side, three-quarter view for camera, makes the move
  knight = place('knight', 1, 6, false, knightBaseRotY)
  knightStart = boardToWorld(1, 6, SQ).clone().setY(BOARD_TOP)
  knightEnd = boardToWorld(2, 4, SQ).clone().setY(BOARD_TOP) // legal L-move

  /* ---- desk lamp: scaled to ~40 cm tall, as a real desk lamp would be ---- */
  const lampGroup = new THREE.Group()
  lampGroup.position.set(4.0, 0, -2.6)
  lampGroup.scale.setScalar(2.1)
  scene.add(lampGroup)

  const baseGeo = new THREE.CylinderGeometry(0.28, 0.34, 0.08, 32)
  disposables.push(baseGeo)
  const lampBase = new THREE.Mesh(baseGeo, brassMat)
  lampBase.position.y = 0.04
  lampBase.castShadow = true
  lampGroup.add(lampBase)

  const armGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.6, 16)
  disposables.push(armGeo)
  const arm = new THREE.Mesh(armGeo, brassMat)
  arm.position.set(-0.15, 0.85, 0)
  arm.rotation.z = 0.22
  arm.castShadow = true
  lampGroup.add(arm)

  const shadeGeo = new THREE.ConeGeometry(0.42, 0.5, 32, 1, true)
  disposables.push(shadeGeo)
  const shadeMat = new THREE.MeshStandardMaterial({
    map: makeLampShadeTexture(), roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide
  })
  disposables.push(shadeMat)
  const shade = new THREE.Mesh(shadeGeo, shadeMat)
  shade.position.set(-0.45, 1.62, 0)
  shade.rotation.z = 0.5
  shade.castShadow = true
  lampGroup.add(shade)

  const bulbGeo = new THREE.SphereGeometry(0.07, 16, 16)
  disposables.push(bulbGeo)
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xffd9a0, emissive: 0xffc878, emissiveIntensity: 1.6, roughness: 1
  })
  disposables.push(bulbMat)
  const bulb = new THREE.Mesh(bulbGeo, bulbMat)
  bulb.position.set(-0.5, 1.5, 0)
  lampGroup.add(bulb)

  /* ---- lighting: warm key, amber rim, cool fill ---- */
  scene.add(new THREE.AmbientLight(0x1c1208, 1.4))

  const key = new THREE.SpotLight(0xffc98a, 40, 16, Math.PI / 4.4, 0.5, 1.4)
  key.position.set(2.9, 3.2, -2.4)
  key.target.position.set(0.2, 0, 0.2)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.bias = -0.0004
  key.shadow.radius = 6
  scene.add(key, key.target)
  keyLight.light = key

  const rim = new THREE.DirectionalLight(0xd98b4a, 2.4)
  rim.position.set(-3.5, 2.2, -4)
  scene.add(rim)

  const fill = new THREE.DirectionalLight(0x40506a, 0.55)
  fill.position.set(-2, 3, 5)
  scene.add(fill)

  const practical = new THREE.PointLight(0xffb870, 7, 9, 2)
  practical.position.set(-0.5, 1.45, 0)
  lampGroup.add(practical)

  /* ---- background: dark panelled wall ---- */
  const wallGeo = new THREE.PlaneGeometry(40, 16)
  disposables.push(wallGeo)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 0.9 })
  disposables.push(wallMat)
  const wall = new THREE.Mesh(wallGeo, wallMat)
  wall.position.set(0, 5, -7)
  wall.receiveShadow = true
  scene.add(wall)
}

/* ---------- camera choreography ---------- */

const camKeys = [
  { t: 0.0,  pos: [1.55, 0.42, 1.9],  look: [0.1, 0.35, 0.1] },
  { t: 0.28, pos: [-1.1, 0.5, 1.7],   look: [-0.2, 0.3, -0.1] },
  { t: 0.55, pos: [-1.8, 1.4, 2.6],   look: [0.0, 0.25, 0.0] },
  { t: 0.78, pos: [0.6, 2.2, 3.4],    look: [0.0, 0.15, 0.0] },
  { t: 1.0,  pos: [0.15, 2.6, 3.9],   look: [0.0, 0.1, -0.1] }
]

const easeInOut = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

const _pos = new THREE.Vector3()
const _look = new THREE.Vector3()
const _a = new THREE.Vector3()
const _b = new THREE.Vector3()

function sampleCamera (t) {
  let i = 0
  while (i < camKeys.length - 2 && t > camKeys[i + 1].t) i++
  const k0 = camKeys[i]
  const k1 = camKeys[i + 1]
  const local = easeInOut(THREE.MathUtils.clamp((t - k0.t) / (k1.t - k0.t), 0, 1))
  _a.fromArray(k0.pos); _b.fromArray(k1.pos)
  _pos.lerpVectors(_a, _b, local)
  _a.fromArray(k0.look); _b.fromArray(k1.look)
  _look.lerpVectors(_a, _b, local)
}

/* knight move: lift → glide → settle (0.35–0.62 of the timeline) */
function animateKnight (t) {
  const T0 = 0.35, T1 = 0.50, T2 = 0.62
  if (t < T0) {
    knight.position.copy(knightStart)
    knight.rotation.y = knightBaseRotY
    knight.rotation.z = 0
    return
  }
  if (t > T2) {
    knight.position.copy(knightEnd)
    return
  }
  if (t < T1) {
    const p = easeInOut((t - T0) / (T1 - T0))
    knight.position.lerpVectors(knightStart, knightStart.clone().setY(knightStart.y + 0.55), p)
    knight.rotation.z = Math.sin(p * Math.PI) * -0.1
  } else {
    const p = easeInOut((t - T1) / (T2 - T1))
    const high = knightStart.clone().setY(knightStart.y + 0.55)
    const endHigh = knightEnd.clone().setY(knightEnd.y + 0.55)
    if (p < 0.5) {
      knight.position.lerpVectors(high, endHigh, easeInOut(p * 2))
    } else {
      knight.position.lerpVectors(endHigh, knightEnd, easeInOut((p - 0.5) * 2))
    }
    knight.rotation.z = Math.sin(p * Math.PI) * -0.1 * (1 - p)
    knight.rotation.y = knightBaseRotY + Math.sin(p * Math.PI) * 0.22
  }
}

/* ---------- main loop ---------- */
const TIMELINE = 16

function tick () {
  raf = requestAnimationFrame(tick)
  const elapsed = clock.getElapsedTime()
  const t = THREE.MathUtils.clamp(elapsed / TIMELINE, 0, 1)

  sampleCamera(t)
  camera.position.copy(_pos)
  camera.lookAt(_look)
  animateKnight(t)

  // focus racks smoothly to wherever the camera is looking
  if (bokeh) bokeh.uniforms.focus.value = camera.position.distanceTo(_look)

  if (t > 0.82 && !showType.value) showType.value = true

  if (keyLight.light) {
    keyLight.light.intensity = 38 + easeInOut(Math.max(0, (t - 0.7) / 0.3)) * 14
  }

  composer.render()

  if (t >= 1 && !animationDone) {
    if (props.manual) {
      // replayed from the toolbar — loop the film until the viewer closes it
      clock.stop()
      clock.start()
      showType.value = false
    } else {
      animationDone = true
      setTimeout(() => emit('done'), 3200)
    }
  }
}

/* ---------- lifecycle ---------- */
function onResize () {
  if (!renderer || !root.value) return
  const w = root.value.clientWidth
  const h = root.value.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  composer.setSize(w, h)
}

onMounted(() => {
  buildScene()
  window.addEventListener('resize', onResize)
  quoteTimer = setInterval(nextQuote, 5200)
  tick()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearInterval(quoteTimer)
  window.removeEventListener('resize', onResize)
  disposables.forEach(d => d.dispose && d.dispose())
  composer?.dispose?.()
  renderer?.dispose()
  renderer?.domElement?.remove()
})

function skip () { emit('done') }
</script>

<template>
  <div ref="root" class="chess-intro">
    <div v-if="showType" class="intro-type">
      <p class="headline">Every move begins with a thought.</p>
      <p class="sub">Engineering thoughtful solutions through logic, design and precision.</p>
    </div>

    <Transition name="quote-fade" mode="out-in">
      <figure class="wisdom" :key="quoteIdx">
        <blockquote>{{ quotes[quoteIdx].text }}</blockquote>
        <figcaption>{{ quotes[quoteIdx].by }}</figcaption>
      </figure>
    </Transition>

    <button class="skip" type="button" @click="skip">{{ manual ? 'Close' : 'Skip intro' }}</button>
    <div class="vignette" aria-hidden="true" />
    <div class="grain" aria-hidden="true" />
  </div>
</template>

<style scoped>
.chess-intro {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: #050403;
  overflow: hidden;
}

.chess-intro :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.intro-type {
  position: absolute;
  left: 8vw;
  bottom: 14vh;
  z-index: 2;
  max-width: 560px;
  opacity: 0;
  animation: typeIn 2.4s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards;
  pointer-events: none;
}

.headline {
  font-family: 'Playfair Display', Georgia, serif;
  font-style: italic;
  font-weight: 500;
  font-size: clamp(1.6rem, 3.6vw, 2.9rem);
  line-height: 1.25;
  color: #f0e6d2;
  margin: 0 0 0.9rem;
  text-shadow: 0 2px 30px rgba(0, 0, 0, 0.8);
}

.sub {
  font-family: 'DM Sans', system-ui, sans-serif;
  font-weight: 400;
  font-size: clamp(0.85rem, 1.2vw, 1.05rem);
  letter-spacing: 0.04em;
  color: rgba(224, 200, 160, 0.78);
  margin: 0;
  text-shadow: 0 1px 18px rgba(0, 0, 0, 0.8);
}

@keyframes typeIn {
  from { opacity: 0; transform: translateY(26px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* rotating wisdom quotes — bottom right, balanced against the headline */
.wisdom {
  position: absolute;
  right: clamp(1.5rem, 6vw, 5rem);
  bottom: clamp(7rem, 15vh, 11rem);
  z-index: 2;
  margin: 0;
  max-width: min(340px, 40vw);
  text-align: right;
  pointer-events: none;
}

.wisdom blockquote {
  margin: 0;
  font-family: 'Playfair Display', Georgia, serif;
  font-style: italic;
  font-weight: 500;
  font-size: clamp(0.95rem, 1.3vw, 1.15rem);
  line-height: 1.55;
  color: rgba(240, 230, 210, 0.88);
  text-shadow: 0 1px 20px rgba(0, 0, 0, 0.85);
}

.wisdom figcaption {
  margin-top: 0.7rem;
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(200, 165, 110, 0.75);
}

.quote-fade-enter-active {
  transition: opacity 1.1s ease, transform 1.1s ease;
}

.quote-fade-leave-active {
  transition: opacity 0.5s ease;
}

.quote-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.quote-fade-leave-to {
  opacity: 0;
}

@media (max-width: 700px) {
  .wisdom {
    right: auto;
    left: clamp(1.5rem, 6vw, 5rem);
    bottom: auto;
    top: 5.5rem;
    text-align: left;
    max-width: min(320px, 78vw);
  }
}

.skip {
  position: absolute;
  top: 28px;
  right: 32px;
  z-index: 3;
  background: transparent;
  border: 1px solid rgba(224, 200, 160, 0.28);
  color: rgba(224, 200, 160, 0.65);
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 0.6rem 1.2rem;
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.3s, border-color 0.3s;
}

.skip:hover {
  color: #f0e6d2;
  border-color: rgba(224, 200, 160, 0.6);
}

.vignette {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 52%, rgba(0, 0, 0, 0.55) 100%);
}

.grain {
  position: absolute;
  inset: -50%;
  z-index: 1;
  pointer-events: none;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  animation: grainShift 0.9s steps(4) infinite;
}

@keyframes grainShift {
  0% { transform: translate(0, 0); }
  25% { transform: translate(-2%, 3%); }
  50% { transform: translate(3%, -2%); }
  75% { transform: translate(-3%, -3%); }
  100% { transform: translate(2%, 2%); }
}
</style>
