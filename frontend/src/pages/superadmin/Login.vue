<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#fff8f4_0%,#fffdfb_100%)]">
    <div class="pv-container flex min-h-screen items-center">
      <div class="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div class="rounded-[28px] bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <div class="text-xs font-bold uppercase tracking-[0.3em] text-orange-300">Acesso único</div>
          <h1 class="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Entre com o mesmo login para operar todo o sistema.</h1>
          <p class="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
            O `PedeVisse` usa uma tela única de entrada. Depois do login, cada perfil cai automaticamente na área certa.
          </p>

          <div class="mt-6 grid gap-3">
            <div v-for="item in accessCards" :key="item.title" class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="text-sm font-extrabold text-white">{{ item.title }}</div>
              <div class="mt-1 text-sm text-slate-300">{{ item.description }}</div>
            </div>
          </div>

          <div class="mt-6 rounded-2xl bg-white/5 p-4">
            <div class="text-xs font-bold uppercase tracking-[0.22em] text-white/60">Fluxo após login</div>
            <div class="mt-3 flex flex-wrap gap-2">
              <span v-for="item in rolePills" :key="item" class="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200">
                {{ item }}
              </span>
            </div>
          </div>
        </div>

        <div class="pv-card w-full p-6 md:p-8">
          <div class="pv-subtitle">Acesso</div>
          <h2 class="pv-title">PedeVisse</h2>
          <div class="mt-2 text-sm text-slate-600">Entre como admin geral, gerente ou entregador.</div>

          <form class="mt-6 space-y-3" @submit.prevent="submit">
            <input v-model.trim="email" class="pv-input" placeholder="Email" />
            <div class="relative">
              <input v-model.trim="password" :type="show ? 'text' : 'password'" class="pv-input pr-24" placeholder="Senha" />
              <button type="button" class="pv-btn pv-btn-ghost absolute right-2 top-2 px-3 py-2 text-xs" @click="show = !show">
                {{ show ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
            <button :disabled="loading" class="pv-btn pv-btn-primary w-full py-4 text-base">
              {{ loading ? 'Entrando...' : 'Entrar no sistema' }}
            </button>
            <div v-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{{ error }}</div>
          </form>

          <div class="mt-6 grid gap-3 md:grid-cols-3">
            <div v-for="item in loginHints" :key="item.title" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{{ item.title }}</div>
              <div class="mt-2 text-sm font-bold text-slate-900">{{ item.text }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const show = ref(false)
const loading = ref(false)
const error = ref(null)

const accessCards = [
  { title: 'Admin geral', description: 'Controla empresas, usuarios, planos e visao global do SaaS.' },
  { title: 'Gerente', description: 'Recebe pedidos, organiza cardapio, configuracoes e relatorios da loja.' },
  { title: 'Entregador', description: 'Pega corridas, abre rota no mapa e finaliza entregas mais rapido.' }
]

const rolePills = ['Superadmin -> empresas', 'Gerente -> pedidos', 'Entregador -> entregas']

const loginHints = [
  { title: 'Tela única', text: 'Um login para todos os perfis internos' },
  { title: 'Redirecionamento', text: 'Cada usuário cai na área certa sozinho' },
  { title: 'Operação', text: 'Fluxo pronto para uso no dia a dia' }
]

onMounted(() => {
  auth.init()
  if (auth.token) {
    if (auth.user?.role === 'SUPER_ADMIN') router.push({ name: 'super.restaurants' })
    if (auth.user?.role === 'RESTAURANT_ADMIN' && auth.user?.restaurantSlug) {
      router.push({ name: 'admin.orders', params: { restaurantSlug: auth.user.restaurantSlug } })
    }
    if (auth.user?.role === 'DRIVER' && auth.user?.restaurantSlug) {
      router.push({ name: 'driver.deliveries', params: { restaurantSlug: auth.user.restaurantSlug } })
    }
  }
})

async function submit() {
  error.value = null
  loading.value = true
  try {
    await auth.login({ email: email.value, password: password.value })
    if (auth.user?.role === 'SUPER_ADMIN') {
      router.push({ name: 'super.restaurants' })
      return
    }
    if (auth.user?.role === 'RESTAURANT_ADMIN' && auth.user?.restaurantSlug) {
      router.push({ name: 'admin.orders', params: { restaurantSlug: auth.user.restaurantSlug } })
      return
    }
    if (auth.user?.role === 'DRIVER' && auth.user?.restaurantSlug) {
      router.push({ name: 'driver.deliveries', params: { restaurantSlug: auth.user.restaurantSlug } })
      return
    }
    error.value = 'Seu usuário não está associado a um restaurante.'
  } catch (e) {
    error.value = e?.response?.data?.message || 'Credenciais inválidas.'
  } finally {
    loading.value = false
  }
}
</script>
