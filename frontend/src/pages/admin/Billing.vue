<template>
  <AppShell>
    <div class="pv-container max-w-6xl">
      <div class="pv-card pv-warm-panel p-5">
        <div class="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div class="min-w-0">
            <div class="pv-subtitle">Assinatura</div>
            <div class="pv-title truncate">{{ tenant.restaurant?.name || tenant.slug }}</div>
            <div class="mt-2 text-sm text-slate-600">Acompanhe o plano, regularize a conta e libere o painel automaticamente após o pagamento.</div>
          </div>
          <div class="text-sm text-slate-600">Plano e status da conta.</div>
        </div>
      </div>

      <div v-if="loading" class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="pv-card p-4">
          <div class="pv-skeleton h-4 w-24"></div>
          <div class="mt-4 flex gap-2">
            <div class="pv-skeleton h-8 w-20 rounded-full"></div>
            <div class="pv-skeleton h-8 w-24 rounded-full"></div>
          </div>
          <div class="mt-4 space-y-2">
            <div class="pv-skeleton h-4 w-full"></div>
            <div class="pv-skeleton h-4 w-4/5"></div>
            <div class="pv-skeleton h-4 w-3/5"></div>
          </div>
        </div>
        <div class="pv-card p-4">
          <div class="pv-skeleton h-4 w-28"></div>
          <div class="mt-4 grid gap-2 md:grid-cols-3">
            <div class="pv-skeleton h-24 w-full"></div>
            <div class="pv-skeleton h-24 w-full"></div>
            <div class="pv-skeleton h-24 w-full"></div>
          </div>
          <div class="mt-4 pv-skeleton h-14 w-full"></div>
          <div class="mt-4 space-y-2">
            <div class="pv-skeleton h-4 w-full"></div>
            <div class="pv-skeleton h-4 w-2/3"></div>
          </div>
        </div>
      </div>

      <div v-else class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="pv-card p-4">
          <div class="text-sm font-extrabold text-slate-900">Seu plano</div>
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <span class="pv-badge">{{ planLabel(plan) }}</span>
            <span class="pv-badge" :class="statusBadgeClass(status)">{{ statusLabel(status) }}</span>
          </div>
          <div class="mt-4 text-sm text-slate-700">
            Para usar o painel e receber pedidos, a assinatura precisa estar ativa. O pagamento abre o acesso automaticamente via webhook.
          </div>
        </div>

        <div class="pv-card p-4">
          <div class="text-sm font-extrabold text-slate-900">Pagamento</div>

          <div class="mt-4 grid gap-2 md:grid-cols-3">
            <button
              v-for="p in plans"
              :key="p.value"
              type="button"
              class="rounded-2xl border p-3 text-left text-sm font-bold transition"
              :class="selectedPlan === p.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'"
              @click="selectedPlan = p.value"
            >
              <div class="text-xs font-semibold uppercase tracking-[0.25em]" :class="selectedPlan === p.value ? 'text-white/70' : 'text-slate-400'">
                {{ p.label }}
              </div>
              <div class="mt-1">{{ p.name }}</div>
            </button>
          </div>

          <button :disabled="startingCheckout" class="pv-btn pv-btn-primary mt-4 w-full py-4 text-base" @click="startCheckout">
            {{ startingCheckout ? 'Abrindo checkout...' : 'Assinar agora' }}
          </button>

          <div class="mt-4 text-sm text-slate-700">
            Se preferir, você também pode falar com o suporte para ativação manual.
          </div>
          <a
            v-if="supportWhatsUrl"
            :href="supportWhatsUrl"
            target="_blank"
            rel="noreferrer"
            class="pv-btn mt-4 w-full bg-green-500 text-white hover:bg-green-600"
          >
            Falar no WhatsApp
          </a>
          <div v-else class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Suporte não configurado.
          </div>
        </div>
      </div>

      <div v-if="route.query.welcome === '1'" class="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        Conta criada. Agora finalize a assinatura para liberar o painel.
      </div>

      <div v-if="route.query.stripe === 'success'" class="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Pagamento iniciado. Assim que o Stripe confirmar, sua conta fica ativa automaticamente.
      </div>

      <div v-if="route.query.stripe === 'cancel'" class="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Checkout cancelado. Você pode tentar novamente quando quiser.
      </div>

      <div v-if="error" class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{{ error }}</div>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../../api/client'
import { useTenantStore } from '../../stores/tenant'
import { useUiStore } from '../../stores/ui'
import AppShell from '../../components/AppShell.vue'

const route = useRoute()
const tenant = useTenantStore()
const ui = useUiStore()

const loading = ref(false)
const error = ref(null)
const plan = ref('START')
const status = ref('ACTIVE')
const supportNumber = ref(null)
const selectedPlan = ref('PRO')
const startingCheckout = ref(false)

function slug() {
  return typeof route.params.restaurantSlug === 'string' ? route.params.restaurantSlug : null
}

const supportWhatsUrl = computed(() => {
  const n = String(supportNumber.value || '').replace(/\D/g, '')
  if (!n) return null
  const s = tenant.restaurant?.name || tenant.slug || 'sua loja'
  const text = encodeURIComponent(`Olá! Preciso de ajuda com a assinatura do ${s}.`)
  return `https://wa.me/${n}?text=${text}`
})

function planLabel(value) {
  if (value === 'PRO') return 'Pro'
  if (value === 'SCALE') return 'Scale'
  return 'Start'
}

function statusLabel(value) {
  if (value === 'TRIALING') return 'Trial'
  if (value === 'PAST_DUE') return 'Em atraso'
  if (value === 'CANCELED') return 'Cancelado'
  return 'Ativo'
}

function statusBadgeClass(value) {
  if (value === 'TRIALING') return 'bg-sky-100 text-sky-800'
  if (value === 'PAST_DUE') return 'bg-amber-100 text-amber-900'
  if (value === 'CANCELED') return 'bg-red-100 text-red-800'
  return 'bg-emerald-100 text-emerald-800'
}

const plans = [
  { value: 'START', label: 'Entrada', name: 'Start' },
  { value: 'PRO', label: 'Completo', name: 'Pro' },
  { value: 'SCALE', label: 'Escala', name: 'Scale' }
]

async function load() {
  const s = slug()
  if (!s) return
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get(`/t/${encodeURIComponent(s)}/admin/billing`)
    plan.value = data?.restaurant?.subscriptionPlan || 'START'
    status.value = data?.restaurant?.subscriptionStatus || 'ACTIVE'
    supportNumber.value = data?.supportWhatsAppNumber || null
    selectedPlan.value = plan.value || 'PRO'
  } catch (e) {
    error.value = e?.response?.data?.message || 'Erro ao carregar assinatura.'
    ui.toast({ message: error.value, type: 'error' })
  } finally {
    loading.value = false
  }
}

async function startCheckout() {
  const s = slug()
  if (!s) return
  startingCheckout.value = true
  error.value = null
  try {
    const { data } = await api.post(`/t/${encodeURIComponent(s)}/admin/billing/checkout`, { plan: selectedPlan.value })
    if (data?.url) {
      window.location.href = data.url
      return
    }
    error.value = 'Checkout indisponível.'
    ui.toast({ message: error.value, type: 'warning' })
  } catch (e) {
    error.value = e?.response?.data?.message || 'Não foi possível abrir o checkout.'
    ui.toast({ message: error.value, type: 'error' })
  } finally {
    startingCheckout.value = false
  }
}

onMounted(load)
</script>
