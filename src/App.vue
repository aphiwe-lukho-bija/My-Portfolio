<script setup>
import { onMounted, ref } from 'vue'

import ChessIntro from './components/ChessIntro.vue'
import SiteNav from './components/SiteNav.vue'
import SiteFooter from './components/SiteFooter.vue'
import HomeView from './components/HomeView.vue'
import TextPage from './components/TextPage.vue'
import GalleryView from './components/GalleryView.vue'
import CertificatesView from './components/CertificatesView.vue'
import ContactView from './components/ContactView.vue'

// the cinematic 3D chess intro plays first; when it emits done,
// the real portfolio fades in underneath. After that the chess scene
// can be brought back on demand from the toolbar button (looping until
// it is closed again).
const showIntro = ref(true)
const siteReady = ref(false)
const introFinished = ref(false)

function onIntroDone () {
  showIntro.value = false
  if (!introFinished.value) {
    introFinished.value = true
    requestAnimationFrame(() => { siteReady.value = true })
  }
}

function openChess () {
  showIntro.value = true
}

// the text for the about page
const aboutParagraphs = [
  'I am a 23-year-old software development intern building practical experience through real-world coding projects.',
  'I enjoy solving problems, learning new technologies, and creating applications that provide real-world value. Communication is one of my strengths, and I enjoy presenting technical concepts clearly.',
  'Coding puts me in a flow state. Every challenge is an opportunity to grow, every mistake is a lesson, and every solution reminds me how rewarding persistence can be.',
  'Alongside my studies, I completed training as a GBVF Ambassador, strengthening my leadership, advocacy, and communication skills.'
]

const aboutHighlights = [
  '23 years old',
  'Software development intern',
  'GBVF Ambassador',
  'Clear communicator'
]

// the text for the goals page
const goalsParagraphs = [
  'My goal is to excel in my software development internship and keep growing through disciplined daily habits.',
  'I am drawn to the connection between technology and business. After completing my course, I plan to expand my skills into Data Engineering.',
  'I want to contribute to improving the lives of South Africans through meaningful technological solutions and eventually create employment opportunities in tech.'
]

// the same goals, turned into a short timeline
const goalsSteps = [
  {
    title: 'Grow as an intern',
    text: 'Make the most of my software development internship through disciplined daily habits.'
  },
  {
    title: 'Grow into Data Engineering',
    text: 'Expand my skills where technology and business meet, starting with data engineering.'
  },
  {
    title: 'Build for my community',
    text: 'Create meaningful solutions for South Africans and eventually open doors for others in tech.'
  }
]

// every section fades up as it enters the screen. The reveal-ready class is
// only added when vue has loaded, so the content still shows if js fails.
onMounted(() => {
  document.documentElement.classList.add('reveal-ready')

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.1, rootMargin: '0px 0px -5% 0px' }
  )

  document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el))
})
</script>

<template>
  <ChessIntro v-if="showIntro" :manual="introFinished" @done="onIntroDone" />

  <button
    v-if="siteReady && !showIntro"
    class="chess-fab"
    type="button"
    title="Show the chess scene"
    @click="openChess"
  >
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" fill="currentColor" opacity="0.9" />
      <rect x="9" y="1" width="6" height="6" fill="currentColor" opacity="0.35" />
      <rect x="1" y="9" width="6" height="6" fill="currentColor" opacity="0.35" />
      <rect x="9" y="9" width="6" height="6" fill="currentColor" opacity="0.9" />
    </svg>
    Chess scene
  </button>

  <div class="app-shell" :class="{ 'site-in': siteReady }">
    <SiteNav />

    <!-- one continuous page: every section is stacked and the nav scrolls
         to each one by id (home, about, goals, gallery, contact) -->
    <main>
      <HomeView id="home" />

      <TextPage
        id="about"
        eyebrow="The person behind the code"
        title="About me"
        :paragraphs="aboutParagraphs"
        :highlights="aboutHighlights"
      />

      <TextPage
        id="goals"
        eyebrow="The road ahead"
        title="My goals"
        :paragraphs="goalsParagraphs"
        :steps="goalsSteps"
      />

      <CertificatesView />

      <GalleryView id="gallery" title="My interests" />

      <ContactView id="contact" title="Contact me" />
    </main>

    <SiteFooter />
  </div>
</template>
