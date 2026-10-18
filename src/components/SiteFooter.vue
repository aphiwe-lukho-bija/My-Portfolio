<script setup>
function goTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <footer>
    <div class="footer-inner">
      <p>© 2026 Aphiwe Lukho Bija</p>

      <div class="footer-links">
        <button @click="goTo('certificates')">Certificates</button>
        <button @click="goTo('gallery')">Interests</button>
        <button @click="goTo('contact')">Contact</button>
      </div>
    </div>
  </footer>
</template>
