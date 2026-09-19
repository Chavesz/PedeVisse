<template>
  <div class="min-h-screen bg-slate-50">
    <div class="pv-container flex min-h-screen items-center">
      <div class="pv-card w-full p-6 md:mx-auto md:max-w-md md:p-8">
        <div class="pv-subtitle">Acesso</div>
        <h1 class="pv-title">PedeVisse</h1>
        <div class="mt-2 text-sm text-slate-600">Use a tela única de login.</div>
        <router-link class="pv-btn pv-btn-primary mt-6 w-full" :to="{ name: 'login' }">Ir para login</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
onMounted(() => router.replace({ name: 'login' }))
</script>
