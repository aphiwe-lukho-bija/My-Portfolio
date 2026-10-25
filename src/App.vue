<script setup>
import { ref, onMounted, nextTick, defineAsyncComponent } from 'vue'

import LivingBackground from './components/LivingBackground.vue'
import SiteNav from './components/SiteNav.vue'
import SiteFooter from './components/SiteFooter.vue'
import IntroSplash from './components/IntroSplash.vue'
import HomeView from './components/HomeView.vue'
import TextPage from './components/TextPage.vue'
import ProjectsView from './components/ProjectsView.vue'
import SkillsView from './components/SkillsView.vue'
import ExperienceView from './components/ExperienceView.vue'
import GalleryView from './components/GalleryView.vue'
import ContactView from './components/ContactView.vue'
import { useReducedMotion } from './composables/useReducedMotion.js'
import { about, goals } from './data/portfolio.js'

// the chess scene (Three.js, the engine, the AI worker) is only downloaded
// when a visitor opens it, so it never slows the portfolio itself
const ChessGate = defineAsyncComponent(() => import('./components/ChessGate.vue'))

const reduced = useReducedMotion()
const chessOpen = ref(false)
let returnTo = null

/* the opening film. It plays once per browser session, never for visitors who
   ask for reduced motion, and can be forced with ?intro or switched off with
   ?nointro in the address. */
const INTRO_KEY = 'portfolio:intro-seen'

function shouldPlayIntro () {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.has('nointro')) return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  if (params.has('intro')) return true
  try {
    return !window.sessionStorage.getItem(INTRO_KEY)
  } catch (e) {
    return true
  }
}

const introActive = ref(shouldPlayIntro()) // the film layer exists
const introHold = ref(introActive.value) // the page waits, hidden, underneath
if (introActive.value) document.documentElement.classList.add('intro-active')

function startArrival () {
  // the hero's own staggered arrival begins as the page rises
  requestAnimationFrame(() => document.documentElement.classList.add('is-ready'))
}

function onIntroReveal (quick) {
  if (quick) document.documentElement.classList.add('intro-quick')
  introHold.value = false
  window.dispatchEvent(new CustomEvent('portfolio:intro-reveal'))
  startArrival()
}

function onIntroDone () {
  introActive.value = false
  document.documentElement.classList.remove('intro-active', 'intro-quick')
  try {
    window.sessionStorage.setItem(INTRO_KEY, '1')
  } catch (e) { /* storage blocked: the film will simply play again next visit */ }
  // the skip button just left the page; hand keyboard focus to the content
  nextTick(() => document.getElementById('main')?.focus({ preventScroll: true }))
}

/* the opening film is always a click away, even after it has played */
function replayIntro () {
  if (introActive.value) return
  window.scrollTo({ top: 0, behavior: 'auto' })
  document.documentElement.classList.remove('is-ready', 'intro-quick')
  document.documentElement.classList.add('intro-active')
  introHold.value = true
  introActive.value = true
}

function openChess () {
  returnTo = document.activeElement
  chessOpen.value = true
  document.documentElement.classList.add('chess-open')
}

function closeChess () {
  chessOpen.value = false
  document.documentElement.classList.remove('chess-open')
  // hand keyboard focus back to whatever opened the scene
  nextTick(() => {
    const target = returnTo && returnTo.isConnected ? returnTo : document.querySelector('.chess-link')
    target && target.focus({ preventScroll: true })
  })
}

onMounted(() => {
  // starts the one orchestrated arrival: the name reveals as the ribbon passes.
  // With the intro film, it starts when the film hands over instead.
  if (!introActive.value) startArrival()
})
</script>

<template>
  <LivingBackground :paused="chessOpen" :reduced-motion="reduced" />

  <a class="skip-link" href="#main">Skip to content</a>

  <div
    class="app-shell"
    :class="{ 'intro-hold': introHold }"
    :inert="chessOpen || introHold ? '' : null"
  >
    <SiteNav @open-chess="openChess" @replay-intro="replayIntro" />

    <main id="main" tabindex="-1">
      <HomeView id="home" @open-chess="openChess" />

      <TextPage
        id="about"
        :title="about.heading"
        :paragraphs="about.paragraphs"
        :highlights="about.highlights"
      />

      <TextPage
        id="goals"
        :title="goals.heading"
        :paragraphs="goals.paragraphs"
        :steps="goals.steps"
      />

      <ProjectsView id="projects" />
      <SkillsView id="skills" />
      <ExperienceView id="experience" />
      <GalleryView id="interests" />
      <ContactView id="contact" />
    </main>

    <SiteFooter @open-chess="openChess" @replay-intro="replayIntro" />
  </div>

  <ChessGate v-if="chessOpen" :reduced-motion="reduced" @close="closeChess" />

  <IntroSplash v-if="introActive" @reveal="onIntroReveal" @done="onIntroDone" />
</template>
