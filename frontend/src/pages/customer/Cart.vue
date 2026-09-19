<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#fff8f4_0%,#fffdfb_100%)] pb-28">
    <div class="pv-container min-h-screen max-w-6xl">
      <div class="pv-card pv-warm-panel p-5">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div class="pv-subtitle">Seu pedido</div>
            <h1 class="pv-title">Carrinho</h1>
            <div class="mt-2 flex flex-wrap gap-2">
              <span class="pv-badge bg-orange-100 text-orange-900">1. Carrinho</span>
              <span class="pv-badge">2. Checkout</span>
              <span class="pv-badge">3. Confirmação</span>
            </div>
          </div>
          <router-link
            :to="{ name: 'customer.menu', params: { restaurantSlug: tenant.slug } }"
            class="pv-btn pv-btn-ghost"
          >
            Voltar ao cardápio
          </router-link>
        </div>
      </div>

      <div v-if="cart.items.length === 0" class="mt-6 pv-card p-8 text-center">
        <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-[color:var(--pv-primary-strong)]">
          <svg viewBox="0 0 24 24" class="h-10 w-10" fill="none" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h2l2.2 9.2A2 2 0 0 0 9.15 15H18a2 2 0 0 0 1.94-1.51L21 8H7" />
            <circle cx="10" cy="20" r="1.25" />
            <circle cx="18" cy="20" r="1.25" />
          </svg>
        </div>
        <div class="mt-4 text-xl font-black text-slate-950">Seu carrinho ainda está vazio</div>
        <div class="mt-2 text-sm text-slate-600">Escolha alguns itens do cardápio para continuar seu pedido.</div>
        <router-link
          :to="{ name: 'customer.menu', params: { restaurantSlug: tenant.slug } }"
          class="pv-btn pv-btn-primary mt-6"
        >
          Ver cardápio
        </router-link>
      </div>

      <div v-if="showRestartPanel" class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div class="pv-card p-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="max-w-2xl">
              <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Começo rápido</div>
              <div class="mt-2 text-2xl font-black tracking-tight text-slate-950">Retomar seu padrão</div>
              <div class="mt-2 text-sm text-slate-600">{{ restartMessage }}</div>
              <div class="mt-4 flex flex-wrap gap-2">
                <span v-if="recentOrderMetaLabel" class="pv-badge bg-slate-50 text-slate-700">{{ recentOrderMetaLabel }}</span>
                <span v-if="recentOrderStatsLabel" class="pv-badge bg-slate-50 text-slate-700">{{ recentOrderStatsLabel }}</span>
                <span v-if="recentOrderChannelLabel" class="pv-badge bg-slate-50 text-slate-700">{{ recentOrderChannelLabel }}</span>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="pv-btn pv-btn-primary" @click="addRestartBundle">
                Montar carrinho rápido
              </button>
              <button v-if="restartPrimaryProduct" type="button" class="pv-btn pv-btn-ghost" @click="addRestartPrimary">
                Repetir favorito
              </button>
            </div>
          </div>
        </div>

        <div v-if="restartProducts.length" class="pv-card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-sm font-extrabold text-slate-900">Base do último pedido</div>
              <div class="mt-1 text-sm text-slate-600">Itens mais fáceis de repetir para reaquecer a compra.</div>
            </div>
            <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span class="font-black text-slate-950">{{ restartProducts.length }}</span>
              item(ns)
            </div>
          </div>
          <div class="mt-4 space-y-3">
            <div v-for="product in restartProducts" :key="`restart_${product.id}`" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-base font-black text-slate-950">{{ product.name }}</div>
                  <div class="mt-1 text-sm text-slate-600">{{ restartHint(product) }}</div>
                </div>
                <div class="text-right">
                  <div class="text-base font-black text-[color:var(--pv-primary-strong)]">R$ {{ (product.price / 100).toFixed(2) }}</div>
                  <div class="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{{ product.lastQty }}x antes</div>
                </div>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <button type="button" class="pv-chip" @click="addRestartItem(product)">Adicionar</button>
                <router-link :to="{ name: 'customer.menu', params: { restaurantSlug: tenant.slug } }" class="pv-chip">
                  Ver cardápio
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <transition-group name="pv-fade" tag="div" class="space-y-3">
          <div v-for="i in cart.items" :key="i.productId" class="pv-card p-5">
            <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="truncate text-lg font-black text-slate-950">{{ i.name }}</div>
                    <div class="mt-1 text-sm text-slate-600">R$ {{ (i.price / 100).toFixed(2) }} por unidade</div>
                  </div>
                  <button class="pv-btn px-3 py-2 text-red-700 hover:bg-red-50" @click="cart.remove(i.productId)">Remover</button>
                </div>

                <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <button class="pv-btn pv-btn-ghost h-12 w-12 px-0" @click="cart.dec(i.productId)">-</button>
                    <div class="w-10 text-center text-base font-black text-slate-950">{{ i.qty }}</div>
                    <button class="pv-btn pv-btn-primary h-12 w-12 px-0" @click="inc(i.productId)">+</button>
                  </div>
                  <div class="text-right">
                    <div class="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Subtotal do item</div>
                    <div class="text-xl font-black text-[color:var(--pv-primary-strong)]">R$ {{ ((i.price * i.qty) / 100).toFixed(2) }}</div>
                  </div>
                </div>

                <div class="mt-4">
                  <label class="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Observação do item</label>
                  <textarea
                    :value="i.note || ''"
                    rows="2"
                    class="pv-textarea"
                    placeholder="Ex: sem cebolinha, molho separado, pouco cream cheese..."
                    @input="cart.setNote(i.productId, $event.target.value)"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </transition-group>

        <div class="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <div class="pv-card p-5 text-slate-800">
            <div class="text-sm font-extrabold text-slate-900">Resumo do pedido</div>
            <div class="mt-4 flex items-center justify-between">
              <div class="text-sm text-slate-600">Itens</div>
              <div class="font-semibold">{{ cart.count }}</div>
            </div>
            <div class="mt-2 flex items-center justify-between">
              <div class="text-sm text-slate-600">Subtotal</div>
              <div class="font-semibold">R$ {{ (cart.total / 100).toFixed(2) }}</div>
            </div>
            <div class="mt-2 flex items-center justify-between">
              <div class="text-sm text-slate-600">Taxa de entrega</div>
              <div class="font-semibold">R$ {{ (deliveryFee / 100).toFixed(2) }}</div>
            </div>
            <div class="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
              <div class="font-semibold">Total</div>
              <div class="text-2xl font-black text-[color:var(--pv-primary-strong)]">R$ {{ (grandTotal / 100).toFixed(2) }}</div>
            </div>
            <div v-if="missingForMinOrder > 0" class="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
              Faltam R$ {{ (missingForMinOrder / 100).toFixed(2) }} para atingir o pedido mínimo.
            </div>
            <div v-else-if="minOrder > 0" class="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">
              Pedido mínimo atingido. Você já pode finalizar.
            </div>
          </div>

          <div v-if="comboInsight" class="pv-card p-5">
            <div class="text-sm font-extrabold text-slate-900">Oportunidade rápida</div>
            <div class="mt-3 rounded-2xl border p-4" :class="comboInsight.tone === 'warning' ? 'border-amber-200 bg-amber-50/70' : 'border-slate-200 bg-slate-50'">
              <div class="text-base font-black text-slate-950">{{ comboInsight.title }}</div>
              <div class="mt-1 text-sm text-slate-700">{{ comboInsight.message }}</div>
            </div>
          </div>

          <div v-if="cartSuggestions.length" class="pv-card p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-sm font-extrabold text-slate-900">Complete seu pedido</div>
                <div class="mt-1 text-sm text-slate-600">Sugestões para aumentar ticket ou bater o mínimo com menos atrito.</div>
              </div>
              <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <span class="font-black text-slate-950">{{ cartSuggestions.length }}</span>
                sugestão(ões)
              </div>
            </div>
            <div class="mt-4 space-y-3">
              <div v-for="product in cartSuggestions" :key="product.id" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="truncate text-base font-black text-slate-950">{{ product.name }}</div>
                    <div class="mt-1 text-sm text-slate-600">{{ cartSuggestionHint(product) }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-base font-black text-[color:var(--pv-primary-strong)]">R$ {{ (product.price / 100).toFixed(2) }}</div>
                    <div class="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Sugestão</div>
                  </div>
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button class="pv-chip" @click="addSuggested(product)">Adicionar</button>
                  <router-link :to="{ name: 'customer.menu', params: { restaurantSlug: tenant.slug } }" class="pv-chip">
                    Ver no cardápio
                  </router-link>
                </div>
              </div>
            </div>
          </div>

          <div v-if="repeatComboProducts.length" class="pv-card p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-sm font-extrabold text-slate-900">Voltar ao seu combo</div>
                <div class="mt-1 text-sm text-slate-600">Partes do último pedido que combinam com o carrinho atual.</div>
              </div>
              <button type="button" class="pv-chip" @click="addRepeatCombo">
                Adicionar combo
              </button>
            </div>
            <div class="mt-4 space-y-3">
              <div v-for="product in repeatComboProducts" :key="`repeat_combo_${product.id}`" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="truncate text-base font-black text-slate-950">{{ product.name }}</div>
                    <div class="mt-1 text-sm text-slate-600">{{ repeatComboHint(product) }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-base font-black text-[color:var(--pv-primary-strong)]">R$ {{ (product.price / 100).toFixed(2) }}</div>
                    <div class="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Reforço</div>
                  </div>
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button type="button" class="pv-chip" @click="addRestartItem(product)">Adicionar</button>
                  <router-link :to="{ name: 'customer.menu', params: { restaurantSlug: tenant.slug } }" class="pv-chip">
                    Ver item
                  </router-link>
                </div>
              </div>
            </div>
          </div>

          <router-link
            :to="{ name: 'customer.checkout', params: { restaurantSlug: tenant.slug } }"
            class="pv-btn pv-btn-primary w-full py-5 text-base"
          >
            Continuar para checkout
          </router-link>
        </div>
      </div>
    </div>

    <div v-if="cart.items.length > 0" class="fixed inset-x-4 bottom-4 z-40 lg:hidden">
      <div class="rounded-[24px] border border-orange-200 bg-white/95 p-3 shadow-xl backdrop-blur">
        <div class="mb-2 flex items-center justify-between text-sm">
          <div class="font-bold text-slate-900">{{ cart.count }} item(ns)</div>
          <div class="font-black text-[color:var(--pv-primary-strong)]">R$ {{ (grandTotal / 100).toFixed(2) }}</div>
        </div>
        <router-link
          :to="{ name: 'customer.checkout', params: { restaurantSlug: tenant.slug } }"
          class="pv-btn pv-btn-primary w-full"
        >
          Ir para checkout
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '../../api/client'
import { useUiStore } from '../../stores/ui'
import { useTenantStore } from '../../stores/tenant'
import { useCartStore } from '../../stores/cart'

const tenant = useTenantStore()
const cart = useCartStore()
const ui = useUiStore()
const categories = ref([])
const recentOrder = ref(null)

const deliveryFee = computed(() => Number(tenant.restaurant?.deliveryFee || 0))
const minOrder = computed(() => Number(tenant.restaurant?.minOrder || 0))
const grandTotal = computed(() => cart.total + deliveryFee.value)
const missingForMinOrder = computed(() => Math.max(0, minOrder.value - cart.total))
const allProducts = computed(() => categories.value.flatMap((category) => category.products || []))
const restartProducts = computed(() => {
  const items = recentOrder.value?.items || []
  if (!items.length) return []
  return items
    .map((item) => {
      const product = allProducts.value.find((candidate) => candidate.id === item.productId && candidate.isAvailable)
      if (!product) return null
      return {
        ...product,
        lastQty: Number(item.qty || 1)
      }
    })
    .filter(Boolean)
    .slice(0, 3)
})
const showRestartPanel = computed(() => restartProducts.value.length > 0)
const restartPrimaryProduct = computed(() => restartProducts.value[0] || null)
const repeatComboProducts = computed(() => {
  if (!cart.items.length) return []
  const inCart = new Set(cart.items.map((item) => item.productId))
  return restartProducts.value.filter((product) => !inCart.has(product.id)).slice(0, 2)
})
const recentOrderMetaLabel = computed(() => {
  const createdAt = recentOrder.value?.createdAt
  if (!createdAt) return ''
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `Último pedido em ${day}/${month} às ${hour}:${minute}`
})
const recentOrderStatsLabel = computed(() => {
  const itemCount = Number(recentOrder.value?.itemCount || 0)
  const total = Number(recentOrder.value?.total || 0)
  if (!itemCount && !total) return ''
  if (!itemCount) return `Total R$ ${(total / 100).toFixed(2)}`
  if (!total) return `${itemCount} item(ns)`
  return `${itemCount} item(ns) · R$ ${(total / 100).toFixed(2)}`
})
const recentOrderChannelLabel = computed(() => {
  if (recentOrder.value?.fulfillmentMethod === 'PICKUP') return 'Última compra em retirada'
  if (recentOrder.value?.fulfillmentMethod === 'DELIVERY') return 'Última compra em delivery'
  return ''
})
const restartMessage = computed(() => {
  if (cart.items.length === 0) return 'Seu carrinho está vazio, então dá para recomeçar pelo que você costuma pedir e ajustar depois.'
  return 'Seu carrinho já começou. Use o padrão do último pedido para completar a compra mais rápido.'
})

const cartSuggestions = computed(() => {
  const inCart = new Set(cart.items.map((item) => item.productId))
  return allProducts.value
    .filter((product) => product.isAvailable && !inCart.has(product.id))
    .map((product) => ({ product, score: suggestionScore(product) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.product)
})

const comboInsight = computed(() => {
  if (missingForMinOrder.value > 0) {
    return {
      title: 'Vale completar o pedido antes do checkout',
      message: `Faltam R$ ${(missingForMinOrder.value / 100).toFixed(2)} para bater o pedido mínimo. Uma sugestão rápida pode destravar a compra.`,
      tone: 'warning'
    }
  }
  if (cart.items.some((item) => normalizeText(item.name).includes('combo'))) {
    return {
      title: 'Seu pedido já tem cara de combo',
      message: 'Agora vale reforçar com um adicional leve para subir o ticket sem aumentar muito a decisão.',
      tone: 'neutral'
    }
  }
  return {
    title: 'Seu pedido pode render um ticket melhor',
    message: 'Antes de fechar, veja uma sugestão simples para complementar a refeição e aproveitar melhor a compra.',
    tone: 'neutral'
  }
})

function inc(productId) {
  const item = cart.items.find((i) => i.productId === productId)
  if (!item) return
  cart.items = cart.items.map((i) => (i.productId === productId ? { ...i, qty: i.qty + 1 } : i))
  cart.persist()
}

function recentOrderStorageKey(slug) {
  return `pv_recent_order_${slug || 'unknown'}`
}

function loadRecentOrder() {
  try {
    const raw = localStorage.getItem(recentOrderStorageKey(tenant.slug))
    recentOrder.value = raw ? JSON.parse(raw) : null
  } catch {
    recentOrder.value = null
  }
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function hasCartKeyword(keyword) {
  return cart.items.some((item) => normalizeText(item.name).includes(keyword))
}

function suggestionScore(product) {
  const name = normalizeText(product?.name)
  const price = Number(product?.price || 0)
  let score = 0
  if (missingForMinOrder.value > 0) {
    if (price <= missingForMinOrder.value * 1.25) score += 6500
    if (price >= missingForMinOrder.value * 0.5 && price <= missingForMinOrder.value * 1.1) score += 3200
  } else if (price >= 1800 && price <= 4500) {
    score += 2800
  }
  if (name.includes('combo') && !hasCartKeyword('combo')) score += 4800
  if ((name.includes('yakisoba') || name.includes('yakissoba')) && !hasCartKeyword('yakisoba') && !hasCartKeyword('yakissoba')) score += 4200
  if (name.includes('temaki') && !hasCartKeyword('temaki')) score += 3600
  if (name.includes('sushi') && !hasCartKeyword('sushi')) score += 2200
  return score + Math.round(price / 10)
}

function cartSuggestionHint(product) {
  const name = normalizeText(product?.name)
  if (missingForMinOrder.value > 0) return 'Ajuda a bater o pedido mínimo sem pesar o valor final.'
  if (name.includes('combo')) return 'Boa pedida para transformar o carrinho em um combo de ticket maior.'
  if (name.includes('temaki')) return 'Extra simples para subir ticket e manter decisão rápida.'
  if (name.includes('yakisoba') || name.includes('yakissoba')) return 'Complementa bem o pedido e aumenta o valor com facilidade.'
  return 'Combina com o carrinho atual e pode melhorar o aproveitamento do pedido.'
}

function addSuggested(product) {
  cart.add(product)
}

function addRestartItem(product) {
  for (let i = 0; i < Number(product.lastQty || 1); i += 1) {
    cart.add(product)
  }
  ui.toast({ message: `${product.name} adicionado ao carrinho.` })
}

function addRestartBundle() {
  for (const product of restartProducts.value) {
    for (let i = 0; i < Number(product.lastQty || 1); i += 1) {
      cart.add(product)
    }
  }
  ui.toast({ message: 'Carrinho montado com base no último pedido.' })
}

function addRestartPrimary() {
  if (!restartPrimaryProduct.value) return
  addRestartItem(restartPrimaryProduct.value)
}

function addRepeatCombo() {
  for (const product of repeatComboProducts.value) {
    cart.add(product)
  }
  ui.toast({ message: 'Combo recorrente adicionado ao carrinho.' })
}

function restartHint(product) {
  const qty = Number(product.lastQty || 1)
  if (qty > 1) return `Saiu ${qty}x no último pedido. Bom atalho para recomeçar rápido.`
  return 'Item que já apareceu no seu pedido recente e pode destravar a recompra com menos esforço.'
}

function repeatComboHint(product) {
  return 'Combinava com o último pedido e encaixa bem para completar o carrinho atual.'
}

async function loadMenu() {
  if (!tenant.slug) return
  const { data } = await api.get(`/t/${encodeURIComponent(tenant.slug)}/public/menu`)
  categories.value = data.categories || []
}

onMounted(async () => {
  cart.load()
  loadRecentOrder()
  await loadMenu()
})

watch(
  () => tenant.slug,
  async () => {
    cart.load()
    loadRecentOrder()
    await loadMenu()
  }
)
</script>
