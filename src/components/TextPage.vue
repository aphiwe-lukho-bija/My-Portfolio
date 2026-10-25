<script setup>
/* a two-column editorial section: heading pinned on the left, text on a
   quiet surface on the right. Used for About and Goals. */
defineProps({
  title: { type: String, required: true },
  paragraphs: { type: Array, required: true },
  highlights: { type: Array, default: null },
  steps: { type: Array, default: null }
})
</script>

<template>
  <section class="section" tabindex="-1" :aria-labelledby="`${$attrs.id}-title`">
    <div class="wrap split">
      <header class="heading">
        <h2 :id="`${$attrs.id}-title`" class="section-title">{{ title }}</h2>
      </header>

      <div class="surface pad">
        <div class="prose">
          <p v-for="(paragraph, i) in paragraphs" :key="i">{{ paragraph }}</p>
        </div>

        <ul v-if="highlights" class="chips">
          <li v-for="item in highlights" :key="item">{{ item }}</li>
        </ul>

        <!-- the goals are a genuine sequence, so they read as a timeline -->
        <ol v-if="steps" class="timeline">
          <li v-for="(step, i) in steps" :key="i">
            <h3>{{ step.title }}</h3>
            <p>{{ step.text }}</p>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>
