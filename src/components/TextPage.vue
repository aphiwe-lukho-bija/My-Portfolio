<script setup>
defineProps({
  eyebrow: { type: String, required: true },
  title: { type: String, required: true },
  paragraphs: { type: Array, required: true },
  highlights: { type: Array, default: null },
  steps: { type: Array, default: null }
})
</script>

<template>
  <section class="content-view">
    <div class="narrow" data-reveal>
      <header class="section-heading">
        <p class="eyebrow">{{ eyebrow }}</p>
        <h1>{{ title }}</h1>
      </header>

      <div class="content-col">
        <div class="prose">
          <p v-for="(paragraph, i) in paragraphs" :key="i">{{ paragraph }}</p>
        </div>

        <ul v-if="highlights" class="highlights">
          <li v-for="item in highlights" :key="item">{{ item }}</li>
        </ul>

        <ol v-if="steps" class="timeline">
          <li v-for="(step, i) in steps" :key="i">
            <span class="step-num">0{{ i + 1 }}</span>
            <div>
              <h2>{{ step.title }}</h2>
              <p>{{ step.text }}</p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>
