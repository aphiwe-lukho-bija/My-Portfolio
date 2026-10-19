<script setup>
/* ChessGate.vue — the dialog frame around the chess experience.
   Loads the heavy 3D scene only when a visitor asks for it, shows an
   obvious "Back to Portfolio" control the whole time, closes on Escape,
   keeps keyboard focus inside while open and hands it back afterwards. */
import { shallowRef, ref, onMounted, onBeforeUnmount } from 'vue'

defineProps({
  reducedMotion: { type: Boolean, default: false }
})
const emit = defineEmits(['close'])

const root = ref(null)
const backBtn = ref(null)
const Experience = shallowRef(null)
const failed = ref(false)
const unsupported = ref(false)

function load () {
  failed.value = false
  import('./ChessExperience.vue')
    .then((m) => { Experience.value = m.default })
    .catch(() => { failed.value = true })
}

function onKeyDown (ev) {
  if (ev.key === 'Escape') {
    ev.preventDefault()
    emit('close')
    return
  }
  if (ev.key !== 'Tab' || !root.value) return
  // keep Tab inside the dialog
  const items = [...root.value.querySelectorAll('button:not([disabled]), [tabindex="0"]')]
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus() }
  else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus() }
}

onMounted(() => {
  load()
  backBtn.value && backBtn.value.focus({ preventScroll: true })
})
onBeforeUnmount(() => { Experience.value = null })
</script>

<template>
  <div
    ref="root"
    class="chess-gate"
    role="dialog"
    aria-modal="true"
    aria-label="The Next Move: interactive chess"
    @keydown="onKeyDown"
  >
    <component
      :is="Experience"
      v-if="Experience && !unsupported"
      :reduced-motion="reducedMotion"
      @unsupported="unsupported = true"
    />

    <div v-else class="gate-wait" role="status">
      <template v-if="unsupported">
        <p>This browser can’t show 3D graphics, so the chess scene isn’t available. The rest of the portfolio works as normal.</p>
      </template>
      <template v-else-if="!failed">
        <span class="gate-spinner" aria-hidden="true"></span>
        <p>Setting the board…</p>
      </template>
      <template v-else>
        <p>The chess scene could not be loaded. Check your connection and try again.</p>
        <button type="button" class="gate-retry" @click="load">Try again</button>
      </template>
    </div>

    <button ref="backBtn" type="button" class="gate-back" @click="emit('close')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M19 12H5" />
        <path d="m11 18-6-6 6-6" />
      </svg>
      Back to Portfolio
    </button>
  </div>
</template>

<style scoped>
.chess-gate {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: #050403;
  animation: gateIn 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes gateIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.gate-back {
  position: absolute;
  z-index: 5;
  top: clamp(0.8rem, 2vw, 1.4rem);
  left: clamp(0.8rem, 2vw, 1.6rem);
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1.2rem 0.7rem 1rem;
  border: 1px solid rgba(210, 174, 114, 0.45);
  border-radius: 999px;
  background: rgba(10, 8, 6, 0.62);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--ivory);
  font-size: 0.88rem;
  font-weight: 500;
  transition: border-color 0.3s, background 0.3s;
}

.gate-back:hover {
  border-color: var(--brass-2);
  background: rgba(34, 25, 16, 0.78);
}

.gate-wait {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  color: var(--muted);
}

.gate-wait p {
  margin: 0;
  max-width: 24rem;
}

.gate-spinner {
  width: 1.6rem;
  height: 1.6rem;
  border: 1.5px solid rgba(210, 174, 114, 0.25);
  border-top-color: var(--brass-2);
  border-radius: 50%;
  animation: spin 1.1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.gate-retry {
  padding: 0.65rem 1.3rem;
  border: 1px solid rgba(210, 174, 114, 0.45);
  border-radius: 999px;
  color: var(--ivory);
}

@media (prefers-reduced-motion: reduce) {
  .chess-gate { animation: none; }
  .gate-spinner { animation-duration: 3s; }
}
</style>
