import { ref, onMounted, onBeforeUnmount } from 'vue'

/* tracks the visitor's "reduce motion" system setting, live */
export function useReducedMotion () {
  const reduced = ref(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  let query
  const update = (e) => { reduced.value = e.matches }

  onMounted(() => {
    query = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduced.value = query.matches
    query.addEventListener('change', update)
  })
  onBeforeUnmount(() => query && query.removeEventListener('change', update))

  return reduced
}
