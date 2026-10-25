/* pieces.js — Staunton piece geometry and procedural wood textures.
   Carried over from the original ChessIntro scene so the pieces look the
   same; the only change is that every disposable resource is registered
   through a `track` callback so the scene can clean up after itself. */
import * as THREE from 'three'

export const SQ = 0.5 // size of one board square in scene units
export const BOARD_TOP = 0.176 // height of the playing surface

/* ---------- procedural textures ---------- */

export function makeWoodTexture (track, { base = '#5b3a22', dark = '#3a2415', light = '#7a5230', size = 512 } = {}) {
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
  return track(tex)
}

export function makeBoardTexture (track, size = 1600) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const sq = size / 8
  const light = '#dcc194'
  const dark = '#41280f'
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const isDark = (r + f) % 2 === 1
      ctx.fillStyle = isDark ? dark : light
      ctx.fillRect(f * sq, r * sq, sq, sq)
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
  return track(tex)
}

export function makeLampShadeTexture (track) {
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
  return track(tex)
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
function knightHeadGeometry (track) {
  const s = new THREE.Shape()
  s.moveTo(-0.13, 0.545)
  s.bezierCurveTo(-0.175, 0.72, -0.165, 0.95, -0.135, 1.10)
  s.bezierCurveTo(-0.125, 1.18, -0.10, 1.26, -0.075, 1.315)
  s.lineTo(-0.035, 1.245)
  s.lineTo(0.005, 1.325)
  s.lineTo(0.035, 1.235)
  s.bezierCurveTo(0.075, 1.17, 0.115, 1.11, 0.15, 1.055)
  s.bezierCurveTo(0.21, 0.99, 0.26, 0.955, 0.272, 0.925)
  s.bezierCurveTo(0.276, 0.895, 0.255, 0.878, 0.225, 0.875)
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
  return track(geo)
}

/* ---------- piece assembly ---------- */

/* geometry is identical for every piece of a type, so build it once and
   share it between all the meshes (16 pawns cost the same as one) */
const geometryCache = new WeakMap()

function sharedGeometry (track, key, build) {
  let cache = geometryCache.get(track)
  if (!cache) { cache = new Map(); geometryCache.set(track, cache) }
  if (!cache.has(key)) cache.set(key, track(build()))
  return cache.get(key)
}

export function makePiece (track, type, mat, squareSize = SQ) {
  const group = new THREE.Group()
  group.userData.type = type
  const typeScale = type === 'pawn' ? 0.86 : type === 'rook' ? 0.94 : 1

  const latheGeo = sharedGeometry(track, 'lathe-' + type, () => {
    const g = new THREE.LatheGeometry(pieceProfile(type), 56)
    g.computeVertexNormals()
    return g
  })
  const body = new THREE.Mesh(latheGeo, mat)
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  if (type === 'knight') {
    const head = new THREE.Mesh(sharedGeometry(track, 'knight-head', () => knightHeadGeometry(track)), mat)
    head.castShadow = true
    head.receiveShadow = true
    group.add(head)
  }

  if (type === 'rook') {
    const toothGeo = sharedGeometry(track, 'tooth', () => new THREE.BoxGeometry(0.08, 0.09, 0.052))
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
    const slitGeo = sharedGeometry(track, 'slit', () => new THREE.BoxGeometry(0.024, 0.175, 0.30))
    const slitMat = sharedGeometry(track, 'slit-mat', () => new THREE.MeshStandardMaterial({ color: 0x0d0805, roughness: 0.85 }))
    const slit = new THREE.Mesh(slitGeo, slitMat)
    slit.position.set(0.02, 1.075, 0)
    slit.rotation.z = -0.78
    group.add(slit)
  }

  if (type === 'queen') {
    const pearlGeo = sharedGeometry(track, 'pearl', () => new THREE.SphereGeometry(0.028, 16, 12))
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      const pearl = new THREE.Mesh(pearlGeo, mat)
      pearl.position.set(Math.cos(a) * 0.213, 1.228, Math.sin(a) * 0.213)
      pearl.castShadow = true
      group.add(pearl)
    }
  }

  if (type === 'king') {
    const vGeo = sharedGeometry(track, 'cross-v', () => new THREE.BoxGeometry(0.034, 0.21, 0.034))
    const hGeo = sharedGeometry(track, 'cross-h', () => new THREE.BoxGeometry(0.135, 0.032, 0.034))
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

/* board coordinates (file 0-7 = a-h, row 0-7 = rank 8-1) to scene space */
export function boardToWorld (file, row, squareSize = SQ) {
  return new THREE.Vector3((file - 3.5) * squareSize, 0, (row - 3.5) * squareSize)
}
