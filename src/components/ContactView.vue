<script setup>
import { computed, ref } from 'vue'
import { contact, person } from '../data/portfolio.js'

const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || ''

const name = ref('')
const email = ref('')
const message = ref('')
const honeypot = ref('')

const status = ref('idle')
const feedback = ref('')

const isSending = computed(() => status.value === 'sending')
const isConfigured = computed(() => Boolean(accessKey))

function mailtoHref() {
  const subject = encodeURIComponent(`Portfolio message from ${name.value.trim() || 'a visitor'}`)
  const body = encodeURIComponent(
    `${message.value.trim()}\n\n— ${name.value.trim() || 'A visitor'} (${email.value.trim()})`
  )
  return `mailto:${person.email}?subject=${subject}&body=${body}`
}

function resetForm() {
  name.value = ''
  email.value = ''
  message.value = ''
  honeypot.value = ''
}

async function sendMessage() {
  if (isSending.value) return

  const trimmedName = name.value.trim()
  const trimmedEmail = email.value.trim()
  const trimmedMessage = message.value.trim()

  // A filled honeypot means a bot; pretend it worked and send nothing.
  if (honeypot.value) {
    status.value = 'success'
    feedback.value = 'Thank you. Your message has been sent.'
    resetForm()
    return
  }

  // Without a Web3Forms key the site still works: hand the message to the
  // visitor's email app so it is never lost.
  if (!isConfigured.value) {
    window.location.href = mailtoHref()
    status.value = 'success'
    feedback.value = 'Your email app should open with the message ready to send.'
    resetForm()
    return
  }

  status.value = 'sending'
  feedback.value = ''

  try {
    // FormData keeps this a simple request, so the browser does not send a
    // CORS preflight that Web3Forms rejects.
    const payload = new FormData()
    payload.append('access_key', accessKey)
    payload.append('subject', `Portfolio message from ${trimmedName}`)
    payload.append('from_name', trimmedName)
    payload.append('name', trimmedName)
    payload.append('email', trimmedEmail)
    payload.append('replyto', trimmedEmail)
    payload.append('message', trimmedMessage)

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: payload
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok || result.success === false) {
      throw new Error(result.message || 'The message could not be sent.')
    }

    status.value = 'success'
    feedback.value = 'Thank you. Your message has been sent — I will get back to you soon.'
    resetForm()
  } catch (error) {
    status.value = 'error'
    feedback.value =
      error instanceof Error && error.message
        ? `${error.message} You can also email me directly at ${person.email}.`
        : `Something went wrong. Please email me directly at ${person.email}.`
  }
}
</script>

<template>
  <section class="section" tabindex="-1" aria-labelledby="contact-title">
    <div class="wrap contact-grid">
      <div class="contact-intro">
        <h2 id="contact-title" class="section-title">{{ contact.heading }}</h2>
        <p class="contact-lead">{{ contact.lead }}</p>

        <ul class="contact-list">
          <li v-for="item in contact.items" :key="item.label">
            <component
              :is="item.href ? 'a' : 'div'"
              :href="item.href || undefined"
              :target="item.href.startsWith('http') ? '_blank' : undefined"
              :rel="item.href.startsWith('http') ? 'noopener noreferrer' : undefined"
            >
              <span class="icon-wrap">
                <svg
                                  v-if="item.icon === 'mail'"
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="1.8"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  aria-hidden="true"
                                >
                                  <rect width="20" height="16" x="2" y="4" rx="2" />
                                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                </svg>
                <svg
                                  v-else-if="item.icon === 'linkedin'"
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="1.8"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                                  <rect width="4" height="12" x="2" y="9" />
                                  <circle cx="4" cy="4" r="2" />
                                </svg>
                <svg
                                  v-else-if="item.icon === 'github'"
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="1.8"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
                                  />
                                  <path d="M9 18c-4.51 2-5-2-7-2" />
                                </svg>
                <svg
                                  v-else
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="1.8"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                                  <circle cx="12" cy="10" r="3" />
                                </svg>
              </span>

              <span>
                <small>{{ item.label }}</small>
                <strong>{{ item.value }}</strong>
              </span>
            </component>
          </li>
        </ul>
      </div>

      <form class="surface contact-form" @submit.prevent="sendMessage">
        <label>
          Name
          <input
            v-model="name"
            type="text"
            autocomplete="name"
            placeholder="Your name"
            maxlength="80"
            required
          />
        </label>

        <label>
          Email
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            maxlength="160"
            required
          />
        </label>

        <label>
          Message
          <textarea
            v-model="message"
            placeholder="Tell me what you're working on..."
            maxlength="4000"
            required
          ></textarea>
        </label>

        <div class="hp-field" aria-hidden="true">
          <label>
            Leave this field empty
            <input v-model="honeypot" type="text" name="botcheck" tabindex="-1" autocomplete="off" />
          </label>
        </div>

        <button class="btn btn-primary" type="submit" :disabled="isSending">
          {{ isSending ? 'Sending…' : 'Send message' }}
        </button>

        <p
          v-if="feedback"
          class="form-feedback"
          :class="status === 'error' ? 'error' : 'success'"
          role="status"
          aria-live="polite"
        >
          {{ feedback }}
        </p>
      </form>
    </div>
  </section>
</template>
