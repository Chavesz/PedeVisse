<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#fff8f4_0%,#fffdfb_100%)]">
    <div class="pv-container max-w-5xl">
      <div class="pv-card p-5 md:p-8">
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div class="min-w-0">
            <div class="pv-subtitle">Pedido enviado</div>
            <h1 class="pv-title truncate">{{ tenant.restaurant?.name || tenant.slug }}</h1>
            <div class="mt-1 text-sm text-slate-600">
              {{ heroDescription }}
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em]" :class="statusBadgeClass(currentStatus)">
                {{ statusLabel }}
              </span>
              <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                <span class="h-2 w-2 rounded-full" :class="streamConnected ? 'bg-emerald-500' : 'bg-amber-400'"></span>
                {{ streamConnected ? 'Atualizando ao vivo' : 'Sincronizando status' }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="orderId" class="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] md:p-6">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Acompanhamento</div>
              <div class="mt-2 text-lg font-black text-slate-950">{{ activeStep.label }}</div>
              <div class="mt-1 text-sm text-slate-600">{{ activeStep.description }}</div>
            </div>
            <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span class="font-semibold text-slate-900">{{ currentStepIndex + 1 }}/{{ statusSteps.length }}</span>
              etapas concluídas
            </div>
          </div>

          <div v-if="currentOrder" class="mt-4 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fff7f2_0%,#ffffff_100%)] p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Momento atual</div>
            <div class="mt-2 text-lg font-black text-slate-950">{{ customerGuidance.headline }}</div>
            <div class="mt-1 text-sm text-slate-600">{{ customerGuidance.summary }}</div>
            <div class="mt-3 rounded-2xl border border-white/80 bg-white/80 p-3 text-sm text-slate-700">
              <span class="font-semibold text-slate-950">Próximo passo:</span>
              {{ customerGuidance.nextStep }}
            </div>
          </div>

          <div v-if="currentOrder" class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-xs font-semibold text-slate-500">Previsão</div>
              <div class="mt-1 text-lg font-black text-slate-950">{{ etaMeta.etaLabel }}</div>
              <div class="mt-1 text-sm text-slate-600">{{ etaMeta.detail }}</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-xs font-semibold text-slate-500">Ritmo do pedido</div>
              <div class="mt-1 text-lg font-black text-slate-950">{{ rhythmLabel }}</div>
              <div class="mt-1 text-sm text-slate-600">{{ rhythmDescription }}</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-xs font-semibold text-slate-500">Ultima atualizacao</div>
              <div class="mt-1 text-lg font-black text-slate-950">{{ updatedAgoLabel }}</div>
              <div class="mt-1 text-sm" :class="etaMeta.isLate ? 'text-red-700' : 'text-slate-600'">
                {{ etaMeta.isLate ? `Fluxo acima da previsao em ${lateByLabel}.` : 'A tela acompanha as mudancas automaticamente.' }}
              </div>
            </div>
          </div>

          <div class="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div class="h-full rounded-full bg-[linear-gradient(90deg,#ff4d00_0%,#ff8a00_100%)] transition-all duration-500" :style="{ width: `${progressPercent}%` }"></div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]" :class="statusToneChipClass">
              {{ statusToneLabel }}
            </span>
            <span class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              Tempo total: {{ etaMeta.ageLabel }}
            </span>
            <span
              v-if="paymentMethod === 'PIX' && !currentOrder?.paymentProofUrl && currentStatus !== 'ENTREGUE'"
              class="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"
            >
              PIX aguardando confirmação
            </span>
          </div>

          <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div
              v-for="(step, index) in statusSteps"
              :key="step.key"
              class="rounded-2xl border p-4 transition"
              :class="stepCardClass(index)"
            >
              <div class="flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-black" :class="stepDotClass(index)">
                  {{ index + 1 }}
                </div>
                <div class="min-w-0">
                  <div class="text-sm font-extrabold" :class="stepTitleClass(index)">{{ step.label }}</div>
                  <div class="mt-1 text-xs text-slate-500">{{ step.description }}</div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="trackingLoading" class="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            Atualizando o status do pedido...
          </div>
          <div v-else-if="trackingError" class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {{ trackingError }}
          </div>
        </div>

        <div v-if="customerAlerts.length" class="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div
            v-for="alert in customerAlerts"
            :key="alert.id"
            class="rounded-2xl border p-4"
            :class="customerAlertClass(alert.tone)"
          >
            <div class="text-xs font-extrabold uppercase tracking-[0.22em]" :class="customerAlertAccentClass(alert.tone)">
              Aviso
            </div>
            <div class="mt-2 text-sm font-extrabold text-slate-900">{{ alert.title }}</div>
            <div class="mt-1 text-sm text-slate-700">{{ alert.message }}</div>
          </div>
        </div>

        <div v-if="loyaltyOpportunity || loyaltySuggestions.length" class="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-[1.05fr_0.95fr]">
          <div v-if="loyaltyOpportunity" class="rounded-2xl border border-slate-200 bg-white p-5">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Volte Quando Quiser</div>
            <div class="mt-2 text-lg font-black text-slate-950">{{ loyaltyOpportunity.title }}</div>
            <div class="mt-2 text-sm text-slate-600">{{ loyaltyOpportunity.message }}</div>
            <div class="mt-4 flex flex-wrap gap-2">
              <router-link :to="{ name: 'customer.menu', params: { restaurantSlug: tenant.slug } }" class="pv-btn pv-btn-primary">
                Montar novo pedido
              </router-link>
              <a
                v-if="whatsappUrl"
                :href="whatsappUrl"
                target="_blank"
                rel="noreferrer"
                class="pv-btn pv-btn-ghost"
              >
                Falar com a loja
              </a>
            </div>
          </div>

          <div v-if="loyaltySuggestions.length" class="rounded-2xl border border-slate-200 bg-white p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Próximo Pedido</div>
                <div class="mt-2 text-lg font-black text-slate-950">Sugestões para repetir depois</div>
                <div class="mt-1 text-sm text-slate-600">Itens com boa cara de recompra e ticket rápido para voltar ao cardápio.</div>
              </div>
              <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <span class="font-black text-slate-950">{{ loyaltySuggestions.length }}</span>
                sugestão(ões)
              </div>
            </div>

            <div class="mt-4 space-y-3">
              <div
                v-for="product in loyaltySuggestions"
                :key="`loyalty_${product.id}`"
                class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="truncate text-base font-black text-slate-950">{{ product.name }}</div>
                    <div class="mt-1 text-sm text-slate-600">{{ loyaltySuggestionHint(product) }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-base font-black text-[color:var(--pv-primary-strong)]">R$ {{ (product.price / 100).toFixed(2) }}</div>
                    <div class="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Recompra</div>
                  </div>
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button type="button" class="pv-btn pv-btn-primary px-4 py-2" @click="addSuggestedToCart(product)">
                    Adicionar ao carrinho
                  </button>
                  <router-link :to="{ name: 'customer.menu', params: { restaurantSlug: tenant.slug } }" class="pv-chip">
                    Ver cardápio
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Etapa 1</div>
            <div class="mt-2 text-sm font-extrabold text-slate-900">Pedido recebido</div>
            <div class="mt-1 text-sm text-slate-600">A loja já recebeu sua solicitação.</div>
          </div>
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Etapa 2</div>
            <div class="mt-2 text-sm font-extrabold text-slate-900">Confirmação</div>
            <div class="mt-1 text-sm text-slate-600">{{ confirmationHint }}</div>
          </div>
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Etapa 3</div>
            <div class="mt-2 text-sm font-extrabold text-slate-900">{{ fulfillmentMethod === 'PICKUP' ? 'Retirada' : 'Entrega' }}</div>
            <div class="mt-1 text-sm text-slate-600">
              {{ fulfillmentMethod === 'PICKUP' ? 'Quando o pedido estiver pronto, vá até o restaurante.' : 'Acompanhe a confirmação e aguarde a entrega no endereço informado.' }}
            </div>
          </div>
        </div>

        <div class="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div class="rounded-2xl border border-slate-200 bg-white p-4">
            <div class="text-xs font-semibold text-slate-500">Número do pedido</div>
            <div class="mt-1 flex flex-wrap items-center gap-2">
              <span class="font-mono text-sm font-semibold text-slate-900">{{ orderId || '-' }}</span>
              <button v-if="orderId" type="button" class="pv-btn pv-btn-ghost px-3 py-2 text-xs" @click="copyOrderId">
                {{ copiedOrderId ? 'Copiado!' : 'Copiar número' }}
              </button>
            </div>
          </div>
          <div class="rounded-2xl bg-slate-50 p-4">
            <div class="text-xs font-semibold text-slate-500">Recebimento</div>
            <div class="mt-1 text-sm font-semibold text-slate-900">
              {{ fulfillmentMethod === 'PICKUP' ? 'Retirar no local' : 'Entrega em casa' }}
            </div>
            <div class="mt-1 text-sm text-slate-700">
              {{ fulfillmentMethod === 'PICKUP' ? 'Vá até o restaurante quando o pedido estiver pronto.' : 'Se o WhatsApp não abrir, copie a mensagem e envie manualmente.' }}
            </div>
          </div>
        </div>

        <div v-if="paymentMethod === 'PIX'" class="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div class="text-xs font-semibold text-slate-500">Pagamento via PIX</div>
          <div class="mt-2 break-all font-mono text-sm font-semibold text-slate-900">{{ tenant.restaurant?.pixKey || '-' }}</div>
          <div class="mt-3 flex flex-col gap-2 md:flex-row">
            <button type="button" class="pv-btn pv-btn-ghost w-full md:w-auto" @click="copyPixKey" :disabled="!tenant.restaurant?.pixKey">
              {{ copied ? 'Copiado!' : 'Copiar chave PIX' }}
            </button>
            <label class="pv-btn pv-btn-ghost w-full cursor-pointer md:flex-1">
              <input type="file" class="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf" @change="onPickFile" />
              {{ proofFileName || 'Selecionar comprovante (opcional)' }}
            </label>
            <button
              type="button"
              class="pv-btn pv-btn-primary w-full md:w-auto"
              :disabled="uploading || !proofFile || !orderId"
              @click="uploadProof"
            >
              {{ uploading ? 'Enviando...' : 'Enviar comprovante' }}
            </button>
          </div>
          <div v-if="proofOk" class="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Comprovante enviado.
          </div>
          <div v-if="proofError" class="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {{ proofError }}
          </div>
        </div>

        <div class="mt-6 flex flex-col gap-3 md:flex-row">
          <a
            v-if="whatsappUrl"
            :href="whatsappUrl"
            target="_blank"
            rel="noreferrer"
            class="pv-btn w-full bg-green-500 text-white hover:bg-green-600 md:w-auto md:flex-1"
          >
            {{ whatsappCta.label }}
          </a>
          <div v-else class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 md:flex-1">
            Este restaurante ainda não configurou WhatsApp para receber pedidos.
          </div>

          <button type="button" class="pv-btn pv-btn-ghost w-full md:w-auto" @click="shareOrder">
            Compartilhar pedido
          </button>

          <router-link
            :to="{ name: 'customer.menu', params: { restaurantSlug: tenant.slug } }"
            class="pv-btn pv-btn-ghost w-full md:w-auto"
          >
            Voltar ao cardápio
          </router-link>
        </div>

        <div v-if="whatsappUrl" class="mt-3 text-sm text-slate-600">
          {{ whatsappCta.hint }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { api } from '../../api/client'
import { useCartStore } from '../../stores/cart'
import { useTenantStore } from '../../stores/tenant'
import { useUiStore } from '../../stores/ui'
import {
  formatMinutesLabel,
  getOrderCustomerAlerts,
  getOrderCustomerGuidance,
  getOrderEtaMeta,
  getOrderWhatsAppCta,
  getRelativeDateLabel
} from '../../utils/orderTracking'

const tenant = useTenantStore()
const cart = useCartStore()
const ui = useUiStore()

const raw = computed(() => {
  try {
    return JSON.parse(sessionStorage.getItem('pv_last_order') || 'null')
  } catch {
    return null
  }
})

const orderId = computed(() => (raw.value?.restaurantSlug === tenant.slug ? raw.value?.orderId : null))
const whatsappUrl = computed(() => (raw.value?.restaurantSlug === tenant.slug ? raw.value?.whatsappUrl : null))
const currentOrder = ref(null)
const trackingLoading = ref(false)
const trackingError = ref(null)
const streamConnected = ref(false)
const nowTick = ref(Date.now())
const categories = ref([])

const paymentMethod = computed(() => currentOrder.value?.paymentMethod || (raw.value?.restaurantSlug === tenant.slug ? raw.value?.paymentMethod : null))
const fulfillmentMethod = computed(() => currentOrder.value?.fulfillmentMethod || (raw.value?.restaurantSlug === tenant.slug ? raw.value?.fulfillmentMethod : null))

const copied = ref(false)
const copiedOrderId = ref(false)
const proofFile = ref(null)
const proofFileName = ref('')
const uploading = ref(false)
const proofOk = ref(false)
const proofError = ref(null)

const statusOrder = ['NOVO', 'PREPARANDO', 'SAIU_PARA_ENTREGA', 'ENTREGUE']
let eventSource = null
let clockTimer = null

const currentStatus = computed(() => currentOrder.value?.status || 'NOVO')
const etaMeta = computed(() => getOrderEtaMeta(currentOrder.value, nowTick.value))
const statusSteps = computed(() => {
  const isPickup = fulfillmentMethod.value === 'PICKUP'
  return [
    {
      key: 'NOVO',
      label: 'Pedido recebido',
      description: 'A loja já recebeu o seu pedido.'
    },
    {
      key: 'PREPARANDO',
      label: 'Em preparo',
      description: 'Sua equipe já está organizando tudo por aí.'
    },
    {
      key: 'SAIU_PARA_ENTREGA',
      label: isPickup ? 'Pronto para retirar' : 'Saiu para entrega',
      description: isPickup ? 'Seu pedido está pronto para retirada no local.' : 'Seu pedido já saiu e está a caminho.'
    },
    {
      key: 'ENTREGUE',
      label: isPickup ? 'Retirado' : 'Entregue',
      description: isPickup ? 'Retirada concluída com sucesso.' : 'Pedido finalizado com sucesso.'
    }
  ]
})
const currentStepIndex = computed(() => {
  const index = statusOrder.indexOf(currentStatus.value)
  return index >= 0 ? index : 0
})
const progressPercent = computed(() => ((currentStepIndex.value + 1) / statusOrder.length) * 100)
const activeStep = computed(() => statusSteps.value[currentStepIndex.value] || statusSteps.value[0])
const statusLabel = computed(() => activeStep.value.label)
const customerGuidance = computed(() => getOrderCustomerGuidance(currentOrder.value, nowTick.value))
const customerAlerts = computed(() => getOrderCustomerAlerts(currentOrder.value, nowTick.value))
const whatsappCta = computed(() => getOrderWhatsAppCta(currentOrder.value, nowTick.value))
const updatedAgoLabel = computed(() => {
  if (!currentOrder.value?.updatedAt) return 'agora'
  return getRelativeDateLabel(currentOrder.value.updatedAt, nowTick.value)
})
const lateByLabel = computed(() => formatMinutesLabel(etaMeta.value.lateByMinutes || 0))
const allProducts = computed(() => categories.value.flatMap((category) => category.products || []))
const loyaltySuggestions = computed(() => {
  const inCart = new Set(cart.items.map((item) => item.productId))
  return allProducts.value
    .filter((product) => product.isAvailable && !inCart.has(product.id))
    .map((product) => ({ product, score: loyaltySuggestionScore(product) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.product)
})
const loyaltyOpportunity = computed(() => {
  if (currentStatus.value === 'ENTREGUE') {
    return {
      title: 'Pedido concluído. Hora boa para voltar.',
      message: 'Se a experiência foi boa, aproveite para já deixar um próximo pedido encaminhado com poucos cliques.'
    }
  }
  if (currentStatus.value === 'SAIU_PARA_ENTREGA') {
    return {
      title: fulfillmentMethod.value === 'PICKUP' ? 'Enquanto vai retirar, já pense no próximo.' : 'Enquanto o pedido chega, a vitrine segue aberta.',
      message: 'A loja continua online e você pode favoritar mentalmente um próximo combo ou complemento para repetir depois.'
    }
  }
  return {
    title: 'Acompanhe agora, volte depois sem perder tempo.',
    message: 'Quando bater vontade de pedir de novo, a loja já deixa um caminho rápido para montar outro carrinho.'
  }
})
const confirmationHint = computed(() => {
  if (paymentMethod.value === 'PIX') {
    return currentOrder.value?.paymentProofUrl
      ? 'Seu comprovante já foi enviado. Agora é só acompanhar a preparação.'
      : 'Se quiser agilizar, envie o comprovante do PIX ou confirme com a loja no WhatsApp.'
  }
  return 'A loja segue com a operação e atualiza esta tela automaticamente.'
})
const rhythmLabel = computed(() => {
  if (etaMeta.value.isLate) return `Acima da previsao em ${lateByLabel.value}`
  if (currentStatus.value === 'ENTREGUE') return 'Fluxo concluido'
  if (currentStatus.value === 'SAIU_PARA_ENTREGA') return fulfillmentMethod.value === 'PICKUP' ? 'Pronto para retirada' : 'Reta final'
  if (currentStatus.value === 'PREPARANDO') return 'Dentro da operacao'
  return 'Aguardando primeira acao'
})
const rhythmDescription = computed(() => {
  if (etaMeta.value.isLate) return 'A loja ainda está atualizando o pedido, mas o tempo já passou da janela prevista.'
  if (currentStatus.value === 'ENTREGUE') return 'Pedido finalizado com sucesso.'
  if (currentStatus.value === 'SAIU_PARA_ENTREGA') {
    return fulfillmentMethod.value === 'PICKUP'
      ? 'O pedido já pode ser retirado no local.'
      : 'Seu pedido está na etapa final da entrega.'
  }
  if (currentStatus.value === 'PREPARANDO') return 'O pedido está seguindo a rotina normal da loja.'
  return 'A equipe recebeu o pedido e deve iniciar o preparo em breve.'
})
const statusToneLabel = computed(() => {
  if (etaMeta.value.isLate) return 'Acompanhamento Prioritário'
  if (currentStatus.value === 'ENTREGUE') return 'Pedido Finalizado'
  if (currentStatus.value === 'SAIU_PARA_ENTREGA') return fulfillmentMethod.value === 'PICKUP' ? 'Pronto Para Retirar' : 'Em Rota'
  if (currentStatus.value === 'PREPARANDO') return 'Em Produção'
  return 'Recebido Pela Loja'
})
const statusToneChipClass = computed(() => {
  if (etaMeta.value.isLate) return 'bg-red-50 text-red-700'
  if (currentStatus.value === 'ENTREGUE') return 'bg-emerald-50 text-emerald-700'
  if (currentStatus.value === 'SAIU_PARA_ENTREGA') return 'bg-orange-50 text-orange-700'
  if (currentStatus.value === 'PREPARANDO') return 'bg-amber-50 text-amber-700'
  return 'bg-slate-100 text-slate-700'
})
const heroDescription = computed(() => {
  return customerGuidance.value.summary
})

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function hasCartKeyword(keyword) {
  return cart.items.some((item) => normalizeText(item.name).includes(keyword))
}

function loyaltySuggestionScore(product) {
  const name = normalizeText(product?.name)
  const price = Number(product?.price || 0)
  let score = Math.round(price / 10)
  if (price >= 1800 && price <= 4800) score += 2200
  if (fulfillmentMethod.value === 'DELIVERY') {
    if (name.includes('combo')) score += 5200
    if (name.includes('yakisoba') || name.includes('yakissoba')) score += 3900
  } else {
    if (name.includes('temaki')) score += 4600
    if (name.includes('combo')) score += 2800
  }
  if (name.includes('sushi')) score += 2600
  if (name.includes('temaki') && !hasCartKeyword('temaki')) score += 1800
  if (name.includes('combo') && !hasCartKeyword('combo')) score += 1600
  return score
}

function loyaltySuggestionHint(product) {
  const name = normalizeText(product?.name)
  if (name.includes('combo')) return 'Boa pedida para voltar com ticket forte e decisão rápida.'
  if (name.includes('temaki')) return 'Opção leve e fácil de repetir em um próximo pedido.'
  if (name.includes('yakisoba') || name.includes('yakissoba')) return 'Combina bem com delivery e costuma funcionar como refeição completa.'
  if (name.includes('sushi')) return 'Clássico seguro para repetir quando quiser pedir de novo.'
  return 'Item interessante para começar um novo carrinho sem pensar muito.'
}

function statusBadgeClass(status) {
  if (status === 'ENTREGUE') return 'bg-emerald-50 text-emerald-700'
  if (status === 'SAIU_PARA_ENTREGA') return 'bg-orange-50 text-orange-700'
  if (status === 'PREPARANDO') return 'bg-amber-50 text-amber-700'
  return 'bg-slate-100 text-slate-700'
}

function stepCardClass(index) {
  if (index < currentStepIndex.value) return 'border-emerald-200 bg-emerald-50/70'
  if (index === currentStepIndex.value) return 'border-orange-200 bg-orange-50/70 shadow-[0_10px_30px_rgba(255,77,0,0.08)]'
  return 'border-slate-200 bg-slate-50/70'
}

function stepDotClass(index) {
  if (index <= currentStepIndex.value) return 'bg-slate-900 text-white'
  return 'bg-white text-slate-400 ring-1 ring-slate-200'
}

function stepTitleClass(index) {
  if (index <= currentStepIndex.value) return 'text-slate-950'
  return 'text-slate-500'
}

function customerAlertClass(tone) {
  if (tone === 'danger') return 'border-red-200 bg-red-50/80'
  if (tone === 'warning') return 'border-amber-200 bg-amber-50/80'
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50/80'
  return 'border-sky-200 bg-sky-50/80'
}

function customerAlertAccentClass(tone) {
  if (tone === 'danger') return 'text-red-700'
  if (tone === 'warning') return 'text-amber-700'
  if (tone === 'success') return 'text-emerald-700'
  return 'text-sky-700'
}

function applyPublicOrder(order) {
  if (!order) return
  currentOrder.value = {
    id: order.id,
    status: order.status,
    fulfillmentMethod: order.fulfillmentMethod,
    paymentMethod: order.paymentMethod,
    paymentProofUrl: order.paymentProofUrl,
    total: order.total,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  }
  proofOk.value = Boolean(order.paymentProofUrl) || proofOk.value
}

function buildApiUrl(path) {
  const base = String(api.defaults.baseURL || '/api').replace(/\/+$/, '')
  if (/^https?:\/\//i.test(base)) return `${base}${path}`
  const normalizedBase = base.startsWith('/') ? base : `/${base}`
  return `${window.location.origin}${normalizedBase}${path}`
}

function closeOrderStream() {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
  streamConnected.value = false
}

async function loadOrderStatus() {
  if (!orderId.value || !tenant.slug) return
  trackingLoading.value = true
  trackingError.value = null
  try {
    const { data } = await api.get(`/t/${encodeURIComponent(tenant.slug)}/public/orders/${encodeURIComponent(orderId.value)}`)
    applyPublicOrder(data?.order)
  } catch (e) {
    trackingError.value = e?.response?.data?.message || 'Não foi possível carregar o status do pedido.'
  } finally {
    trackingLoading.value = false
  }
}

async function loadMenu() {
  if (!tenant.slug) return
  try {
    const { data } = await api.get(`/t/${encodeURIComponent(tenant.slug)}/public/menu`)
    categories.value = data?.categories || []
  } catch {}
}

function openOrderStream() {
  if (!orderId.value || !tenant.slug || typeof EventSource === 'undefined') return
  closeOrderStream()
  eventSource = new EventSource(
    buildApiUrl(`/t/${encodeURIComponent(tenant.slug)}/public/orders/${encodeURIComponent(orderId.value)}/stream`)
  )
  eventSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data || '{}')
      if (payload?.order) {
        applyPublicOrder(payload.order)
        trackingError.value = null
        streamConnected.value = true
      }
    } catch {}
  }
  eventSource.onerror = () => {
    streamConnected.value = false
  }
}

function addSuggestedToCart(product) {
  cart.add(product)
  ui.toast({ message: `${product.name} adicionado ao carrinho.` })
}

async function copyPixKey() {
  const key = tenant.restaurant?.pixKey
  if (!key) return
  copied.value = false
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(key)
  } else {
    const ta = document.createElement('textarea')
    ta.value = key
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  copied.value = true
  ui.toast({ message: 'Chave PIX copiada.' })
  setTimeout(() => (copied.value = false), 2000)
}

async function copyOrderId() {
  if (!orderId.value) return
  copiedOrderId.value = false
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(String(orderId.value))
  } else {
    const ta = document.createElement('textarea')
    ta.value = String(orderId.value)
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  copiedOrderId.value = true
  ui.toast({ message: 'Número do pedido copiado.' })
  setTimeout(() => (copiedOrderId.value = false), 2000)
}

function onPickFile(e) {
  proofOk.value = false
  proofError.value = null
  const f = e?.target?.files?.[0]
  proofFile.value = f || null
  proofFileName.value = f ? f.name : ''
}

async function uploadProof() {
  proofOk.value = false
  proofError.value = null
  if (!orderId.value || !proofFile.value || !tenant.slug) return
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', proofFile.value)
    const { data } = await api.post(`/t/${encodeURIComponent(tenant.slug)}/public/orders/${encodeURIComponent(orderId.value)}/payment-proof`, fd)
    applyPublicOrder(data?.order)
    proofOk.value = true
    ui.toast({ message: 'Comprovante enviado com sucesso.' })
  } catch (e) {
    proofError.value = e?.response?.data?.message || 'Não foi possível enviar o comprovante.'
    ui.toast({ message: proofError.value, type: 'error' })
  } finally {
    uploading.value = false
  }
}

async function shareOrder() {
  const text = `Pedido ${orderId.value || ''} no ${tenant.restaurant?.name || tenant.slug}.`
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Pedido realizado', text, url: window.location.href })
      ui.toast({ message: 'Pedido compartilhado.' })
      return
    } catch {}
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(`${text} ${window.location.href}`)
    ui.toast({ message: 'Link do pedido copiado.' })
  }
}

watch(
  [orderId, () => tenant.slug],
  async ([id, slug]) => {
    closeOrderStream()
    currentOrder.value = null
    trackingError.value = null
    if (!id || !slug) return
    cart.load()
    await loadMenu()
    await loadOrderStatus()
    openOrderStream()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  closeOrderStream()
  if (clockTimer) clearInterval(clockTimer)
})

onMounted(() => {
  clockTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 60000)
})
</script>
