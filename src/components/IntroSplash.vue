<script setup>
/* IntroSplash.vue — the opening film.

   A silent, full-screen film plays first. Shortly before it ends the
   portfolio begins to rise underneath while the film dissolves, so the
   hand-over is one slow movement rather than a cut.

   Events
     reveal  the page should start appearing now (fired once)
     done    the film layer is fully gone and can be removed

   Safety nets: if the film file is missing, fails to load, is blocked from
   autoplaying, or stalls, the intro is dropped and the portfolio simply
   appears. A visitor can always skip with the button or the Esc key. */
import { ref, onMounted, onBeforeUnmount } from 'vue'

// how long before the end of the film the page starts to rise, in seconds
const REVEAL_LEAD = 2.4
// how long the film layer takes to dissolve (must match the CSS below)
const FADE_MS = 2900
const FADE_FAST_MS = 800
// if the film has not started playing after this long, give up on it
const STALL_MS = 8000

const emit = defineEmits(['reveal', 'done'])

const src = `${import.meta.env.BASE_URL}intro/intro.mp4`

const video = ref(null)
const progress = ref(0)
const revealing = ref(false)
const fast = ref(false)
const showSkip = ref(false)

let revealed = false
let finished = false
let stallTimer
let skipTimer
let doneTimer

function reveal (quick = false) {
  if (revealed) return
  revealed = true
  fast.value = quick
  revealing.value = true
  emit('reveal', quick)
  doneTimer = setTimeout(finish, (quick ? FADE_FAST_MS : FADE_MS) + 150)
}

function finish () {
  if (finished) return
  finished = true
  clearTimeout(doneTimer)
  if (video.value) video.value.pause()
  emit('done')
}

/* the film cannot be used at all: no overlay, no delay */
function bail () {
  clearTimeout(stallTimer)
  if (!revealed) {
    revealed = true
    emit('reveal')
  }
  finish()
}

function skip () {
  clearTimeout(stallTimer)
  reveal(true)
}

function onTime () {
  const v = video.value
  if (!v || !v.duration) return
  progress.value = Math.min(1, v.currentTime / v.duration)
  // a very short film still gets a proper hand-over
  const lead = Math.min(REVEAL_LEAD, v.duration * 0.4)
  if (v.duration - v.currentTime <= lead) reveal()
}

function onPlaying () {
  clearTimeout(stallTimer)
}

function onKey (e) {
  if (e.key === 'Escape') skip()
}

onMounted(() => {
  const v = video.value
  window.addEventListener('keydown', onKey)
  skipTimer = setTimeout(() => { showSkip.value = true }, 500)
  stallTimer = setTimeout(bail, STALL_MS)

  if (!v) return bail()
  // Vue does not reliably reflect `muted` as an attribute; browsers only
  // allow autoplay for films that are muted, so set it on the element itself
  v.muted = true
  v.defaultMuted = true
  const attempt = v.play()
  if (attempt && typeof attempt.catch === 'function') {
    attempt.catch(bail)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  clearTimeout(stallTimer)
  clearTimeout(skipTimer)
  clearTimeout(doneTimer)
})
</script>

<template>
  <div
    class="intro"
    :class="{ 'is-revealing': revealing, 'is-fast': fast }"
    role="region"
    aria-label="Introduction film"
  >
    <video
      ref="video"
      class="intro-video"
      muted
      playsinline
      preload="auto"
      disablepictureinpicture
      disableremoteplayback
      aria-hidden="true"
      tabindex="-1"
      @timeupdate="onTime"
      @playing="onPlaying"
      @ended="reveal()"
      @error="bail"
    >
      <source :src="src" type="video/mp4" @error="bail" />
    </video>

    <div class="intro-vignette" aria-hidden="true"></div>
    <div class="intro-veil" aria-hidden="true"></div>

    <div class="intro-progress" aria-hidden="true">
      <span :style="{ transform: `scaleX(${progress})` }"></span>
    </div>

    <button
      class="intro-skip"
      :class="{ 'is-shown': showSkip }"
      type="button"
      @click="skip"
    >
      Skip intro
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3 3l6 5-6 5V3zm7 0h2v10h-2V3z" fill="currentColor" />
      </svg>
    </button>
  </div>
</template>

<style>
.intro {
  position: fixed;
  inset: 0;
  z-index: 1500;
  overflow: hidden;
  background: var(--ebony);
  /* the layer only starts to fade once the film has begun to darken, so the
     golden valley first settles into the site's ebony and then gives way */
  transition: opacity 2.2s cubic-bezier(0.45, 0, 0.2, 1) 0.7s;
}

.intro.is-revealing {
  opacity: 0;
  pointer-events: none;
}

/* the film drifts upward, softens and falls into ebony and warm amber, the
   colours of the page it is handing over to */
.intro-video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: var(--ebony);
  transition: transform 3.2s var(--ease), filter 2s cubic-bezier(0.4, 0, 0.2, 1);
}

.intro.is-revealing .intro-video {
  transform: translateY(-3%) scale(1.06);
  filter: blur(6px) brightness(0.34) saturate(0.75) sepia(0.18);
}

/* a soft ebony veil climbs from the bottom edge, the way the page does */
.intro-veil {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 130%;
  pointer-events: none;
  background: linear-gradient(0deg, var(--ebony) 0%, rgba(10, 8, 7, 0.88) 38%, rgba(10, 8, 7, 0) 100%);
  opacity: 0;
  transform: translateY(55%);
  transition: opacity 1.8s ease, transform 2.6s var(--ease);
}

.intro.is-revealing .intro-veil {
  opacity: 1;
  transform: translateY(0);
}

/* skipping: the same movement, much quicker */
.intro.is-fast,
.intro.is-fast .intro-video,
.intro.is-fast .intro-veil {
  transition-duration: 0.8s;
  transition-delay: 0s;
}

/* edges fall into the site's ebony so the film never looks like a box */
.intro-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(10, 8, 7, 0.55) 100%),
    linear-gradient(180deg, rgba(10, 8, 7, 0.35), transparent 22%, transparent 78%, rgba(10, 8, 7, 0.45));
}

/* a hairline of brass that fills as the film plays */
.intro-progress {
  position: absolute;
  left: var(--gutter);
  right: var(--gutter);
  bottom: calc(1.4rem + env(safe-area-inset-bottom, 0px));
  height: 1px;
  background: rgba(210, 174, 114, 0.18);
  pointer-events: none;
}

.intro-progress span {
  display: block;
  height: 100%;
  background: var(--brass-2);
  transform-origin: left center;
  transform: scaleX(0);
}

.intro-skip {
  position: absolute;
  right: var(--gutter);
  bottom: calc(2.4rem + env(safe-area-inset-bottom, 0px));
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 1.15rem;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: rgba(10, 8, 7, 0.45);
  color: var(--ivory);
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  opacity: 0;
  transform: translateY(0.5rem);
  transition: opacity 0.8s var(--ease), transform 0.8s var(--ease),
    background 0.3s, border-color 0.3s;
}

.intro-skip.is-shown {
  opacity: 1;
  transform: none;
}

.intro-skip:hover {
  background: rgba(176, 141, 87, 0.22);
  border-color: var(--brass-2);
}
</style>
