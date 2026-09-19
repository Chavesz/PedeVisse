<template>
  <a
    v-if="whatsUrl"
    :href="whatsUrl"
    target="_blank"
    rel="noreferrer"
    class="fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-2xl bg-green-500 px-4 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-black/5 transition hover:bg-green-600"
  >
    <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
    WhatsApp
  </a>
</template>

<script setup>
import { computed } from 'vue'
import { useTenantStore } from '../stores/tenant'

const tenant = useTenantStore()

const whatsUrl = computed(() => {
  const phone = tenant.restaurant?.whatsappNumber
  if (!phone) return null
  const text = encodeURIComponent('Olá! Tenho uma dúvida sobre os produtos da loja.')
  return `https://wa.me/${phone}?text=${text}`
})
</script>
