<template>
  <AppShell>
    <div class="pv-container max-w-6xl">
      <div class="pv-card pv-warm-panel p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="pv-subtitle">Super Admin</div>
            <div class="pv-title">Restaurantes</div>
            <div class="mt-2 text-sm text-slate-600">Cadastre, filtre e acompanhe a situação das empresas do SaaS em um só lugar.</div>
          </div>
          <div class="text-sm text-slate-600">Cadastre e edite empresas.</div>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Empresas</div>
            <div class="mt-2 text-3xl font-black text-slate-950">{{ restaurants.length }}</div>
          </div>
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Ativas</div>
            <div class="mt-2 text-3xl font-black text-slate-950">{{ activeCount }}</div>
          </div>
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Trial</div>
            <div class="mt-2 text-3xl font-black text-slate-950">{{ trialCount }}</div>
          </div>
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Em atraso</div>
            <div class="mt-2 text-3xl font-black text-slate-950">{{ pastDueCount }}</div>
          </div>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="pv-card p-4">
          <div class="text-sm font-extrabold text-slate-900">Criar restaurante</div>
          <form class="mt-4 space-y-3" @submit.prevent="create">
            <input v-model.trim="form.name" class="pv-input" placeholder="Nome" />
            <input v-model.trim="form.slug" class="pv-input" placeholder="Slug (ex: sushidoze)" />
            <input v-model.trim="form.whatsappNumber" class="pv-input" placeholder="WhatsApp (somente números, DDI+DDD+Número)" />
            <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
              <select v-model="form.subscriptionPlan" class="pv-select">
                <option value="START">Start</option>
                <option value="PRO">Pro</option>
                <option value="SCALE">Scale</option>
              </select>
              <select v-model="form.subscriptionStatus" class="pv-select">
                <option value="ACTIVE">Ativo</option>
                <option value="TRIALING">Trial</option>
                <option value="PAST_DUE">Em atraso</option>
                <option value="CANCELED">Cancelado</option>
              </select>
            </div>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label class="rounded-2xl border border-slate-200 bg-white p-4">
                <div class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Cor primária</div>
                <div class="mt-3 flex items-center gap-3">
                  <input v-model="form.themePrimary" type="color" class="h-14 w-16 cursor-pointer rounded-xl border-0 bg-transparent p-0" />
                  <input v-model.trim="form.themePrimary" class="pv-input" placeholder="#FF4D00" />
                </div>
              </label>
              <label class="rounded-2xl border border-slate-200 bg-white p-4">
                <div class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Cor secundária</div>
                <div class="mt-3 flex items-center gap-3">
                  <input v-model="form.themeSecondary" type="color" class="h-14 w-16 cursor-pointer rounded-xl border-0 bg-transparent p-0" />
                  <input v-model.trim="form.themeSecondary" class="pv-input" placeholder="#222222" />
                </div>
              </label>
            </div>
            <button class="pv-btn pv-btn-primary w-full">Criar</button>
          </form>
        </div>

        <div class="pv-card p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="text-sm font-extrabold text-slate-900">Lista</div>
            <div class="flex flex-wrap gap-2">
              <input v-model.trim="search" class="pv-input min-w-[220px]" placeholder="Buscar nome, slug ou WhatsApp..." />
              <select v-model="statusFilter" class="pv-select min-w-[180px]">
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativo</option>
                <option value="TRIALING">Trial</option>
                <option value="PAST_DUE">Em atraso</option>
                <option value="CANCELED">Cancelado</option>
              </select>
            </div>
          </div>
          <div class="mt-4 space-y-3">
            <div v-for="r in visibleRestaurants" :key="r.id" class="rounded-2xl border border-slate-200 bg-white p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-extrabold text-slate-900">{{ r.name }}</div>
                  <div class="mt-1 text-xs text-slate-600">/{{ r.slug }} · {{ r.whatsappNumber || '-' }}</div>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <span class="pv-badge">{{ planLabel(r.subscriptionPlan) }}</span>
                    <span class="pv-badge" :class="statusBadgeClass(r.subscriptionStatus)">{{ statusLabel(r.subscriptionStatus) }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <router-link class="pv-btn pv-btn-ghost px-3 py-2" :to="{ name: 'customer.menu', params: { restaurantSlug: r.slug } }">
                    Ver loja
                  </router-link>
                  <button class="pv-btn pv-btn-ghost px-3 py-2" @click="toggleEdit(r)">{{ r._editing ? 'Fechar' : 'Editar' }}</button>
                  <button class="pv-btn px-3 py-2 text-red-700 hover:bg-red-50" @click="remove(r.id)">Deletar</button>
                </div>
              </div>

              <div v-if="r._editing" class="mt-4 space-y-3">
                <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <input v-model.trim="r.name" class="pv-input" placeholder="Nome" />
                  <input v-model.trim="r.slug" class="pv-input" placeholder="Slug" />
                </div>
                <input v-model.trim="r.whatsappNumber" class="pv-input" placeholder="WhatsApp (somente números)" />
                <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <select v-model="r.subscriptionPlan" class="pv-select">
                    <option value="START">Start</option>
                    <option value="PRO">Pro</option>
                    <option value="SCALE">Scale</option>
                  </select>
                  <select v-model="r.subscriptionStatus" class="pv-select">
                    <option value="ACTIVE">Ativo</option>
                    <option value="TRIALING">Trial</option>
                    <option value="PAST_DUE">Em atraso</option>
                    <option value="CANCELED">Cancelado</option>
                  </select>
                </div>
                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label class="rounded-2xl border border-slate-200 bg-white p-4">
                    <div class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Cor primária</div>
                    <div class="mt-3 flex items-center gap-3">
                      <input v-model="r.themePrimary" type="color" class="h-14 w-16 cursor-pointer rounded-xl border-0 bg-transparent p-0" />
                      <input v-model.trim="r.themePrimary" class="pv-input" placeholder="#FF4D00" />
                    </div>
                  </label>
                  <label class="rounded-2xl border border-slate-200 bg-white p-4">
                    <div class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Cor secundária</div>
                    <div class="mt-3 flex items-center gap-3">
                      <input v-model="r.themeSecondary" type="color" class="h-14 w-16 cursor-pointer rounded-xl border-0 bg-transparent p-0" />
                      <input v-model.trim="r.themeSecondary" class="pv-input" placeholder="#222222" />
                    </div>
                  </label>
                </div>
                <button class="pv-btn pv-btn-primary w-full" @click="save(r)">Salvar alterações</button>
              </div>
            </div>
            <div v-if="visibleRestaurants.length === 0" class="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
              <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-[color:var(--pv-primary-strong)]">
                <svg viewBox="0 0 24 24" class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 10v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
                </svg>
              </div>
              <div class="mt-4 text-lg font-black text-slate-950">Nenhuma empresa encontrada</div>
              <div class="mt-2 text-sm text-slate-600">Tente mudar a busca, o status da assinatura ou cadastre uma nova empresa no SaaS.</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="error" class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{{ error }}</div>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '../../api/client'
import { useUiStore } from '../../stores/ui'
import AppShell from '../../components/AppShell.vue'

const restaurants = ref([])
const error = ref(null)
const search = ref('')
const statusFilter = ref('ALL')
const ui = useUiStore()

const form = reactive({
  name: '',
  slug: '',
  whatsappNumber: '',
  subscriptionPlan: 'START',
  subscriptionStatus: 'ACTIVE',
  themePrimary: '#0ea5e9',
  themeSecondary: '#0f172a'
})

const activeCount = computed(() => restaurants.value.filter((r) => r.subscriptionStatus === 'ACTIVE').length)
const trialCount = computed(() => restaurants.value.filter((r) => r.subscriptionStatus === 'TRIALING').length)
const pastDueCount = computed(() => restaurants.value.filter((r) => r.subscriptionStatus === 'PAST_DUE').length)

const visibleRestaurants = computed(() => {
  const q = String(search.value || '').trim().toLowerCase()
  return restaurants.value.filter((r) => {
    if (statusFilter.value !== 'ALL' && r.subscriptionStatus !== statusFilter.value) return false
    if (!q) return true
    return (
      String(r.name || '').toLowerCase().includes(q) ||
      String(r.slug || '').toLowerCase().includes(q) ||
      String(r.whatsappNumber || '').toLowerCase().includes(q)
    )
  })
})

async function load() {
  const { data } = await api.get('/superadmin/restaurants')
  restaurants.value = data.restaurants.map((r) => ({ ...r, _editing: false }))
}

async function create() {
  error.value = null
  await api.post('/superadmin/restaurants', { ...form })
  form.name = ''
  form.slug = ''
  form.whatsappNumber = ''
  form.subscriptionPlan = 'START'
  form.subscriptionStatus = 'ACTIVE'
  await load()
  ui.toast({ message: 'Empresa criada com sucesso.' })
}

async function remove(id) {
  await api.delete(`/superadmin/restaurants/${id}`)
  await load()
  ui.toast({ message: 'Empresa removida.' })
}

function toggleEdit(r) {
  r._editing = !r._editing
}

async function save(r) {
  error.value = null
  await api.patch(`/superadmin/restaurants/${r.id}`, {
    name: r.name,
    slug: r.slug,
    whatsappNumber: r.whatsappNumber || null,
    subscriptionPlan: r.subscriptionPlan || 'START',
    subscriptionStatus: r.subscriptionStatus || 'ACTIVE',
    themePrimary: r.themePrimary || null,
    themeSecondary: r.themeSecondary || null
  })
  await load()
  ui.toast({ message: 'Empresa atualizada.' })
}

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

onMounted(async () => {
  try {
    await load()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Erro ao carregar restaurantes.'
    ui.toast({ message: error.value, type: 'error' })
  }
})
</script>
