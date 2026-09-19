<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#fff8f4_0%,#fffdfb_100%)]">
    <div class="pv-container max-w-6xl py-8 md:py-12">
      <div class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div class="space-y-4">
          <router-link :to="{ name: 'landing' }" class="pv-btn pv-btn-ghost">Voltar para a landing</router-link>

          <div class="rounded-[28px] bg-slate-950 p-6 text-white shadow-xl md:p-8">
            <div class="text-xs font-bold uppercase tracking-[0.3em] text-orange-300">Autocontratacao</div>
            <h1 class="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Ative sua loja e comece a vender agora.</h1>
            <p class="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
              Escolha o plano, crie sua empresa, receba o acesso do gerente e entre direto no painel para configurar a loja.
            </p>

            <div class="mt-6 grid gap-3 sm:grid-cols-2">
              <div v-for="item in checklist" :key="item" class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                {{ item }}
              </div>
            </div>

            <div class="mt-6 rounded-2xl bg-white/5 p-4 text-sm text-slate-300">
              <div class="font-bold text-white">Loja demonstrativa</div>
              <div class="mt-2">Quer ver antes? Abra o Central Sushi e depois volte para contratar.</div>
              <router-link class="pv-btn mt-4 bg-white text-slate-950 hover:bg-slate-100" :to="{ name: 'customer.menu', params: { restaurantSlug: 'centralsushi' } }">
                Ver demonstracao
              </router-link>
            </div>
          </div>
        </div>

        <div class="pv-card p-6 md:p-8">
          <div class="pv-subtitle">Criar conta</div>
          <h2 class="mt-1 text-3xl font-black tracking-tight text-slate-900">Comecar agora</h2>
          <div class="mt-4 grid grid-cols-3 gap-2">
            <div v-for="step in steps" :key="step.number" class="rounded-2xl border p-3 text-center" :class="stepStateClass(step.number)">
              <div class="text-xs font-black uppercase tracking-[0.2em]">{{ step.number }}</div>
              <div class="mt-1 text-xs font-bold">{{ step.label }}</div>
            </div>
          </div>

          <form class="mt-6 space-y-5" @submit.prevent="submit">
            <div>
              <div class="text-sm font-bold text-slate-900">Escolha seu plano</div>
              <div class="mt-3 grid gap-3 md:grid-cols-3">
                <button
                  v-for="plan in plans"
                  :key="plan.value"
                  type="button"
                  class="rounded-2xl border p-4 text-left transition"
                  :class="form.plan === plan.value ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'"
                  @click="form.plan = plan.value"
                >
                  <div class="text-xs font-bold uppercase tracking-[0.25em]" :class="form.plan === plan.value ? 'text-white/70' : 'text-slate-400'">
                    {{ plan.eyebrow }}
                  </div>
                  <div class="mt-2 text-lg font-black">{{ plan.name }}</div>
                  <div class="mt-1 text-sm" :class="form.plan === plan.value ? 'text-white/80' : 'text-slate-600'">{{ plan.price }}</div>
                  <div class="mt-3 text-xs leading-5" :class="form.plan === plan.value ? 'text-white/75' : 'text-slate-500'">{{ plan.description }}</div>
                </button>
              </div>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <input v-model.trim="form.restaurantName" class="pv-input" placeholder="Nome da loja ou empresa" />
              <div>
                <input v-model.trim="form.slug" class="pv-input" placeholder="Slug desejado (ex: centralsushi)" @input="slugTouched = true" />
                <div class="mt-2 text-xs text-slate-500">Link da loja: `{{ previewSlugUrl }}`</div>
              </div>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <input v-model.trim="form.whatsappNumber" class="pv-input" placeholder="WhatsApp com DDD" />
              <input v-model.trim="form.email" class="pv-input" placeholder="Email do gerente" />
            </div>

            <div class="relative">
              <input v-model.trim="form.password" :type="show ? 'text' : 'password'" class="pv-input pr-24" placeholder="Senha de acesso" />
              <button type="button" class="pv-btn pv-btn-ghost absolute right-2 top-2 px-3 py-2 text-xs" @click="show = !show">
                {{ show ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>

            <div class="grid gap-3 md:grid-cols-[1fr_0.9fr]">
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Ao concluir, a conta e criada na hora e voce entra direto no painel como gerente da loja.
              </div>
              <div class="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                <div class="text-xs font-bold uppercase tracking-[0.22em] text-orange-800">Resumo da contratação</div>
                <div class="mt-2 text-sm font-extrabold text-slate-900">{{ selectedPlan.name }}</div>
                <div class="mt-1 text-sm text-slate-700">{{ selectedPlan.description }}</div>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-4">
              <div class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Seu acesso vai ficar assim</div>
              <div class="mt-3 grid gap-2 md:grid-cols-3">
                <div class="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                  <div class="font-extrabold text-slate-900">Loja</div>
                  <div class="mt-1">`/{{ effectiveSlug || 'sualoja' }}`</div>
                </div>
                <div class="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                  <div class="font-extrabold text-slate-900">Painel</div>
                  <div class="mt-1">`/{{ effectiveSlug || 'sualoja' }}/admin`</div>
                </div>
                <div class="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                  <div class="font-extrabold text-slate-900">Gerente</div>
                  <div class="mt-1 truncate">{{ form.email || 'email@sualoja.com' }}</div>
                </div>
              </div>
            </div>

            <button :disabled="loading" class="pv-btn pv-btn-primary w-full py-4 text-base">
              {{ loading ? 'Criando sua empresa...' : 'Criar empresa e entrar no painel' }}
            </button>

            <div v-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{{ error }}</div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api/client'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const show = ref(false)
const loading = ref(false)
const error = ref(null)
const slugTouched = ref(false)

const form = reactive({
  restaurantName: '',
  slug: '',
  whatsappNumber: '',
  email: '',
  password: '',
  plan: 'PRO'
})

const plans = [
  { value: 'START', eyebrow: 'Entrada', name: 'Start', price: 'Plano inicial', description: 'Para quem quer começar com catálogo, pedidos e operação básica.' },
  { value: 'PRO', eyebrow: 'Mais pedido', name: 'Pro', price: 'Mais completo', description: 'Ideal para delivery em crescimento com gerente, entregador e personalizacao.' },
  { value: 'SCALE', eyebrow: 'Escala', name: 'Scale', price: 'Mais estrutura', description: 'Pensado para operacoes maiores e futuras automacoes e expansoes.' }
]

const checklist = [
  'Empresa criada automaticamente no sistema',
  'Usuario gerente liberado no mesmo instante',
  'Plano salvo na conta para futura cobranca recorrente',
  'Entrada direta no painel para configurar a loja'
]

const steps = [
  { number: 1, label: 'Plano' },
  { number: 2, label: 'Empresa' },
  { number: 3, label: 'Acesso' }
]

const selectedPlan = computed(() => plans.find((p) => p.value === form.plan) || plans[1])

const effectiveSlug = computed(() => {
  const raw = slugTouched.value ? form.slug : slugify(form.restaurantName)
  return slugify(raw)
})

const previewSlugUrl = computed(() => `${window.location.origin}/${effectiveSlug.value || 'sualoja'}`)

watch(
  () => form.restaurantName,
  (value) => {
    if (slugTouched.value) return
    form.slug = slugify(value)
  }
)

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function stepStateClass(step) {
  const current = !form.plan ? 1 : !form.restaurantName || !effectiveSlug.value ? 2 : 3
  if (step <= current) return 'border-slate-900 bg-slate-900 text-white'
  return 'border-slate-200 bg-white text-slate-500'
}

async function submit() {
  error.value = null
  if (!form.restaurantName || !form.email || !form.password) {
    error.value = 'Preencha nome da loja, email e senha.'
    return
  }

  loading.value = true
  try {
    const { data } = await api.post('/onboarding/signup', {
      restaurantName: form.restaurantName,
      slug: effectiveSlug.value || null,
      whatsappNumber: form.whatsappNumber || null,
      email: form.email,
      password: form.password,
      plan: form.plan
    })

    auth.setSession({ token: data.token, user: data.user })

    router.push({ name: 'admin.billing', params: { restaurantSlug: data.user.restaurantSlug }, query: { welcome: '1' } })
  } catch (e) {
    error.value = e?.response?.data?.message || 'Nao foi possivel criar sua empresa agora.'
  } finally {
    loading.value = false
  }
}
</script>
