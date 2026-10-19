<script setup>
import { skills, SHOW_PLACEHOLDERS } from '../data/portfolio.js'
</script>

<template>
  <section class="section" tabindex="-1" aria-labelledby="skills-title">
    <div class="wrap">
      <header class="heading heading-row">
        <h2 id="skills-title" class="section-title">Skills</h2>
        <p class="section-lead">Each skill sits next to the work or course that backs it up.</p>
      </header>

      <div class="ledgers">
        <section v-for="group in skills" :key="group.heading" class="surface ledger">
          <h3>{{ group.heading }}</h3>
          <p class="ledger-note">{{ group.note }}</p>
          <dl>
            <template v-for="item in group.items" :key="item.name">
              <div v-if="SHOW_PLACEHOLDERS || !item.placeholder" class="ledger-row" :class="{ 'is-placeholder': item.placeholder }">
                <dt>
                  <span v-if="item.placeholder" class="ph-tag">Placeholder</span>
                  {{ item.name }}
                </dt>
                <dd>{{ item.where }}</dd>
              </div>
            </template>
          </dl>
        </section>
      </div>
    </div>
  </section>
</template>
