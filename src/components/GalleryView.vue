<script setup>
import { interests } from '../data/portfolio.js'
</script>

<template>
  <section class="section" tabindex="-1" aria-labelledby="interests-title">
    <div class="wrap">
      <header class="heading heading-row">
        <h2 id="interests-title" class="section-title">{{ interests.heading }}</h2>
        <p class="section-lead">{{ interests.lead }}</p>
      </header>

      <div class="plates">
        <figure v-for="item in interests.items" :key="item.title" class="plate">
          <div class="plate-img">
            <img :src="item.img" :alt="item.title" loading="lazy" decoding="async" />
          </div>
          <figcaption>
            <h3>{{ item.title }}</h3>
            <p>{{ item.text }}</p>
          </figcaption>
        </figure>
      </div>
    </div>
  </section>
</template>
