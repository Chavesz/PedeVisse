<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#fff8f4_0%,#fffdfb_100%)]">
    <div class="flex min-h-screen">
      <aside
        class="hidden w-72 flex-col border-r border-white/5 md:flex"
        style="background: linear-gradient(180deg, #151922 0%, #0f1218 100%); color: white"
      >
        <div class="border-b border-white/10 px-5 py-6">
          <div class="flex items-center gap-3">
            <img
              v-if="tenant.restaurant?.logoUrl && !route.name?.toString().startsWith('super.')"
              :src="tenant.restaurant.logoUrl"
              alt=""
              class="h-11 w-11 rounded-2xl border border-white/10 object-cover"
            />
            <div v-else class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-extrabold">
              PV
            </div>
            <div class="min-w-0">
              <div class="truncate text-sm font-extrabold">{{ shellTitle }}</div>
              <div class="truncate text-xs text-white/70">{{ shellSubtitle }}</div>
            </div>
          </div>
          <div v-if="!route.name?.toString().startsWith('super.')" class="mt-4 rounded-2xl bg-white/8 p-3">
            <div class="text-[11px] font-bold uppercase tracking-[0.24em] text-white/50">Painel</div>
            <div class="mt-1 truncate text-sm font-extrabold text-white">{{ tenant.restaurant?.name || slug() || 'Loja' }}</div>
          </div>
        </div>

        <nav class="mt-4 flex-1 space-y-1.5 px-3">
          <router-link
            v-for="item in navItems"
            :key="item.key"
            :to="item.to"
            class="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition"
            :class="isActive(item) ? 'bg-white text-slate-950 shadow-lg shadow-black/10' : 'text-white/80 hover:bg-white/10 hover:text-white'"
          >
            <span
              class="flex h-9 w-9 items-center justify-center rounded-xl"
              :class="isActive(item) ? 'bg-orange-50 text-[color:var(--pv-primary-strong)]' : 'bg-white/10 text-white'"
            >
              <component :is="item.icon" />
            </span>
            <span class="min-w-0 truncate">{{ item.label }}</span>
          </router-link>
        </nav>

        <div class="border-t border-white/10 p-3">
          <button
            class="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-extrabold text-white hover:bg-white/15"
            @click="logout"
          >
            <IconLogout />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <div class="flex items-center justify-between gap-3 border-b border-orange-100 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <div class="flex min-w-0 items-center gap-3">
            <button class="pv-btn pv-btn-ghost px-3 py-2" @click="mobileOpen = true">
              <IconMenu />
            </button>
            <div class="min-w-0">
              <div class="truncate text-sm font-extrabold text-slate-900">{{ shellTitle }}</div>
              <div class="truncate text-xs text-slate-500">{{ shellSubtitle }}</div>
            </div>
          </div>
          <button class="pv-btn pv-btn-ghost px-3 py-2" @click="logout">
            <span class="flex items-center gap-2">
              <IconLogout />
              <span>Sair</span>
            </span>
          </button>
        </div>

        <div class="flex-1 p-4 md:p-7 lg:p-9">
          <slot />
        </div>
      </div>
    </div>

    <div v-if="mobileOpen" class="fixed inset-0 z-50 md:hidden">
      <div class="absolute inset-0 bg-black/40" @click="mobileOpen = false"></div>
      <div class="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
        <div class="border-b border-slate-200 p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="truncate text-sm font-extrabold text-slate-900">{{ shellTitle }}</div>
              <div class="truncate text-xs text-slate-500">{{ shellSubtitle }}</div>
            </div>
            <button class="pv-btn pv-btn-ghost px-3 py-2" @click="mobileOpen = false">Fechar</button>
          </div>
          <div v-if="tenant.restaurant?.logoUrl && !route.name?.toString().startsWith('super.')" class="mt-4 flex items-center gap-3 rounded-2xl bg-orange-50 p-3">
            <img :src="tenant.restaurant.logoUrl" alt="" class="h-10 w-10 rounded-2xl object-cover" />
            <div class="truncate text-sm font-extrabold text-slate-900">{{ shellTitle }}</div>
            <div class="truncate text-xs text-slate-500">{{ tenant.restaurant?.name || slug() }}</div>
          </div>
        </div>
        <div class="p-3">
          <router-link
            v-for="item in navItems"
            :key="item.key"
            :to="item.to"
            class="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-extrabold text-slate-900 hover:bg-slate-50"
            :class="isActive(item) ? 'bg-slate-950 text-white hover:bg-slate-900' : ''"
            @click="mobileOpen = false"
          >
            <span class="flex h-9 w-9 items-center justify-center rounded-xl" :class="isActive(item) ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'">
              <component :is="item.icon" />
            </span>
            <span class="min-w-0 truncate">{{ item.label }}</span>
          </router-link>
          <button class="pv-btn pv-btn-danger mt-3 w-full" @click="logout">
            <span class="flex items-center gap-2">
              <IconLogout />
              <span>Sair</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, h, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTenantStore } from '../stores/tenant'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()
const auth = useAuthStore()

const mobileOpen = ref(false)

function slug() {
  return typeof route.params.restaurantSlug === 'string' ? route.params.restaurantSlug : null
}

const shellTitle = computed(() => {
  if (route.name?.toString().startsWith('super.')) return 'Admin Geral'
  if (route.name?.toString().startsWith('driver.')) return 'Entregas'
  return 'Central de gestão'
})

const shellSubtitle = computed(() => {
  if (route.name?.toString().startsWith('super.')) return auth.user?.email || 'Super Admin'
  if (slug()) return tenant.restaurant?.name || slug()
  return auth.user?.email || ''
})

function isActive(item) {
  const current = route.name?.toString() || ''
  return item.activeNames.some((n) => current === n)
}

const navItems = computed(() => {
  if (route.name?.toString().startsWith('super.')) {
    return [
      { key: 'super.restaurants', label: 'Empresas', to: { name: 'super.restaurants' }, icon: IconStore, activeNames: ['super.restaurants'] },
      { key: 'super.users', label: 'Usuários', to: { name: 'super.users' }, icon: IconUsers, activeNames: ['super.users'] }
    ]
  }

  const s = slug()
  if (route.name?.toString().startsWith('driver.') && s) {
    return [{ key: 'driver.deliveries', label: 'Entregas', to: { name: 'driver.deliveries', params: { restaurantSlug: s } }, icon: IconTruck, activeNames: ['driver.deliveries'] }]
  }

  if (s) {
    return [
      { key: 'admin.orders', label: 'Pedidos', to: { name: 'admin.orders', params: { restaurantSlug: s } }, icon: IconClipboard, activeNames: ['admin.orders'] },
      { key: 'admin.menu', label: 'Produtos', to: { name: 'admin.menu', params: { restaurantSlug: s } }, icon: IconBox, activeNames: ['admin.menu'] },
      { key: 'admin.settings', label: 'Config', to: { name: 'admin.settings', params: { restaurantSlug: s } }, icon: IconCog, activeNames: ['admin.settings'] },
      { key: 'admin.reports', label: 'Relatórios', to: { name: 'admin.reports', params: { restaurantSlug: s } }, icon: IconChart, activeNames: ['admin.reports'] },
      { key: 'admin.billing', label: 'Assinatura', to: { name: 'admin.billing', params: { restaurantSlug: s } }, icon: IconCard, activeNames: ['admin.billing'] }
    ]
  }

  return []
})

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}

function icon(paths) {
  return {
    render() {
      return h(
        'svg',
        {
          xmlns: 'http://www.w3.org/2000/svg',
          class: 'h-6 w-6',
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '2',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        },
        paths.map((p) => h(p.tag, p.attrs || {}))
      )
    }
  }
}

const IconMenu = icon([{ tag: 'line', attrs: { x1: '3', y1: '12', x2: '21', y2: '12' } }, { tag: 'line', attrs: { x1: '3', y1: '6', x2: '21', y2: '6' } }, { tag: 'line', attrs: { x1: '3', y1: '18', x2: '21', y2: '18' } }])
const IconLogout = icon([{ tag: 'path', attrs: { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' } }, { tag: 'polyline', attrs: { points: '16 17 21 12 16 7' } }, { tag: 'line', attrs: { x1: '21', y1: '12', x2: '9', y2: '12' } }])
const IconClipboard = icon([{ tag: 'path', attrs: { d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' } }, { tag: 'rect', attrs: { x: '8', y: '2', width: '8', height: '4', rx: '1', ry: '1' } }])
const IconBox = icon([{ tag: 'path', attrs: { d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73z' } }, { tag: 'path', attrs: { d: 'M3.27 6.96 12 12l8.73-5.04' } }, { tag: 'path', attrs: { d: 'M12 22V12' } }])
const IconCog = icon([{ tag: 'path', attrs: { d: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z' } }, { tag: 'path', attrs: { d: 'M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06a2.2 2.2 0 0 1-1.56 3.76h-.18a1.8 1.8 0 0 0-1.7 1.2 2.2 2.2 0 0 1-4.18 0 1.8 1.8 0 0 0-1.7-1.2h-.18a2.2 2.2 0 0 1-1.56-3.76l.06-.06A1.8 1.8 0 0 0 4.6 15a2.2 2.2 0 0 1 0-6 1.8 1.8 0 0 0-.36-1.98l-.06-.06A2.2 2.2 0 0 1 5.74 3.2h.18a1.8 1.8 0 0 0 1.7-1.2 2.2 2.2 0 0 1 4.18 0 1.8 1.8 0 0 0 1.7 1.2h.18a2.2 2.2 0 0 1 1.56 3.76l-.06.06A1.8 1.8 0 0 0 19.4 9a2.2 2.2 0 0 1 0 6z' } }])
const IconChart = icon([{ tag: 'path', attrs: { d: 'M3 3v18h18' } }, { tag: 'path', attrs: { d: 'M7 15v3' } }, { tag: 'path', attrs: { d: 'M12 10v8' } }, { tag: 'path', attrs: { d: 'M17 6v12' } }])
const IconCard = icon([
  { tag: 'rect', attrs: { x: '2', y: '5', width: '20', height: '14', rx: '2', ry: '2' } },
  { tag: 'line', attrs: { x1: '2', y1: '10', x2: '22', y2: '10' } },
  { tag: 'line', attrs: { x1: '6', y1: '15', x2: '10', y2: '15' } }
])
const IconStore = icon([{ tag: 'path', attrs: { d: 'M3 9l1-5h16l1 5' } }, { tag: 'path', attrs: { d: 'M5 22V9' } }, { tag: 'path', attrs: { d: 'M19 22V9' } }, { tag: 'path', attrs: { d: 'M9 22V14h6v8' } }])
const IconUsers = icon([{ tag: 'path', attrs: { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' } }, { tag: 'circle', attrs: { cx: '9', cy: '7', r: '4' } }, { tag: 'path', attrs: { d: 'M23 21v-2a4 4 0 0 0-3-3.87' } }, { tag: 'path', attrs: { d: 'M16 3.13a4 4 0 0 1 0 7.75' } }])
const IconTruck = icon([{ tag: 'path', attrs: { d: 'M10 17h4V5H2v12h3' } }, { tag: 'path', attrs: { d: 'M14 7h4l4 4v6h-2' } }, { tag: 'circle', attrs: { cx: '7.5', cy: '17.5', r: '2.5' } }, { tag: 'circle', attrs: { cx: '17.5', cy: '17.5', r: '2.5' } }])
</script>
