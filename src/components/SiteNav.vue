<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { person } from '../data/portfolio.js'

const emit = defineEmits(['open-chess', 'replay-intro'])

const links = [
  { id: 'about', label: 'About' },
  { id: 'goals', label: 'Goals' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'interests', label: 'Interests' },
  { id: 'contact', label: 'Contact' }
]

const menuOpen = ref(false)
const activeId = ref('home')
const scrolled = ref(false)

/* scrolls to a section, tells the background a transition happened, and
   moves keyboard focus there so screen-reader users land in the right place */
function goTo (id) {
  menuOpen.value = false
  const el = document.getElementById(id)
  if (!el) return
  window.dispatchEvent(new CustomEvent('portfolio:navigate', { detail: { id } }))
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
  el.focus({ preventScroll: true })
  history.replaceState(null, '', id === 'home' ? location.pathname : `#${id}`)
}

// whichever section has passed the upper third of the screen becomes active
let ticking = false
function updateActive () {
  ticking = false
  scrolled.value = window.scrollY > 24
  const marker = window.innerHeight * 0.35
  let current = 'home'
  for (const link of links) {
    const el = document.getElementById(link.id)
    if (el && el.getBoundingClientRect().top <= marker) current = link.id
  }
  activeId.value = current
}

function onScroll () {
  if (!ticking) {
    ticking = true
    requestAnimationFrame(updateActive)
  }
}

function onKey (e) {
  if (e.key === 'Escape') menuOpen.value = false
}

onMounted(() => {
  updateActive()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <header class="top-bar" :class="{ 'is-scrolled': scrolled || menuOpen }">
    <div class="bar-inner">
      <a class="logo" href="#home" aria-label="Aphiwe Lukho Bija, back to top" @click.prevent="goTo('home')">
        <span class="logo-mark">{{ person.monogram }}</span>
        <span class="logo-name">{{ person.name }}</span>
      </a>

      <nav class="desktop-nav" aria-label="Primary">
        <a
          v-for="link in links"
          :key="link.id"
          :href="`#${link.id}`"
          :class="{ active: activeId === link.id }"
          :aria-current="activeId === link.id ? 'location' : undefined"
          @click.prevent="goTo(link.id)"
        >
          {{ link.label }}
        </a>
      </nav>

      <div class="nav-actions">
        <!-- always reachable: the chess scene is optional, never in the way -->
        <button class="chess-link" type="button" aria-label="The Next Move: open the chess experience" @click="emit('open-chess')">
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <rect x="1" y="1" width="6" height="6" fill="currentColor" opacity="0.95" />
            <rect x="9" y="1" width="6" height="6" fill="currentColor" opacity="0.3" />
            <rect x="1" y="9" width="6" height="6" fill="currentColor" opacity="0.3" />
            <rect x="9" y="9" width="6" height="6" fill="currentColor" opacity="0.95" />
          </svg>
          <span>The Next Move</span>
        </button>

        <!-- the opening film, always one click away -->
        <button
          class="intro-link"
          type="button"
          aria-label="Watch the opening film"
          title="Watch the opening film"
          @click="emit('replay-intro')"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" opacity="0.45" />
            <path d="M6.6 5.1 11 8l-4.4 2.9V5.1z" fill="currentColor" />
          </svg>
          <span>Intro</span>
        </button>

        <button
          class="menu-toggle"
          type="button"
          aria-label="Menu"
          aria-controls="mobile-nav"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <span class="bar" :class="{ open: menuOpen }"></span>
        </button>
      </div>
    </div>

    <Transition name="drop">
      <nav v-if="menuOpen" id="mobile-nav" class="mobile-nav" aria-label="Primary">
        <a
          v-for="link in links"
          :key="link.id"
          :href="`#${link.id}`"
          :class="{ active: activeId === link.id }"
          @click.prevent="goTo(link.id)"
        >
          {{ link.label }}
        </a>
      </nav>
    </Transition>
  </header>
</template>
