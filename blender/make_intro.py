"""
make_intro.py: builds and renders the silent opening film for the portfolio.

The film: a lone horse gallops across a dusk valley (ebony shadows, amber light
behind the mountains), the camera tracks it, the horse races out of frame and
the valley is left empty and calm. The last ~2.5 seconds are the hand-over:
the website rises underneath while the film dissolves, so keep those seconds
quiet (this script does).

HOW TO RUN (Blender 4.2 or newer; written to also work on 5.x)
  1. Put the horse file next to this script as  horse.fbx  (or .glb / .gltf).
     Any rigged horse with a run/gallop animation works. Quaternius'
     "LowPoly Animated Animals" pack is free (CC0) and has a horse with a Run
     animation: check the licence on the download page yourself.
  2. Check the framing first (renders one still in a few seconds):
         blender -b -P make_intro.py -- --preview
     -> writes  intro_preview.png  next to this script.
  3. Render the film:
         blender -b -P make_intro.py
     -> writes  intro_raw.mp4  (silent). Then shrink it for the web:
         ffmpeg -i intro_raw.mp4 -an -c:v libx264 -crf 23 -preset slow \
                -pix_fmt yuv420p -movflags +faststart ../public/intro/intro.mp4

  Options:  --horse path/to/horse.fbx   --out path/to/film.mp4
            --yaw 90   (rotate the horse if it runs backwards or sideways)
            --speed 9  (metres per second; raise it if the hooves seem to slide)
            --seconds 12   --res 1920x1080

  You can also paste this into Blender's Scripting tab and press Run. It then
  uses the settings below and renders a preview still only (set PREVIEW=False).
"""
import math
import os
import random
import sys

import bpy
import mathutils

# ----------------------------------------------------------------- settings --
HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else os.getcwd()

HORSE_FILE = None            # None -> look for horse.fbx / .glb / .gltf next to this script
OUTPUT = os.path.join(HERE, "intro_raw.mp4")
PREVIEW = True               # True: one still only. Command line: --preview, or run without it for the film
PREVIEW_FRAME = 96           # which frame the preview shows (about 4 s in)

SECONDS = 12.0
FPS = 24
RES = (1920, 1080)

HORSE_LENGTH_M = 2.4         # nose-to-tail size the horse is scaled to
HORSE_YAW_DEG = 90.0         # the horse must face +X (it runs left to right)
SPEED_MPS = 9.0              # travel speed; tune so the hooves do not slide
ACTION_KEYWORDS = ("gallop", "run", "canter")   # first match wins

MOUNTAIN_HEIGHT = 90.0
SUN_AZIMUTH_DEG = 28.0       # 0 = straight behind the horse, positive = towards its direction of travel
SUN_ELEVATION_DEG = 9.0
SUN_COLOR = (1.0, 0.60, 0.30)
FOG = True                   # volumetric haze (set False if renders are slow)
SAMPLES = 64

# portfolio palette, linear-ish RGB
EBONY = (0.012, 0.010, 0.009)

# ------------------------------------------------------- command line flags --
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def flag(name, default=None, cast=str):
    if name in argv:
        i = argv.index(name)
        if cast is bool:
            return True
        return cast(argv[i + 1])
    return default


if bpy.app.background:         # launched from a terminal: flags decide
    PREVIEW = flag("--preview", False, bool)
HORSE_FILE = flag("--horse", HORSE_FILE)
OUTPUT = flag("--out", OUTPUT)
HORSE_YAW_DEG = flag("--yaw", HORSE_YAW_DEG, float)
SPEED_MPS = flag("--speed", SPEED_MPS, float)
SECONDS = flag("--seconds", SECONDS, float)
_res = flag("--res")
if _res:
    RES = tuple(int(v) for v in _res.lower().split("x"))

FRAMES = int(round(SECONDS * FPS))


# ----------------------------------------------------------------- helpers --
def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def _hash(ix, iy, seed):
    n = (ix * 374761393 + iy * 668265263 + seed * 982451653) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    n ^= n >> 16
    return (n & 0xFFFF) / 65535.0


def _vnoise(x, y, seed):
    ix, iy = math.floor(x), math.floor(y)
    fx, fy = x - ix, y - iy
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b = _hash(ix, iy, seed), _hash(ix + 1, iy, seed)
    c, d = _hash(ix, iy + 1, seed), _hash(ix + 1, iy + 1, seed)
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fy)


def fbm(x, y, seed, octaves=4):
    v, amp, f = 0.0, 0.5, 1.0
    for _ in range(octaves):
        v += amp * _vnoise(x * f, y * f, seed)
        f *= 2.0
        amp *= 0.5
    return v


def terrain_height(x, y):
    """Flat riding strip near y=0, rolling meadow, then mountains far behind."""
    strip = smoothstep(4.0, 16.0, abs(y))
    meadow = (fbm(x * 0.03, y * 0.03, 1) - 0.45) * 5.0
    hills = smoothstep(14.0, 70.0, y) * 9.0 * fbm(x * 0.02 + 3, y * 0.02, 3)
    far = smoothstep(30.0, 150.0, y)
    ridge = fbm(x * 0.012 + 7, y * 0.012, 2) * 0.9 + 0.25
    return strip * (meadow + hills) + far * far * MOUNTAIN_HEIGHT * ridge


def new_material(name, color, rough=0.95):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    return mat


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.actions,
                 bpy.data.armatures, bpy.data.cameras, bpy.data.lights,
                 bpy.data.images):
        for block in list(coll):
            if block.users == 0:
                coll.remove(block)


# ------------------------------------------------------------------- world --
def build_world(scene):
    world = bpy.data.worlds.new("DuskWorld")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    glow = nt.nodes.new("ShaderNodeVectorMath")
    glow.operation = "DOT_PRODUCT"
    glow_pow = nt.nodes.new("ShaderNodeMath")
    glow_pow.operation = "POWER"
    glow_clamp = nt.nodes.new("ShaderNodeMath")
    glow_clamp.operation = "MAXIMUM"
    amber = nt.nodes.new("ShaderNodeMix")
    amber.data_type = "RGBA"

    az, el = math.radians(SUN_AZIMUTH_DEG), math.radians(SUN_ELEVATION_DEG)
    sun_dir = (math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el))
    glow.inputs[1].default_value = sun_dir
    glow_pow.inputs[1].default_value = 7.0
    glow_clamp.inputs[1].default_value = 0.0

    # sky colour by height: ebony-blue overhead, dusky mauve, warm horizon band
    e = ramp.color_ramp.elements
    e[0].position, e[0].color = 0.0, (0.55, 0.26, 0.10, 1)
    e[1].position, e[1].color = 0.6, (0.010, 0.014, 0.030, 1)
    mid = e.new(0.16)
    mid.color = (0.06, 0.05, 0.075, 1)

    amber.inputs[7].default_value = (*SUN_COLOR, 1.0)   # B colour
    nt.links.new(coord.outputs["Generated"], sep.inputs["Vector"])
    nt.links.new(sep.outputs["Z"], ramp.inputs["Fac"])
    nt.links.new(coord.outputs["Generated"], glow.inputs[0])
    nt.links.new(glow.outputs["Value"], glow_clamp.inputs[0])
    nt.links.new(glow_clamp.outputs["Value"], glow_pow.inputs[0])
    nt.links.new(glow_pow.outputs["Value"], amber.inputs["Factor"])
    nt.links.new(ramp.outputs["Color"], amber.inputs[6])  # A colour
    nt.links.new(amber.outputs[2], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 0.9
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])

    if FOG:
        try:
            scatter = nt.nodes.new("ShaderNodeVolumeScatter")
            scatter.inputs["Color"].default_value = (0.75, 0.55, 0.40, 1.0)
            scatter.inputs["Density"].default_value = 0.0035
            scatter.inputs["Anisotropy"].default_value = 0.45
            nt.links.new(scatter.outputs["Volume"], out.inputs["Volume"])
        except Exception as exc:
            print("fog skipped:", exc)

    return sun_dir


def build_sun(scene, sun_dir):
    light_data = bpy.data.lights.new("Sun", "SUN")
    light_data.energy = 3.2
    light_data.color = SUN_COLOR
    light_data.angle = math.radians(2.0)
    sun = bpy.data.objects.new("Sun", light_data)
    scene.collection.objects.link(sun)
    # a sun lamp shines along its own -Z; point that away from the sky position
    direction = mathutils.Vector((-sun_dir[0], -sun_dir[1], -sun_dir[2]))
    sun.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


# ----------------------------------------------------------------- terrain --
def build_terrain(scene):
    rnd = random.Random(11)
    step = 2.0
    x0, x1, y0, y1 = -90.0, 40.0 + SPEED_MPS * SECONDS + 160.0, -40.0, 170.0
    nx, ny = int((x1 - x0) / step) + 1, int((y1 - y0) / step) + 1

    verts, tints = [], []
    for j in range(ny):
        for i in range(nx):
            x = x0 + i * step + rnd.uniform(-0.35, 0.35) * step
            y = y0 + j * step + rnd.uniform(-0.35, 0.35) * step
            z = terrain_height(x, y)
            verts.append((x, y, z))
            # colour: dark olive meadow, cooler blue-grey with height and distance
            haze = smoothstep(40.0, 170.0, y)
            rock = smoothstep(18.0, 70.0, z)
            n = fbm(x * 0.15, y * 0.15, 5)
            r = lerp(0.050, 0.030, haze) + 0.02 * rock + 0.012 * n
            g = lerp(0.075, 0.040, haze) + 0.010 * rock + 0.018 * n
            b = lerp(0.028, 0.060, haze) + 0.020 * rock
            tints.append((r, g, b))

    faces = []
    for j in range(ny - 1):
        for i in range(nx - 1):
            a = j * nx + i
            faces.append((a, a + 1, a + nx + 1, a + nx))

    mesh = bpy.data.meshes.new("TerrainMesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    for poly in mesh.polygons:
        poly.use_smooth = False   # faceted, low-poly look

    attr = mesh.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    flat = [0.0] * (len(mesh.loops) * 4)
    for poly in mesh.polygons:
        vs = poly.vertices
        col = [sum(tints[v][k] for v in vs) / len(vs) for k in range(3)]
        for li in poly.loop_indices:
            flat[li * 4:li * 4 + 4] = (col[0], col[1], col[2], 1.0)
    attr.data.foreach_set("color", flat)

    obj = bpy.data.objects.new("Terrain", mesh)
    scene.collection.objects.link(obj)

    mat = bpy.data.materials.new("TerrainMat")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    col_node = nt.nodes.new("ShaderNodeVertexColor")
    col_node.layer_name = "Col"
    nt.links.new(col_node.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.95
    mesh.materials.append(mat)
    return x0, x1


def build_trees(scene):
    rnd = random.Random(7)
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=1.0, radius2=0.0, depth=1.0)
    proto = bpy.context.active_object
    mesh = proto.data
    mesh.materials.append(new_material("Pine", (0.012, 0.030, 0.016)))
    proto.name = "Pine_0"
    placed = 0
    for _ in range(140):
        x = rnd.uniform(-60.0, 40.0 + SPEED_MPS * SECONDS + 120.0)
        y = rnd.uniform(10.0, 75.0)
        if rnd.random() < 0.35:     # a few groves close to the track
            y = rnd.uniform(10.0, 22.0)
        h = rnd.uniform(5.0, 11.0)
        r = h * rnd.uniform(0.22, 0.30)
        z = terrain_height(x, y)
        if placed == 0:
            obj = proto
        else:
            obj = bpy.data.objects.new(f"Pine_{placed}", mesh)
            scene.collection.objects.link(obj)
        obj.scale = (r, r, h)
        obj.location = (x, y, z + h / 2.0)
        obj.rotation_euler[2] = rnd.uniform(0, math.tau)
        placed += 1


# ------------------------------------------------------------------- horse --
def find_horse_file():
    if HORSE_FILE:
        return HORSE_FILE
    for ext in (".fbx", ".glb", ".gltf"):
        p = os.path.join(HERE, "horse" + ext)
        if os.path.exists(p):
            return p
    raise SystemExit("No horse file found. Put horse.fbx (or .glb/.gltf) next to make_intro.py, "
                     "or pass --horse path/to/file.")


def iter_fcurves(action):
    """F-curves of an action on both the older and the newer (layered) action API."""
    if hasattr(action, "fcurves"):
        try:
            return list(action.fcurves)
        except Exception:
            pass
    out = []
    for layer in getattr(action, "layers", []):
        for strip in layer.strips:
            for bag in getattr(strip, "channelbags", []):
                out.extend(bag.fcurves)
    return out


def pick_action():
    names = [a.name for a in bpy.data.actions]
    print("Actions found in the horse file:", names)
    for kw in ACTION_KEYWORDS:
        hits = [a for a in bpy.data.actions if kw in a.name.lower() and "jump" not in a.name.lower()]
        if hits:
            return min(hits, key=lambda a: len(a.name))
    return bpy.data.actions[0] if bpy.data.actions else None


def build_horse(scene):
    path = find_horse_file()
    before = set(bpy.data.objects)
    ext = os.path.splitext(path)[1].lower()
    if ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=path)
    elif ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=path)
    else:
        raise SystemExit("Horse file must be .fbx, .glb or .gltf")
    new = [o for o in bpy.data.objects if o not in before]
    # packs often contain several animals: keep only what looks like the horse
    horse_bits = [o for o in new if "horse" in o.name.lower()]
    if horse_bits:
        keep = set(horse_bits)
        for o in horse_bits:
            p = o.parent
            while p:                     # keep the armature the horse hangs from
                keep.add(p)
                p = p.parent
        for o in new:
            if o not in keep:
                bpy.data.objects.remove(o, do_unlink=True)
        new = list(keep)

    root = bpy.data.objects.new("HorseRoot", None)
    scene.collection.objects.link(root)
    for o in new:
        if o.parent is None or o.parent not in new:
            o.parent = root

    # size and ground the horse
    bpy.context.view_layer.update()
    lo = mathutils.Vector((1e9, 1e9, 1e9))
    hi = mathutils.Vector((-1e9, -1e9, -1e9))
    for o in new:
        if o.type != "MESH":
            continue
        for corner in o.bound_box:
            w = o.matrix_world @ mathutils.Vector(corner)
            lo = mathutils.Vector([min(lo[i], w[i]) for i in range(3)])
            hi = mathutils.Vector([max(hi[i], w[i]) for i in range(3)])
    length = max(hi[0] - lo[0], hi[1] - lo[1]) or 1.0
    s = HORSE_LENGTH_M / length
    root.scale = (s, s, s)
    ground = -lo[2] * s
    root.rotation_euler[2] = math.radians(HORSE_YAW_DEG)

    # loop the run cycle in place; the root does the travelling
    action = pick_action()
    for o in new:
        if o.type == "ARMATURE":
            ad = o.animation_data_create()
            for track in list(ad.nla_tracks):
                ad.nla_tracks.remove(track)
            if action:
                ad.action = action
    if action:
        try:
            for fc in iter_fcurves(action):
                fc.modifiers.new("CYCLES")
        except Exception as exc:
            print("Could not loop the animation (it will play once):", exc)
    return root, ground


# ---------------------------------------------------------- motion + camera --
def horse_offset(t):
    """Where the horse sits in frame (metres right of centre) over time (seconds)."""
    keys = [(0.0, -9.0), (2.5, -2.0), (6.5, 2.0), (9.3, 13.0), (SECONDS, 13.0)]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t <= t1:
            k = smoothstep(t0, t1, t) if t1 > t0 else 1.0
            # blend ease with linear so the horse never seems to stop
            return lerp(v0, v1, 0.55 * k + 0.45 * ((t - t0) / (t1 - t0) if t1 > t0 else 1.0))
    return keys[-1][1]


def build_camera(scene, root, ground):
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.lens = 38
    cam_data.dof.use_dof = True
    cam_data.dof.focus_object = root
    cam_data.dof.aperture_fstop = 2.6
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.rotation_euler = (math.radians(91.5), 0.0, 0.0)   # looks along +Y, a touch upward

    # linear keyframes so speed stays even
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
    x_start = -10.0
    for f in range(1, FRAMES + 1):
        t = (f - 1) / FPS
        hx = x_start + SPEED_MPS * t
        root.location = (hx, 0.0, ground)
        root.keyframe_insert("location", frame=f)
        push = lerp(-9.0, -7.6, smoothstep(0.0, SECONDS, t))   # slow push-in
        cam.location = (hx - horse_offset(t), push, 1.05)
        cam.keyframe_insert("location", frame=f)

    # fade up from ebony at the start, settle slightly darker at the end
    vs = scene.view_settings
    vs.exposure = -6.0
    vs.keyframe_insert("exposure", frame=1)
    vs.exposure = 0.0
    vs.keyframe_insert("exposure", frame=int(FPS * 1.2))
    vs.keyframe_insert("exposure", frame=int(FRAMES - FPS * 2.2))
    vs.exposure = -1.2
    vs.keyframe_insert("exposure", frame=FRAMES)
    vs.exposure = 0.0


# ------------------------------------------------------------------ render --
def configure_render(scene):
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    try:
        scene.eevee.taa_render_samples = SAMPLES
    except Exception:
        pass

    scene.render.resolution_x, scene.render.resolution_y = RES
    scene.render.resolution_percentage = 100
    scene.render.fps = FPS
    scene.frame_start, scene.frame_end = 1, FRAMES

    for transform, look in (("AgX", "AgX - Medium High Contrast"), ("AgX", "Medium High Contrast"), ("Filmic", "Medium High Contrast")):
        try:
            scene.view_settings.view_transform = transform
            try:
                scene.view_settings.look = look
            except TypeError:
                pass
            break
        except TypeError:
            continue

    img = scene.render.image_settings
    if PREVIEW:
        img.file_format = "PNG"
    else:
        img.file_format = "FFMPEG"
        ff = scene.render.ffmpeg
        ff.format = "MPEG4"
        ff.codec = "H264"
        ff.constant_rate_factor = "HIGH"
        ff.ffmpeg_preset = "GOOD"
        ff.audio_codec = "NONE"      # the intro is silent


def main():
    clear_scene()
    scene = bpy.context.scene
    sun_dir = build_world(scene)
    build_sun(scene, sun_dir)
    build_terrain(scene)
    build_trees(scene)
    root, ground = build_horse(scene)
    build_camera(scene, root, ground)
    configure_render(scene)

    if PREVIEW:
        scene.frame_set(PREVIEW_FRAME)
        scene.render.filepath = os.path.join(HERE, "intro_preview.png")
        bpy.ops.render.render(write_still=True)
        print("Preview written to", scene.render.filepath)
    else:
        scene.render.filepath = OUTPUT
        bpy.ops.render.render(animation=True)
        print("Film written to", OUTPUT)


main()
