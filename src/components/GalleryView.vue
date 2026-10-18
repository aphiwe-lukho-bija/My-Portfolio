<script setup>
import readingImg from '../../pictures/reading.jpg'
import soccerImg from '../../pictures/soccer.jpg'
import programmingImg from '../../pictures/programming.jpg'
import amapianoImg from '../../pictures/amapiano.jpg'
import runningImg from '../../pictures/running.jpg'
import speakingImg from '../../pictures/public-speaking.jpg'

defineProps({
  title: { type: String, required: true }
})

const cards = [
  {
    title: 'Reading & Self Development',
    text: 'Reading puts me in a flow state. I enjoy learning from self-development books.',
    img: readingImg
  },
  {
    title: 'Soccer',
    text: 'I support Manchester City and never miss the chance to watch my team play.',
    img: soccerImg
  },
  {
    title: 'Programming',
    text: 'Coding is more than a career to me. I love solving problems and building useful things.',
    img: programmingImg
  },
  {
    title: 'Amapiano Music',
    text: 'I enjoy relaxed Amapiano by Kelvin Momo and Kabza De Small.',
    img: amapianoImg
  },
  {
    title: 'Long Distance Running',
    text: 'Health is wealth, so I stay fit with long-distance treadmill runs.',
    img: runningImg
  },
  {
    title: 'Public Speaking',
    text: 'GBVF Ambassador training strengthened my confidence and presentation skills.',
    img: speakingImg
  }
]
</script>

<template>
  <section class="content-view">
    <header class="gallery-head" data-reveal>
      <p class="eyebrow">A little more about me</p>
      <h1>{{ title }}</h1>
      <p>The things that keep me curious, focused, and inspired.</p>
    </header>

    <div class="interest-grid" data-reveal>
      <article v-for="(card, i) in cards" :key="card.title" class="interest-card">
        <div class="card-img">
          <img :src="card.img" :alt="card.title" />
        </div>
        <div class="card-body">
          <span class="card-num">0{{ i + 1 }}</span>
          <h2>{{ card.title }}</h2>
          <p>{{ card.text }}</p>
        </div>
      </article>
    </div>
  </section>
</template>
