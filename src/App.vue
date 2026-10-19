<script setup>
import { ref, onMounted, nextTick, defineAsyncComponent } from 'vue'

import LivingBackground from './components/LivingBackground.vue'
import SiteNav from './components/SiteNav.vue'
import SiteFooter from './components/SiteFooter.vue'
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
  // starts the one orchestrated arrival: the name reveals as the ribbon passes
  requestAnimationFrame(() => document.documentElement.classList.add('is-ready'))
})
</script>

<template>
  <LivingBackground :paused="chessOpen" :reduced-motion="reduced" />

  <a class="skip-link" href="#main">Skip to content</a>

  <div class="app-shell" :inert="chessOpen ? '' : null">
    <SiteNav @open-chess="openChess" />

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

    <SiteFooter @open-chess="openChess" />
  </div>

  <ChessGate v-if="chessOpen" :reduced-motion="reduced" @close="closeChess" />
</template>
