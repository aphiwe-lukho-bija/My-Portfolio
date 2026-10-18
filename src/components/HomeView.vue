<script setup>
import profileImg from '../../pictures/profile.jpg'

function goTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <section class="hero">
    <div class="hero-copy" data-reveal>
      <p class="eyebrow">Aspiring software developer</p>

      <h1>
        Aphiwe Lukho<br />
        <em>Bija.</em>
      </h1>

      <p class="lead">
        I'm a 23-year-old developer who enjoys solving problems, learning new
        technologies, and building applications that provide real-world value.
        Coding puts me in a flow state — every challenge is an opportunity to grow.
      </p>

      <div class="hero-actions">
        <button class="primary" @click="goTo('contact')">
          Let's talk <span>→</span>
        </button>
        <button class="ghost" @click="goTo('about')">About me</button>
      </div>
    </div>

    <div class="hero-visual" data-reveal>
      <div class="hero-image">
        <img :src="profileImg" alt="Aphiwe Lukho Bija" />
      </div>

      <aside class="image-note">
        <strong>Currently</strong>
        Working as a software development intern.
      </aside>
    </div>
  </section>
</template>
