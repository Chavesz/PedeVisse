<template>
  <AppShell>
    <div class="pv-container max-w-6xl">
      <div class="pv-card pv-warm-panel p-5">
        <div class="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div class="min-w-0">
            <div class="pv-subtitle">Entregas</div>
            <div class="pv-title truncate">{{ tenant.restaurant?.name || tenant.slug }}</div>
            <div class="mt-2 text-sm text-slate-600">Pegue entregas, abra o mapa e fale com o cliente sem perder tempo durante o rush.</div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <div class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              <span class="h-2 w-2 rounded-full" :class="streamConnected ? 'bg-emerald-500' : 'bg-amber-400'"></span>
              {{ streamConnected ? 'Atualizando ao vivo' : 'Conectando stream' }}
            </div>
            <button class="pv-btn pv-btn-ghost" :disabled="loading" @click="refresh">
              {{ loading ? 'Atualizando...' : 'Atualizar' }}
            </button>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            class="pv-chip"
            :class="tab === 'AVAILABLE' ? 'bg-slate-900 text-white border-slate-900' : ''"
            @click="tab = 'AVAILABLE'"
          >
            Disponíveis ({{ availableCount }})
          </button>
          <button class="pv-chip" :class="tab === 'TODO' ? 'bg-slate-900 text-white border-slate-900' : ''" @click="tab = 'TODO'">
            Para entregar ({{ todoCount }})
          </button>
          <button class="pv-chip" :class="tab === 'DONE' ? 'bg-slate-900 text-white border-slate-900' : ''" @click="tab = 'DONE'">
            Entregues ({{ doneCount }})
          </button>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Disponíveis</div>
            <div class="mt-2 text-3xl font-black text-slate-950">{{ availableCount }}</div>
            <div class="mt-1 text-sm text-slate-600">Aguardando um entregador pegar</div>
          </div>
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Na rota</div>
            <div class="mt-2 text-3xl font-black text-slate-950">{{ todoCount }}</div>
            <div class="mt-1 text-sm text-slate-600">Saiu para entrega e ainda não concluiu</div>
          </div>
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Concluídas</div>
            <div class="mt-2 text-3xl font-black text-slate-950">{{ doneCount }}</div>
            <div class="mt-1 text-sm text-slate-600">Entregas finalizadas hoje</div>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div class="rounded-2xl border border-slate-200 bg-white p-4">
            <div class="text-xs font-semibold text-slate-500">Em alerta</div>
            <div class="mt-1 text-2xl font-black text-slate-950">{{ criticalCount }}</div>
            <div class="mt-1 text-sm text-slate-600">Pedidos acima da janela estimada</div>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-4">
            <div class="text-xs font-semibold text-slate-500">Tempo medio em rota</div>
            <div class="mt-1 text-2xl font-black text-slate-950">{{ averageRouteAge }}</div>
            <div class="mt-1 text-sm text-slate-600">Baseado nas entregas que estao com motorista</div>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-4">
            <div class="text-xs font-semibold text-slate-500">Proxima prioridade</div>
            <div class="mt-1 text-lg font-black text-slate-950">{{ nextPriorityTitle }}</div>
            <div class="mt-1 text-sm text-slate-600">{{ nextPriorityMessage }}</div>
          </div>
        </div>

        <div class="mt-4 rounded-[24px] border p-4" :class="driverBannerClass">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div class="text-xs font-semibold uppercase tracking-[0.22em]" :class="driverBannerAccentClass">Central Da Rua</div>
              <div class="mt-1 text-lg font-black text-slate-950">{{ driverBannerTitle }}</div>
              <div class="mt-1 text-sm" :class="driverBannerTextClass">{{ driverBannerMessage }}</div>
            </div>
            <button class="pv-btn px-4 py-3" :class="driverBannerButtonClass" @click="runDriverBannerAction">
              {{ driverBannerButtonLabel }}
            </button>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="item in driverPulseItems"
              :key="item.label"
              class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
              :class="item.className"
            >
              {{ item.label }}
            </span>
          </div>
        </div>

        <label v-if="tab !== 'AVAILABLE'" class="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <div class="text-sm font-extrabold text-slate-900">Somente minhas entregas</div>
            <div class="mt-1 text-xs text-slate-600">Quando desligado, mostra as entregas do dia do restaurante.</div>
          </div>
          <input v-model="mineOnly" type="checkbox" class="h-5 w-5" />
        </label>
      </div>

      <div class="mt-6 space-y-3">
        <div
          v-for="o in visible"
          :key="o.id"
          class="pv-card p-4"
          :class="etaMeta(o).isLate ? 'border-red-200 ring-2 ring-red-100' : 'border-slate-200'"
        >
          <div class="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <div class="text-sm font-extrabold text-slate-900">{{ o.customerName }}</div>
                <div class="pv-badge" :class="statusBadgeClass(o.status)">{{ statusLabel(o.status) }}</div>
                <div v-if="o.paymentMethod" class="pv-badge bg-amber-100 text-amber-900">
                  {{ o.paymentMethod === 'PIX' ? 'PIX' : o.paymentMethod === 'CASH' ? 'Dinheiro' : 'Cartão' }}
                </div>
                <div class="pv-badge" :class="priorityBadgeClass(o)">{{ priorityLabel(o) }}</div>
                <div class="text-xs font-semibold text-slate-500">{{ formatTime(o.createdAt) }}</div>
              </div>
              <div class="mt-1 text-sm text-slate-600">{{ formatAddress(o) }}</div>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <div class="pv-badge bg-slate-100 text-slate-800">Previsao: {{ etaMeta(o).etaLabel }}</div>
                <div class="pv-badge bg-slate-100 text-slate-800">Ha {{ etaMeta(o).ageLabel }}</div>
                <div v-if="etaMeta(o).isLate" class="pv-badge bg-red-100 text-red-800">Atrasado ha {{ lateBy(o) }}</div>
              </div>
              <div
                class="mt-3 rounded-2xl border p-3 text-sm"
                :class="etaMeta(o).isLate ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-slate-50 text-slate-700'"
              >
                {{ etaMeta(o).isLate ? `Priorize esta rota. Tempo acima da previsao em ${lateBy(o)}.` : etaMeta(o).detail }}
              </div>
              <div v-if="o.customerNote" class="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                <div class="text-xs font-semibold text-slate-500">Obs</div>
                <div class="mt-1">{{ o.customerNote }}</div>
              </div>
              <div v-if="o.paymentMethod === 'PIX' && tenant.restaurant?.pixKey" class="mt-3 rounded-2xl bg-slate-50 p-3">
                <div class="text-xs font-semibold text-slate-500">Chave PIX</div>
                <div class="mt-1 break-all font-mono text-sm font-semibold text-slate-900">{{ tenant.restaurant.pixKey }}</div>
              </div>
              <div v-if="o.paymentMethod === 'CASH' && o.paymentChangeCents" class="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                <div class="text-xs font-semibold text-slate-500">Troco para</div>
                <div class="mt-1 font-semibold">R$ {{ (o.paymentChangeCents / 100).toFixed(2) }}</div>
              </div>
            </div>

            <div class="flex flex-col gap-2 md:min-w-[220px]">
              <button
                v-if="tab === 'AVAILABLE'"
                class="pv-btn pv-btn-primary w-full"
                :disabled="changingId === o.id"
                @click="claim(o)"
              >
                {{ changingId === o.id ? 'Pegando...' : 'Peguei a entrega' }}
              </button>

              <button
                v-if="tab === 'TODO'"
                class="pv-btn pv-btn-primary w-full"
                :disabled="changingId === o.id"
                @click="markDelivered(o)"
              >
                {{ changingId === o.id ? 'Salvando...' : 'Marcar entregue' }}
              </button>

              <a v-if="proofUrl(o)" :href="proofUrl(o)" target="_blank" rel="noreferrer" class="pv-btn pv-btn-ghost w-full text-center">
                Ver comprovante
              </a>

              <a :href="mapsUrl(o)" target="_blank" rel="noreferrer" class="pv-btn pv-btn-ghost w-full text-center">Abrir no Maps</a>
              <a :href="wazeUrl(o)" target="_blank" rel="noreferrer" class="pv-btn pv-btn-ghost w-full text-center">Abrir no Waze</a>
              <button class="pv-btn pv-btn-ghost w-full" @click="copyAddress(o)">Copiar endereco</button>

              <a
                v-if="o.customerPhone"
                :href="customerWhatsUrl(o)"
                target="_blank"
                rel="noreferrer"
                class="pv-btn w-full bg-green-500 text-white hover:bg-green-600"
              >
                WhatsApp do cliente
              </a>
              <a v-if="o.customerPhone" :href="phoneUrl(o)" class="pv-btn pv-btn-ghost w-full text-center">Ligar para cliente</a>
            </div>
          </div>
        </div>

        <div v-if="visible.length === 0" class="pv-card p-8 text-center">
          <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-[color:var(--pv-primary-strong)]">
            <svg viewBox="0 0 24 24" class="h-10 w-10" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 7h11v8H3z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M14 10h3l4 4v1h-7z" />
              <circle cx="7.5" cy="18.5" r="1.5" />
              <circle cx="17.5" cy="18.5" r="1.5" />
            </svg>
          </div>
          <div class="mt-4 text-xl font-black text-slate-950">{{ emptyStateTitle }}</div>
          <div class="mt-2 text-sm text-slate-600">{{ emptyStateMessage }}</div>
          <div class="mt-6 flex flex-wrap justify-center gap-2">
            <button v-if="tab !== 'AVAILABLE'" class="pv-btn pv-btn-ghost" @click="mineOnly = false">Ver todas do dia</button>
            <button class="pv-btn pv-btn-primary" @click="refresh">Atualizar entregas</button>
          </div>
        </div>
      </div>

      <div v-if="error" class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{{ error }}</div>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, resolveUploadUrl } from '../../api/client'
import { useTenantStore } from '../../stores/tenant'
import { useAuthStore } from '../../stores/auth'
import { useUiStore } from '../../stores/ui'
import AppShell from '../../components/AppShell.vue'
import { formatMinutesLabel, getOrderEtaMeta } from '../../utils/orderTracking'

const route = useRoute()
const router = useRouter()
const tenant = useTenantStore()
const auth = useAuthStore()
const ui = useUiStore()

const orders = ref([])
const availableOrders = ref([])
const tab = ref('TODO')
const mineOnly = ref(true)
const loading = ref(false)
const error = ref(null)
const changingId = ref(null)
const nowTick = ref(Date.now())
const streamConnected = ref(false)
let clockTimer = null
let eventSource = null

function slug() {
  return typeof route.params.restaurantSlug === 'string' ? route.params.restaurantSlug : null
}

function formatAddress(o) {
  if (o?.fulfillmentMethod === 'PICKUP') return 'Retirada no local'
  if (!o?.addressStreet || !o?.addressNumber || !o?.addressNeighborhood) return 'Endereço não informado.'
  return `${o.addressStreet}, ${o.addressNumber} - ${o.addressNeighborhood}${o.addressReference ? ` (${o.addressReference})` : ''}`
}

function formatTime(createdAt) {
  if (!createdAt) return ''
  const d = new Date(createdAt)
  return d.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
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

function buildStreamUrl() {
  const s = slug()
  if (!s || !auth.token) return null
  return `/api/t/${encodeURIComponent(s)}/driver/deliveries/stream?token=${encodeURIComponent(auth.token)}`
}

function mapsUrl(o) {
  const query = encodeURIComponent(formatAddress(o))
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

function customerWhatsUrl(o) {
  const text = encodeURIComponent(`Olá ${o.customerName}! Sobre o seu pedido ${o.id}...`)
  return `https://wa.me/${o.customerPhone}?text=${text}`
}

function phoneUrl(o) {
  return `tel:${String(o?.customerPhone || '').replace(/\D/g, '')}`
}

function wazeUrl(o) {
  const query = encodeURIComponent(formatAddress(o))
  return `https://waze.com/ul?q=${query}&navigate=yes`
}

async function copyAddress(o) {
  const text = formatAddress(o)
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    ui.toast({ message: 'Endereco copiado.' })
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
  ui.toast({ message: 'Endereco copiado.' })
}

function proofUrl(o) {
  return resolveUploadUrl(o?.paymentProofUrl)
}

function etaMeta(order) {
  return getOrderEtaMeta(order, nowTick.value)
}

function lateBy(order) {
  return formatMinutesLabel(etaMeta(order).lateByMinutes || 0)
}

function priorityLabel(order) {
  const meta = etaMeta(order)
  if (meta.isLate) return 'URGENTE'
  if (meta.tone === 'delivery') return 'EM ROTA'
  if (order?.status === 'PREPARANDO') return 'AGUARDANDO SAIDA'
  return 'NO PRAZO'
}

function priorityBadgeClass(order) {
  const meta = etaMeta(order)
  if (meta.isLate) return 'bg-red-100 text-red-800'
  if (meta.tone === 'delivery') return 'bg-emerald-100 text-emerald-800'
  if (order?.status === 'PREPARANDO') return 'bg-amber-100 text-amber-900'
  return 'bg-slate-100 text-slate-800'
}

function isAvailableOrder(order) {
  return order?.fulfillmentMethod === 'DELIVERY' && !order?.assignedDriverId && (order?.status === 'PREPARANDO' || order?.status === 'SAIU_PARA_ENTREGA')
}

function isListOrder(order) {
  return order?.fulfillmentMethod === 'DELIVERY' && (order?.status === 'SAIU_PARA_ENTREGA' || order?.status === 'ENTREGUE')
}

function upsertById(list, order) {
  const next = [...(list || [])]
  const index = next.findIndex((item) => item.id === order.id)
  if (index >= 0) next[index] = order
  else next.unshift(order)
  return next
}

function removeById(list, orderId) {
  return (list || []).filter((item) => item.id !== orderId)
}

function notifyNewAvailable(order) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (AudioCtx) {
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = 740
    gain.gain.value = 0.04
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.14)
    osc.onended = () => ctx.close()
  }
  ui.toast({ message: `Nova entrega disponivel para ${order.customerName}.` })
}

function handleOrderEvent(order, type) {
  if (!order?.id) return

  const wasAvailable = availableOrders.value.some((item) => item.id === order.id)
  if (isAvailableOrder(order)) {
    availableOrders.value = upsertById(availableOrders.value, order)
    if (!wasAvailable && type === 'order.updated') {
      notifyNewAvailable(order)
    }
  } else {
    availableOrders.value = removeById(availableOrders.value, order.id)
  }

  if (isListOrder(order)) {
    if (!mineOnly.value || order.assignedDriverId === auth.user?.id) {
      orders.value = upsertById(orders.value, order)
    } else {
      orders.value = removeById(orders.value, order.id)
    }
  } else {
    orders.value = removeById(orders.value, order.id)
  }
}

const availableCount = computed(() => (availableOrders.value || []).length)
const todo = computed(() => (orders.value || []).filter((o) => o.status === 'SAIU_PARA_ENTREGA'))
const done = computed(() => (orders.value || []).filter((o) => o.status === 'ENTREGUE'))
const todoCount = computed(() => todo.value.length)
const doneCount = computed(() => done.value.length)
const criticalCount = computed(() => [...(availableOrders.value || []), ...(orders.value || [])].filter((o) => etaMeta(o).isLate).length)
const averageRouteAge = computed(() => {
  const list = todo.value
  if (!list.length) return '0 min'
  const total = list.reduce((acc, order) => acc + (etaMeta(order).ageMinutes || 0), 0)
  return formatMinutesLabel(Math.round(total / list.length))
})
const nextPriorityOrder = computed(() => {
  const list = visible.value || []
  return list.length ? list[0] : null
})
const nextPriorityTitle = computed(() => {
  if (!nextPriorityOrder.value) return 'Sem fila critica'
  return `${nextPriorityOrder.value.customerName} · ${priorityLabel(nextPriorityOrder.value)}`
})
const nextPriorityMessage = computed(() => {
  if (!nextPriorityOrder.value) return 'Atualize a tela ou aguarde novas rotas.'
  const meta = etaMeta(nextPriorityOrder.value)
  return meta.isLate ? `Tempo acima da previsao em ${lateBy(nextPriorityOrder.value)}.` : `${meta.detail} Previsao atual: ${meta.etaLabel}.`
})
const driverBannerTitle = computed(() => {
  if (criticalCount.value > 0) return 'Existem rotas em atraso pedindo ação imediata'
  if (availableCount.value > 0) return 'Nova chance de puxar entrega disponível'
  if (todoCount.value > 0) return 'Você já está com entregas em rota'
  return 'Rua está tranquila neste momento'
})
const driverBannerMessage = computed(() => {
  if (criticalCount.value > 0) return `${criticalCount.value} entrega(s) estão acima da previsão. Vale priorizar a mais antiga agora.`
  if (availableCount.value > 0) return `${availableCount.value} entrega(s) estão aguardando motorista para sair do restaurante.`
  if (todoCount.value > 0) return 'Mantenha foco nas entregas em andamento e atualize a etapa assim que concluir.'
  return 'Aguarde novas rotas disponíveis ou atualize a tela em alguns instantes.'
})
const driverBannerButtonLabel = computed(() => {
  if (criticalCount.value > 0) return 'Ver prioridade'
  if (availableCount.value > 0) return 'Ver disponíveis'
  if (todoCount.value > 0) return 'Ver rota'
  return 'Atualizar'
})
const driverBannerClass = computed(() => {
  if (criticalCount.value > 0) return 'border-red-200 bg-red-50/80'
  if (availableCount.value > 0) return 'border-amber-200 bg-amber-50/80'
  if (todoCount.value > 0) return 'border-emerald-200 bg-emerald-50/80'
  return 'border-slate-200 bg-slate-50/80'
})
const driverBannerAccentClass = computed(() => {
  if (criticalCount.value > 0) return 'text-red-700'
  if (availableCount.value > 0) return 'text-amber-700'
  if (todoCount.value > 0) return 'text-emerald-700'
  return 'text-slate-700'
})
const driverBannerTextClass = computed(() => {
  if (criticalCount.value > 0) return 'text-red-800'
  if (availableCount.value > 0) return 'text-amber-800'
  if (todoCount.value > 0) return 'text-emerald-800'
  return 'text-slate-700'
})
const driverBannerButtonClass = computed(() => {
  if (criticalCount.value > 0) return 'bg-red-500 text-white hover:bg-red-600'
  if (availableCount.value > 0) return 'bg-orange-500 text-white hover:bg-orange-600'
  if (todoCount.value > 0) return 'bg-emerald-500 text-white hover:bg-emerald-600'
  return 'bg-slate-900 text-white hover:bg-slate-800'
})
const driverPulseItems = computed(() => [
  {
    label: `${availableCount.value} disponíveis`,
    className: availableCount.value ? 'border-amber-200 bg-amber-100 text-amber-900' : 'border-slate-200 bg-white text-slate-600'
  },
  {
    label: `${todoCount.value} em rota`,
    className: todoCount.value ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'
  },
  {
    label: `${criticalCount.value} em alerta`,
    className: criticalCount.value ? 'border-red-200 bg-red-100 text-red-800' : 'border-slate-200 bg-white text-slate-600'
  }
])
const visible = computed(() => {
  const list = tab.value === 'AVAILABLE' ? availableOrders.value || [] : tab.value === 'DONE' ? done.value : todo.value
  return [...list].sort((a, b) => {
    const lateDiff = Number(etaMeta(b).isLate) - Number(etaMeta(a).isLate)
    if (lateDiff !== 0) return lateDiff
    return (etaMeta(b).ageMinutes || 0) - (etaMeta(a).ageMinutes || 0)
  })
})

const emptyStateTitle = computed(() => {
  if (tab.value === 'AVAILABLE') return 'Nenhuma entrega disponível agora'
  if (tab.value === 'DONE') return 'Nenhuma entrega concluída hoje'
  return mineOnly.value ? 'Você não tem entregas pendentes' : 'Nenhuma entrega pendente hoje'
})

const emptyStateMessage = computed(() => {
  if (tab.value === 'AVAILABLE') return 'Assim que um pedido sair para entrega sem motorista, ele aparece aqui para você pegar.'
  if (tab.value === 'DONE') return 'As entregas finalizadas no dia aparecem aqui para consulta rápida.'
  return mineOnly.value
    ? 'Desative o filtro para ver todas as entregas do restaurante ou aguarde novas rotas.'
    : 'Quando um pedido sair para entrega, ele aparece aqui para acompanhamento.'
})

function runDriverBannerAction() {
  if (criticalCount.value > 0) {
    tab.value = 'TODO'
    mineOnly.value = false
    ui.toast({ message: 'Rotas críticas destacadas para prioridade.', type: 'warning' })
    return
  }
  if (availableCount.value > 0) {
    tab.value = 'AVAILABLE'
    return
  }
  if (todoCount.value > 0) {
    tab.value = 'TODO'
    mineOnly.value = true
    return
  }
  refresh()
}

async function load() {
  const s = slug()
  if (!s) return
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get(`/t/${encodeURIComponent(s)}/driver/deliveries`, { params: { status: 'ALL', mine: mineOnly.value ? '1' : '0' } })
    orders.value = data.orders || []
  } catch (e) {
    error.value = e?.response?.data?.message || 'Erro ao carregar entregas.'
  } finally {
    loading.value = false
  }
}

async function loadAvailable() {
  const s = slug()
  if (!s) return
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get(`/t/${encodeURIComponent(s)}/driver/deliveries/available`)
    availableOrders.value = data.orders || []
  } catch (e) {
    error.value = e?.response?.data?.message || 'Erro ao carregar entregas disponíveis.'
  } finally {
    loading.value = false
  }
}

async function claim(o) {
  const s = slug()
  if (!s || !o?.id) return
  changingId.value = o.id
  error.value = null
  try {
    const { data } = await api.patch(`/t/${encodeURIComponent(s)}/driver/deliveries/${encodeURIComponent(o.id)}/claim`)
    availableOrders.value = (availableOrders.value || []).filter((x) => x.id !== data.order.id)
    const idx = orders.value.findIndex((x) => x.id === data.order.id)
    if (idx !== -1) orders.value[idx] = data.order
    else orders.value.unshift(data.order)
    tab.value = 'TODO'
    ui.toast({ message: 'Entrega assumida com sucesso.' })
  } catch (e) {
    error.value = e?.response?.data?.message || 'Não foi possível pegar esta entrega.'
    ui.toast({ message: error.value, type: 'error' })
  } finally {
    changingId.value = null
  }
}

async function markDelivered(o) {
  const s = slug()
  if (!s || !o?.id) return
  changingId.value = o.id
  error.value = null
  try {
    const { data } = await api.patch(`/t/${encodeURIComponent(s)}/driver/deliveries/${encodeURIComponent(o.id)}/status`, { status: 'ENTREGUE' })
    const idx = orders.value.findIndex((x) => x.id === data.order.id)
    if (idx !== -1) orders.value[idx] = data.order
    else orders.value.unshift(data.order)
    ui.toast({ message: 'Entrega marcada como concluída.' })
  } catch (e) {
    error.value = e?.response?.data?.message || 'Não foi possível marcar como entregue.'
    ui.toast({ message: error.value, type: 'error' })
  } finally {
    changingId.value = null
  }
}

function refresh() {
  if (tab.value === 'AVAILABLE') {
    return Promise.all([loadAvailable(), load()])
  }
  return Promise.all([load(), loadAvailable()])
}

function closeStream() {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
  streamConnected.value = false
}

function openStream() {
  const url = buildStreamUrl()
  if (!url || typeof EventSource === 'undefined') return
  closeStream()
  eventSource = new EventSource(url)
  eventSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data || '{}')
      if (payload?.type === 'connected') {
        streamConnected.value = true
        return
      }
      if (payload?.order) {
        streamConnected.value = true
        handleOrderEvent(payload.order, payload.type)
      }
    } catch {}
  }
  eventSource.onerror = () => {
    streamConnected.value = false
  }
}

onMounted(async () => {
  if (!auth.token) {
    router.push({ name: 'login' })
    return
  }
  clockTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 60000)
  await load()
  await loadAvailable()
  openStream()
})

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
  closeStream()
})

watch(
  [() => route.params.restaurantSlug, () => auth.token],
  async () => {
    await refresh()
    openStream()
  }
)

watch(tab, () => {
  if (tab.value === 'AVAILABLE') loadAvailable()
})

watch(mineOnly, () => {
  if (tab.value !== 'AVAILABLE') load()
})
</script>
