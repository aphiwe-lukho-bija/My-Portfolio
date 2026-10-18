<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const links = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'goals', label: 'Goals' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'gallery', label: 'Interests' },
  { id: 'contact', label: 'Contact' }
]

const menuOpen = ref(false)
const activeId = ref('home')
const isDark = ref(false)

function goTo(id) {
  menuOpen.value = false
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

// flips the theme, saves the choice, and updates the html data attribute
// that all the css variables hang off
function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.dataset.theme = isDark.value ? 'dark' : 'light'
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

// whichever section has passed the upper third of the screen becomes active
function updateActive() {
  const marker = window.innerHeight * 0.35
  let current = 'home'

  for (const link of links) {
    const el = document.getElementById(link.id)
    if (el && el.getBoundingClientRect().top <= marker) {
      current = link.id
    }
  }

  activeId.value = current
}

onMounted(() => {
  // index.html already set data-theme before first paint — read it back
  isDark.value = document.documentElement.dataset.theme === 'dark'

  updateActive()
  window.addEventListener('scroll', updateActive, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateActive)
})
</script>

<template>
  <header class="top-bar">
    <button class="logo" @click="goTo('home')">Aphiwe<span>.</span></button>

    <nav class="desktop-nav">
      <button
        v-for="link in links"
        :key="link.id"
        :class="{ active: activeId === link.id }"
        @click="goTo(link.id)"
      >
        {{ link.label }}
      </button>
    </nav>

    <div class="nav-actions">
      <button
        class="theme-toggle"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="toggleTheme"
      >
        <!-- sun means "click for light", moon means "click for dark" -->
        <svg
          v-if="isDark"
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>

        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      </button>

      <button
        class="menu-toggle"
        aria-label="Toggle menu"
        :aria-expanded="menuOpen"
        @click="menuOpen = !menuOpen"
      >
        <span class="bar" :class="{ open: menuOpen }"></span>
      </button>
    </div>

    <Transition name="drop">
      <nav v-if="menuOpen" class="mobile-nav">
        <button
          v-for="link in links"
          :key="link.id"
          :class="{ active: activeId === link.id }"
          @click="goTo(link.id)"
        >
          {{ link.label }}
        </button>
      </nav>
    </Transition>
  </header>
</template>
