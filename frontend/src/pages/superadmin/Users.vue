<template>
  <AppShell>
    <div class="pv-container max-w-6xl">
      <div class="pv-card pv-warm-panel p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="pv-subtitle">Super Admin</div>
            <div class="pv-title">Usuários</div>
            <div class="mt-2 text-sm text-slate-600">Gerentes e entregadores por restaurante, com visão mais clara para escalar a operação.</div>
          </div>
          <div class="text-sm text-slate-600">Gerentes e entregadores por restaurante.</div>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Total</div>
            <div class="mt-2 text-3xl font-black text-slate-950">{{ users.length }}</div>
          </div>
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Gerentes</div>
            <div class="mt-2 text-3xl font-black text-slate-950">{{ managerCount }}</div>
          </div>
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Entregadores</div>
            <div class="mt-2 text-3xl font-black text-slate-950">{{ driverCount }}</div>
          </div>
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Empresas</div>
            <div class="mt-2 text-3xl font-black text-slate-950">{{ restaurantCount }}</div>
          </div>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="pv-card p-4">
          <div class="text-sm font-extrabold text-slate-900">Criar usuário</div>
          <form class="mt-4 space-y-3" @submit.prevent="create">
            <select v-model="form.role" class="pv-select">
              <option value="RESTAURANT_ADMIN">Gerente</option>
              <option value="DRIVER">Entregador</option>
            </select>
            <select v-model="form.restaurantId" class="pv-select">
              <option disabled value="">Restaurante</option>
              <option v-for="r in restaurants" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
            <input v-model.trim="form.email" class="pv-input" placeholder="Email" />
            <input v-model.trim="form.password" type="password" class="pv-input" placeholder="Senha" />
            <button class="pv-btn pv-btn-primary w-full">Criar</button>
          </form>
        </div>

        <div class="pv-card p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="text-sm font-extrabold text-slate-900">Lista</div>
            <div class="flex flex-wrap gap-2">
              <input v-model.trim="search" class="pv-input min-w-[220px]" placeholder="Buscar email ou empresa..." />
              <select v-model="roleFilter" class="pv-select min-w-[180px]">
                <option value="ALL">Todos os perfis</option>
                <option value="RESTAURANT_ADMIN">Só gerentes</option>
                <option value="DRIVER">Só entregadores</option>
              </select>
            </div>
          </div>
          <div class="mt-4 space-y-3">
            <div v-for="u in visibleUsers" :key="u.id" class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div class="min-w-0">
                <div class="truncate text-sm font-extrabold text-slate-900">{{ u.email }}</div>
                <div class="mt-1 text-xs text-slate-600">{{ roleLabel(u.role) }} · {{ u.restaurant?.name || '-' }}</div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span class="pv-badge" :class="u.role === 'RESTAURANT_ADMIN' ? 'bg-sky-100 text-sky-800' : 'bg-orange-100 text-orange-800'">
                    {{ roleLabel(u.role) }}
                  </span>
                  <span class="pv-badge">{{ u.restaurant?.name || 'Sem restaurante' }}</span>
                </div>
              </div>
              <button class="pv-btn px-3 py-2 text-red-700 hover:bg-red-50" @click="remove(u.id)">Deletar</button>
            </div>
            <div v-if="visibleUsers.length === 0" class="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
              <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-[color:var(--pv-primary-strong)]">
                <svg viewBox="0 0 24 24" class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                  <circle cx="9.5" cy="7" r="3" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20 8v6" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M23 11h-6" />
                </svg>
              </div>
              <div class="mt-4 text-lg font-black text-slate-950">Nenhum usuário encontrado</div>
              <div class="mt-2 text-sm text-slate-600">Ajuste os filtros ou crie um novo gerente ou entregador para alguma empresa.</div>
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
const users = ref([])
const error = ref(null)
const search = ref('')
const roleFilter = ref('ALL')
const ui = useUiStore()

const form = reactive({
  role: 'RESTAURANT_ADMIN',
  restaurantId: '',
  email: '',
  password: ''
})

const managerCount = computed(() => users.value.filter((u) => u.role === 'RESTAURANT_ADMIN').length)
const driverCount = computed(() => users.value.filter((u) => u.role === 'DRIVER').length)
const restaurantCount = computed(() => new Set(users.value.map((u) => u.restaurant?.id).filter(Boolean)).size)

const visibleUsers = computed(() => {
  const q = String(search.value || '').trim().toLowerCase()
  return users.value.filter((u) => {
    if (roleFilter.value !== 'ALL' && u.role !== roleFilter.value) return false
    if (!q) return true
    return (
      String(u.email || '').toLowerCase().includes(q) ||
      String(u.restaurant?.name || '').toLowerCase().includes(q)
    )
  })
})

function roleLabel(role) {
  if (role === 'RESTAURANT_ADMIN') return 'Gerente'
  if (role === 'DRIVER') return 'Entregador'
  if (role === 'SUPER_ADMIN') return 'Admin geral'
  return role
}

async function load() {
  const [r, u] = await Promise.all([api.get('/superadmin/restaurants'), api.get('/superadmin/users')])
  restaurants.value = r.data.restaurants
  users.value = u.data.users
}

async function create() {
  error.value = null
  await api.post('/superadmin/users', { ...form })
  form.email = ''
  form.password = ''
  await load()
  ui.toast({ message: 'Usuário criado com sucesso.' })
}

async function remove(id) {
  await api.delete(`/superadmin/users/${id}`)
  await load()
  ui.toast({ message: 'Usuário removido.' })
}

onMounted(async () => {
  try {
    await load()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Erro ao carregar usuários.'
    ui.toast({ message: error.value, type: 'error' })
  }
})
</script>
