<script setup>
import { person, heroFacts } from '../data/portfolio.js'

const emit = defineEmits(['open-chess'])

function goTo (id) {
  window.dispatchEvent(new CustomEvent('portfolio:navigate', { detail: { id } }))
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const el = document.getElementById(id)
  el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
  el?.focus({ preventScroll: true })
}
</script>

<template>
  <section class="hero" tabindex="-1" aria-labelledby="hero-name">
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <h1 id="hero-name" class="hero-name">
          <span class="line"><span>Aphiwe Lukho</span></span>
          <span class="line"><span>Bija</span></span>
        </h1>

        <p class="hero-title">{{ person.title }}</p>
        <p class="hero-intro">{{ person.intro }}</p>

        <div class="hero-actions">
          <a class="btn btn-primary" href="#projects" @click.prevent="goTo('projects')">Explore My Work</a>
          <a class="btn btn-ghost" href="#contact" @click.prevent="goTo('contact')">Get in Touch</a>
          <button class="chess-cta" type="button" @click="emit('open-chess')">
            <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
              <rect x="1" y="1" width="6" height="6" fill="currentColor" opacity="0.95" />
              <rect x="9" y="1" width="6" height="6" fill="currentColor" opacity="0.3" />
              <rect x="1" y="9" width="6" height="6" fill="currentColor" opacity="0.3" />
              <rect x="9" y="9" width="6" height="6" fill="currentColor" opacity="0.95" />
            </svg>
            Enter the Chess Experience
          </button>
        </div>
      </div>

      <figure class="hero-portrait">
        <div class="bezel">
          <div class="bezel-inner">
            <img :src="person.photo" :alt="person.photoAlt" width="1000" height="1333" fetchpriority="high" />
          </div>
        </div>
        <figcaption class="plaque">
          <strong>Currently</strong>
          {{ person.currently }}
        </figcaption>
      </figure>
    </div>

    <dl class="wrap hero-facts">
      <div v-for="fact in heroFacts" :key="fact.label">
        <dt>{{ fact.label }}</dt>
        <dd>{{ fact.value }}</dd>
      </div>
    </dl>
  </section>
</template>
