<script setup>
import cyberPdf from '../../pictures/Introduction_to_Cybersecurity_certificate_aphiwelukhobija-gmail-com_a4805615-39f0-4a56-b456-e5fd8893cecb.pdf'
import dataPdf from '../../pictures/Introduction_to_Data_Science_certificate_aphiwelukhobija-gmail-com_8091f3fc-f7a0-4392-b7b9-2f954c3c66fd.pdf'

const certs = [
  {
    num: '01',
    title: 'Introduction to Cybersecurity',
    text: 'Foundations of online safety, threat awareness and secure behaviour — completed as part of my continuous professional development.',
    meta: 'Certificate of completion',
    pdf: cyberPdf
  },
  {
    num: '02',
    title: 'Introduction to Data Science',
    text: 'Core data science concepts — data handling, analysis and the role of data in decision-making — supporting my path toward Data Engineering.',
    meta: 'Certificate of completion',
    pdf: dataPdf
  }
]
</script>

<template>
  <section class="content-view" id="certificates">
    <header class="gallery-head" data-reveal>
      <p class="eyebrow">Verified learning</p>
      <h1>Certificates</h1>
      <p>Courses I have completed beyond my studies, each with a full certificate to back it up.</p>
    </header>

    <div class="cert-grid" data-reveal>
      <article v-for="cert in certs" :key="cert.title" class="cert-card">
        <div class="cert-top">
          <span class="seal" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6">
              <circle cx="24" cy="21" r="13" />
              <circle cx="24" cy="21" r="9.2" />
              <path d="m20 21 3 3 5.5-6" stroke-linecap="round" stroke-linejoin="round" />
              <path d="m19 33-2 9 7-3.4L31 42l-2-9" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <span class="card-num">{{ cert.num }}</span>
        </div>

        <h2>{{ cert.title }}</h2>
        <p>{{ cert.text }}</p>

        <div class="cert-foot">
          <span class="cert-meta">{{ cert.meta }}</span>
          <a class="cert-link" :href="cert.pdf" target="_blank" rel="noopener">
            View certificate
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </a>
        </div>
      </article>
    </div>
  </section>
</template>
