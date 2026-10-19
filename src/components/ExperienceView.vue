<script setup>
import { experience, education, certificates, SHOW_PLACEHOLDERS } from '../data/portfolio.js'
</script>

<template>
  <section class="section" tabindex="-1" aria-labelledby="experience-title">
    <div class="wrap split">
      <header class="heading">
        <h2 id="experience-title" class="section-title">Experience and education</h2>
      </header>

      <div class="stack">
        <div class="surface pad">
          <h3 class="block-title">Experience</h3>
          <ol class="register">
            <li v-for="job in experience" :key="job.role + job.period" :class="{ 'is-placeholder': job.placeholder }">
              <p class="when">{{ job.period }}</p>
              <div>
                <h4>{{ job.role }}</h4>
                <p v-if="job.org" class="org">{{ job.org }}</p>
                <p v-else-if="job.placeholder && SHOW_PLACEHOLDERS" class="org">
                  <span class="ph-tag">Placeholder</span> {{ job.orgNote }}
                </p>
                <p v-if="job.text" class="desc">{{ job.text }}</p>
              </div>
            </li>
          </ol>
        </div>

        <div class="surface pad">
          <h3 class="block-title">Education</h3>
          <ol class="register">
            <li v-for="item in education" :key="item.title">
              <p class="when">{{ item.period }}</p>
              <div>
                <h4>{{ item.title }}</h4>
                <p class="org">{{ item.org }}</p>
                <p v-if="item.text" class="desc">{{ item.text }}</p>
              </div>
            </li>
          </ol>
        </div>

        <div class="surface pad">
          <h3 class="block-title">Certificates</h3>
          <ul class="register certs">
            <li v-for="cert in certificates" :key="cert.title">
              <div class="cert-main">
                <h4>{{ cert.title }}</h4>
                <p class="desc">{{ cert.text }}</p>
              </div>
              <a class="cert-link" :href="cert.pdf" target="_blank" rel="noopener">
                View certificate
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
                <span class="sr-only">: {{ cert.title }} (PDF, opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
