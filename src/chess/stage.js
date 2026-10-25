/* stage.js — the walnut desk, lacquered board, brass lamp and lighting.
   This is the original ChessIntro set, lifted out unchanged in look
   (warm key light, amber rim, cool fill, image-based reflections) and
   trimmed for interactive use: no depth-of-field pass, and shadow
   resolution drops on small screens. */
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { SQ, BOARD_TOP, makeWoodTexture, makeBoardTexture, makeLampShadeTexture } from './pieces.js'

export function buildStage (scene, renderer, track, { small = false } = {}) {
  scene.background = new THREE.Color(0x050403)
  scene.fog = new THREE.FogExp2(0x050403, 0.05)

  // image-based lighting so lacquer, brass and ebony catch real reflections
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTex
  track(envTex)
  pmrem.dispose()

  /* ---- materials ---- */
  const deskTex = makeWoodTexture(track, { base: '#3b2413', dark: '#241206', light: '#5a3a1e' })
  deskTex.repeat.set(2, 1.3)
  const deskMat = track(new THREE.MeshStandardMaterial({
    map: deskTex, bumpMap: deskTex, bumpScale: 0.35, roughness: 0.55, metalness: 0.05
  }))

  const frameTex = makeWoodTexture(track, { base: '#4a2e18', dark: '#2c1808', light: '#6b4524' })
  frameTex.repeat.set(2, 2)
  const frameMat = track(new THREE.MeshPhysicalMaterial({
    map: frameTex, bumpMap: frameTex, bumpScale: 0.25,
    roughness: 0.55, metalness: 0.04,
    clearcoat: 0.1, clearcoatRoughness: 0.5, envMapIntensity: 0.2
  }))

  const boardTex = makeBoardTexture(track, small ? 1024 : 1600)
  const boardMat = track(new THREE.MeshPhysicalMaterial({
    map: boardTex, roughness: 0.55, metalness: 0.02,
    clearcoat: 0.12, clearcoatRoughness: 0.5, envMapIntensity: 0.22
  }))

  const brassMat = track(new THREE.MeshStandardMaterial({
    color: 0xb08d57, roughness: 0.52, metalness: 0.85, envMapIntensity: 0.3
  }))

  // lacquered boxwood (light) and polished ebony (dark)
  const pieceGrain = makeWoodTexture(track, { base: '#c9a978', dark: '#a5854f', light: '#e6cda2', size: 256 })
  pieceGrain.repeat.set(1.5, 3)
  const matLight = track(new THREE.MeshPhysicalMaterial({
    map: pieceGrain, color: 0xffffff, roughness: 0.52, metalness: 0.02,
    clearcoat: 0.1, clearcoatRoughness: 0.5, envMapIntensity: 0.22,
    bumpMap: pieceGrain, bumpScale: 0.12
  }))
  const matDark = track(new THREE.MeshPhysicalMaterial({
    color: 0x1c1109, roughness: 0.5, metalness: 0.03,
    clearcoat: 0.12, clearcoatRoughness: 0.48, envMapIntensity: 0.26,
    bumpMap: pieceGrain, bumpScale: 0.08
  }))

  /* ---- desk: 1.4 m x 0.9 m at 1 unit = 10 cm, so the board sits at true scale ---- */
  const desk = new THREE.Mesh(track(new THREE.BoxGeometry(14, 0.5, 9)), deskMat)
  desk.position.y = -0.26
  desk.receiveShadow = true
  scene.add(desk)

  /* ---- chessboard: stepped frame, inner bed, playing surface, brass edge ---- */
  const boardGroup = new THREE.Group()
  scene.add(boardGroup)

  const frame = new THREE.Mesh(track(new THREE.BoxGeometry(8 * SQ + 0.5, 0.17, 8 * SQ + 0.5)), frameMat)
  frame.position.y = 0.085
  frame.castShadow = true
  frame.receiveShadow = true
  boardGroup.add(frame)

  const bed = new THREE.Mesh(track(new THREE.BoxGeometry(4.14, 0.06, 4.14)), frameMat)
  bed.position.y = 0.145
  bed.receiveShadow = true
  boardGroup.add(bed)

  const surface = new THREE.Mesh(track(new THREE.PlaneGeometry(8 * SQ, 8 * SQ)), boardMat)
  surface.rotation.x = -Math.PI / 2
  surface.position.y = BOARD_TOP
  surface.receiveShadow = true
  boardGroup.add(surface)

  const bandLong = track(new THREE.BoxGeometry(8 * SQ + 0.5, 0.008, 0.035))
  const bandSide = track(new THREE.BoxGeometry(0.035, 0.008, 8 * SQ + 0.5))
  const edge = 2 * SQ + 0.25 - 0.02
  for (const [geo, x, z] of [
    [bandLong, 0, -edge], [bandLong, 0, edge],
    [bandSide, -edge, 0], [bandSide, edge, 0]
  ]) {
    const band = new THREE.Mesh(geo, brassMat)
    band.position.set(x, 0.172, z)
    boardGroup.add(band)
  }

  /* ---- desk lamp, ~40 cm tall ---- */
  const lampGroup = new THREE.Group()
  lampGroup.position.set(4.0, 0, -2.6)
  lampGroup.scale.setScalar(2.1)
  scene.add(lampGroup)

  const lampBase = new THREE.Mesh(track(new THREE.CylinderGeometry(0.28, 0.34, 0.08, 32)), brassMat)
  lampBase.position.y = 0.04
  lampBase.castShadow = true
  lampGroup.add(lampBase)

  const arm = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 16)), brassMat)
  arm.position.set(-0.15, 0.85, 0)
  arm.rotation.z = 0.22
  arm.castShadow = true
  lampGroup.add(arm)

  const shadeMat = track(new THREE.MeshStandardMaterial({
    map: makeLampShadeTexture(track), roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide
  }))
  const shade = new THREE.Mesh(track(new THREE.ConeGeometry(0.42, 0.5, 32, 1, true)), shadeMat)
  shade.position.set(-0.45, 1.62, 0)
  shade.rotation.z = 0.5
  shade.castShadow = true
  lampGroup.add(shade)

  const bulbMat = track(new THREE.MeshStandardMaterial({
    color: 0xffd9a0, emissive: 0xffc878, emissiveIntensity: 1.6, roughness: 1
  }))
  const bulb = new THREE.Mesh(track(new THREE.SphereGeometry(0.07, 16, 16)), bulbMat)
  bulb.position.set(-0.5, 1.5, 0)
  lampGroup.add(bulb)

  /* ---- lighting: warm key, amber rim, cool fill ---- */
  scene.add(new THREE.AmbientLight(0x1c1208, 1.4))

  const key = new THREE.SpotLight(0xffc98a, 40, 16, Math.PI / 4.4, 0.5, 1.4)
  key.position.set(2.9, 3.2, -2.4)
  key.target.position.set(0.2, 0, 0.2)
  key.castShadow = true
  const shadowSize = small ? 1024 : 2048
  key.shadow.mapSize.set(shadowSize, shadowSize)
  key.shadow.bias = -0.0004
  key.shadow.radius = 6
  scene.add(key, key.target)

  const rim = new THREE.DirectionalLight(0xd98b4a, 2.4)
  rim.position.set(-3.5, 2.2, -4)
  scene.add(rim)

  const fill = new THREE.DirectionalLight(0x40506a, 0.5)
  fill.position.set(-2, 3, 5)
  scene.add(fill)

  const practical = new THREE.PointLight(0xffb870, 7, 9, 2)
  practical.position.set(-0.5, 1.45, 0)
  lampGroup.add(practical)

  /* ---- background: dark panelled wall ---- */
  const wall = new THREE.Mesh(
    track(new THREE.PlaneGeometry(40, 16)),
    track(new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 0.9 }))
  )
  wall.position.set(0, 5, -7)
  wall.receiveShadow = true
  scene.add(wall)

  return { boardGroup, matLight, matDark, brassMat, key }
}
