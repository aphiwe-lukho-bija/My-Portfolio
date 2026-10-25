<script setup>
import { person } from '../data/portfolio.js'

const emit = defineEmits(['open-chess', 'replay-intro'])

function goTo (id) {
  window.dispatchEvent(new CustomEvent('portfolio:navigate', { detail: { id } }))
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
}
</script>

<template>
  <footer class="site-footer">
    <div class="wrap footer-inner">
      <p>© 2026 {{ person.name }}</p>
      <nav class="footer-links" aria-label="Footer">
        <a href="#projects" @click.prevent="goTo('projects')">Projects</a>
        <a href="#experience" @click.prevent="goTo('experience')">Experience</a>
        <a href="#contact" @click.prevent="goTo('contact')">Contact</a>
        <button type="button" @click="emit('replay-intro')">Watch the Intro</button>
        <button type="button" @click="emit('open-chess')">The Next Move</button>
      </nav>
    </div>
  </footer>
</template>
