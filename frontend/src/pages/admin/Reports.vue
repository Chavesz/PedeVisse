<template>
  <AppShell>
    <div class="pv-container max-w-6xl">
      <div class="pv-card pv-warm-panel p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="pv-subtitle">Relatórios</div>
            <div class="pv-title">{{ tenant.restaurant?.name || tenant.slug }}</div>
            <div class="mt-2 text-sm text-slate-600">Veja faturamento, volume de pedidos e distribuição por status sem sair do painel.</div>
          </div>
          <div class="text-sm text-slate-600">Resumo por período e exportação.</div>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap gap-2">
        <button
          class="pv-btn rounded-full border border-slate-200 bg-white px-3 py-2 text-xs"
          :class="range === 'today' ? 'bg-slate-900 text-white' : 'text-slate-800'"
          @click="setRange('today')"
        >
          Hoje
        </button>
        <button
          class="pv-btn rounded-full border border-slate-200 bg-white px-3 py-2 text-xs"
          :class="range === '7d' ? 'bg-slate-900 text-white' : 'text-slate-800'"
          @click="setRange('7d')"
        >
          7 dias
        </button>
        <button
          class="pv-btn rounded-full border border-slate-200 bg-white px-3 py-2 text-xs"
          :class="range === '30d' ? 'bg-slate-900 text-white' : 'text-slate-800'"
          @click="setRange('30d')"
        >
          30 dias
        </button>
        <button
          class="pv-btn rounded-full border border-slate-200 bg-white px-3 py-2 text-xs"
          :class="range === 'custom' ? 'bg-slate-900 text-white' : 'text-slate-800'"
          @click="setRange('custom')"
        >
          Personalizado
        </button>
      </div>

      <div v-if="range === 'custom'" class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <input v-model.trim="customStart" class="pv-input" placeholder="Início (YYYY-MM-DD)" />
        <input v-model.trim="customEnd" class="pv-input" placeholder="Fim (YYYY-MM-DD)" />
        <button class="pv-btn pv-btn-primary" @click="load">Aplicar</button>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div class="pv-card-soft p-4">
          <div class="text-xs font-semibold text-slate-500">Período</div>
          <div class="mt-1 text-sm font-semibold text-slate-800">{{ periodLabel }}</div>
        </div>
        <div class="pv-card-soft p-4">
          <div class="text-xs font-semibold text-slate-500">Pedidos</div>
          <div class="mt-1 text-3xl font-black text-slate-950">{{ summary?.count ?? 0 }}</div>
        </div>
        <div class="pv-card-soft p-4">
          <div class="text-xs font-semibold text-slate-500">Total</div>
          <div class="mt-1 text-3xl font-black text-slate-950">R$ {{ formatMoney(summary?.total || 0) }}</div>
        </div>
        <div class="pv-card-soft p-4">
          <div class="text-xs font-semibold text-slate-500">Ticket médio</div>
          <div class="mt-1 text-3xl font-black text-slate-950">R$ {{ formatMoney(averageTicket) }}</div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div class="pv-card p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="text-sm font-extrabold text-slate-900">Distribuição do período</div>
            <div class="text-xs font-semibold text-slate-500">Comparativo por status</div>
          </div>
          <div class="mt-4 space-y-3">
            <div v-for="s in statuses" :key="`bar_${s}`">
              <div class="mb-2 flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <span class="pv-badge" :class="statusBadgeClass(s)">{{ statusLabel(s) }}</span>
                </div>
                <div class="text-sm font-semibold text-slate-700">
                  {{ summary?.byStatus?.[s]?.count || 0 }} pedidos
                </div>
              </div>
              <div class="h-3 overflow-hidden rounded-full bg-slate-100">
                <div class="h-full rounded-full" :class="statusBarClass(s)" :style="{ width: `${statusPercent(s)}%` }"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="pv-card p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="text-sm font-extrabold text-slate-900">Por status</div>
            <div class="flex items-center gap-2">
              <button class="pv-btn pv-btn-ghost" :disabled="downloading" @click="downloadCsv">
                {{ downloading ? 'Baixando...' : 'Exportar CSV' }}
              </button>
              <button class="pv-btn pv-btn-primary" @click="printReport">Imprimir</button>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-2">
            <div v-for="s in statuses" :key="s" class="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <div class="flex items-center gap-2">
                <span class="pv-badge" :class="statusBadgeClass(s)">{{ statusLabel(s) }}</span>
              </div>
              <div class="text-right text-sm font-semibold text-slate-700">
                <div>{{ (summary?.byStatus?.[s]?.count || 0) }} pedidos</div>
                <div>R$ {{ formatMoney(summary?.byStatus?.[s]?.total || 0) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="(summary?.count || 0) === 0" class="mt-4 pv-card p-8 text-center">
        <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-[color:var(--pv-primary-strong)]">
          <svg viewBox="0 0 24 24" class="h-10 w-10" fill="none" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 14v4" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v8" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 7v11" />
          </svg>
        </div>
        <div class="mt-4 text-xl font-black text-slate-950">Sem dados nesse período</div>
        <div class="mt-2 text-sm text-slate-600">Troque o período ou volte depois que o restaurante tiver mais pedidos fechados.</div>
      </div>

      <div v-if="error" class="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{{ error }}</div>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../../api/client'
import { useTenantStore } from '../../stores/tenant'
import AppShell from '../../components/AppShell.vue'

const route = useRoute()
const tenant = useTenantStore()

const statuses = ['NOVO', 'PREPARANDO', 'SAIU_PARA_ENTREGA', 'ENTREGUE']

const range = ref('today')
const customStart = ref('')
const customEnd = ref('')
const summary = ref(null)
const error = ref(null)
const downloading = ref(false)

function slug() {
  return typeof route.params.restaurantSlug === 'string' ? route.params.restaurantSlug : null
}

function formatMoney(cents) {
  return (Number(cents || 0) / 100).toFixed(2)
}

function setRange(r) {
  range.value = r
  if (r !== 'custom') load()
}

const averageTicket = computed(() => {
  const count = Number(summary.value?.count || 0)
  const total = Number(summary.value?.total || 0)
  if (!count) return 0
  return Math.round(total / count)
})

const periodLabel = computed(() => {
  if (!summary.value?.start || !summary.value?.end) return '-'
  const s = new Date(summary.value.start)
  const e = new Date(summary.value.end)
  const fmt = (d) => d.toLocaleDateString('pt-BR')
  return `${fmt(s)} até ${fmt(e)}`
})

function dateToIsoDayStart(day) {
  const [y, m, d] = String(day || '').split('-').map((x) => Number(x))
  if (!y || !m || !d) return null
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toISOString()
}

function dateToIsoNextDayStart(day) {
  const [y, m, d] = String(day || '').split('-').map((x) => Number(x))
  if (!y || !m || !d) return null
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0)
  if (Number.isNaN(dt.getTime())) return null
  dt.setDate(dt.getDate() + 1)
  return dt.toISOString()
}

async function load() {
  error.value = null
  const s = slug()
  if (!s) return
  try {
    const params = { range: range.value }
    if (range.value === 'custom') {
      const start = dateToIsoDayStart(customStart.value)
      const end = dateToIsoNextDayStart(customEnd.value)
      if (!start || !end) {
        error.value = 'Informe início e fim no formato YYYY-MM-DD.'
        return
      }
      params.start = start
      params.end = end
    }
    const { data } = await api.get(`/t/${encodeURIComponent(s)}/admin/reports/summary`, { params })
    summary.value = data
  } catch (e) {
    error.value = e?.response?.data?.message || 'Erro ao carregar relatório.'
  }
}

async function downloadCsv() {
  const s = slug()
  if (!s) return
  downloading.value = true
  try {
    const params = { range: range.value }
    if (range.value === 'custom') {
      params.start = dateToIsoDayStart(customStart.value)
      params.end = dateToIsoNextDayStart(customEnd.value)
    }
    const resp = await api.get(`/t/${encodeURIComponent(s)}/admin/reports/orders.csv`, {
      params,
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(resp.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders_${s}_${range.value}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } finally {
    downloading.value = false
  }
}

function escapeHtml(v) {
  return String(v || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function printReport() {
  const s = summary.value
  if (!s) return
  const rows = statuses
    .map((st) => {
      const c = s.byStatus?.[st]?.count || 0
      const t = s.byStatus?.[st]?.total || 0
      return `<tr><td>${escapeHtml(st)}</td><td style="text-align:right">${escapeHtml(String(c))}</td><td style="text-align:right">R$ ${escapeHtml(formatMoney(t))}</td></tr>`
    })
    .join('')
  const html = `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>Fechamento</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 8px; }
        .muted { color: #555; font-size: 12px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
        th { text-align: left; font-size: 12px; color: #555; }
        .kpi { display:flex; justify-content:space-between; gap:12px; margin-top:10px; }
        .kpi div { border:1px solid #ddd; border-radius:10px; padding:10px; width:100%; }
        .kpi .label { font-size:12px; color:#555; }
        .kpi .value { font-size:16px; font-weight:700; margin-top:4px; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(tenant.restaurant?.name || tenant.slug)} · Relatório</h1>
      <div class="muted">${escapeHtml(periodLabel.value)}</div>
      <div class="kpi">
        <div><div class="label">Pedidos</div><div class="value">${escapeHtml(String(s.count || 0))}</div></div>
        <div><div class="label">Total</div><div class="value">R$ ${escapeHtml(formatMoney(s.total || 0))}</div></div>
      </div>
      <table>
        <thead><tr><th>Status</th><th style="text-align:right">Qtd</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>window.onload = () => window.print();<\/script>
    </body>
  </html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
}

function statusLabel(status) {
  if (status === 'NOVO') return 'Novo'
  if (status === 'PREPARANDO') return 'Preparando'
  if (status === 'SAIU_PARA_ENTREGA') return 'Saiu'
  if (status === 'ENTREGUE') return 'Entregue'
  return status
}

function statusBadgeClass(status) {
  if (status === 'NOVO') return 'pv-status-new'
  if (status === 'PREPARANDO') return 'pv-status-preparing'
  if (status === 'SAIU_PARA_ENTREGA') return 'bg-orange-100 text-orange-800'
  if (status === 'ENTREGUE') return 'pv-status-ready'
  return ''
}

function statusBarClass(status) {
  if (status === 'NOVO') return 'bg-sky-500'
  if (status === 'PREPARANDO') return 'bg-orange-500'
  if (status === 'SAIU_PARA_ENTREGA') return 'bg-amber-500'
  if (status === 'ENTREGUE') return 'bg-emerald-500'
  return 'bg-slate-400'
}

function statusPercent(status) {
  const total = Number(summary.value?.count || 0)
  const count = Number(summary.value?.byStatus?.[status]?.count || 0)
  if (!total || !count) return 0
  return Math.max(8, Math.round((count / total) * 100))
}

onMounted(async () => {
  await load()
})
</script>
