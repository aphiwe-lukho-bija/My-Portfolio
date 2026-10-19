<script setup>
import { projects, SHOW_PLACEHOLDERS } from '../data/portfolio.js'

const visible = projects.filter((p) => SHOW_PLACEHOLDERS || !p.placeholder)
</script>

<template>
  <section class="section" tabindex="-1" aria-labelledby="projects-title">
    <div class="wrap">
      <header class="heading heading-row">
        <h2 id="projects-title" class="section-title">Projects</h2>
        <p class="section-lead">Case studies: what each project is for, the problem, what I built and why.</p>
      </header>

      <div class="cases">
        <article
          v-for="project in visible"
          :key="project.id"
          class="surface case"
          :class="{ 'is-placeholder': project.placeholder }"
        >
          <div class="case-story">
            <p class="case-kind">
              <span v-if="project.placeholder" class="ph-tag">Placeholder</span>
              {{ project.kind }}
            </p>
            <h3 class="case-title">{{ project.title }}</h3>

            <dl class="story">
              <div>
                <dt>Purpose</dt>
                <dd>{{ project.purpose }}</dd>
              </div>
              <div>
                <dt>Problem</dt>
                <dd>{{ project.problem }}</dd>
              </div>
              <div>
                <dt>My contribution</dt>
                <dd>{{ project.contribution }}</dd>
              </div>
            </dl>

            <p v-if="project.prompt" class="case-prompt">{{ project.prompt }}</p>
          </div>

          <div class="case-spec">
            <div v-if="project.technologies.length" class="spec-block">
              <h4>Technologies</h4>
              <ul class="tech">
                <li v-for="tech in project.technologies" :key="tech">{{ tech }}</li>
              </ul>
            </div>

            <div class="spec-block">
              <h4>Technical decisions</h4>
              <ul class="decisions">
                <li v-for="d in project.decisions" :key="d">{{ d }}</li>
              </ul>
            </div>

            <div class="spec-block">
              <h4>Links</h4>
              <ul class="case-links">
                <li v-for="link in project.links" :key="link.label">
                  <a v-if="!link.placeholder" :href="link.href" target="_blank" rel="noopener noreferrer">
                    {{ link.label }}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M7 17 17 7M9 7h8v8" />
                    </svg>
                  </a>
                  <span v-else class="ph-line">
                    <span class="ph-tag">Placeholder</span>
                    {{ link.label }}: {{ link.note }}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
