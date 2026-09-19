<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#fff8f4_0%,#fffdfb_100%)]">
    <div class="pv-container min-h-screen max-w-6xl">
      <div class="pv-card pv-warm-panel p-5">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div class="pv-subtitle">Finalização</div>
          <h1 class="pv-title">Checkout</h1>
          <div class="mt-2 flex flex-wrap gap-2">
            <span class="pv-badge">1. Carrinho</span>
            <span class="pv-badge bg-orange-100 text-orange-900">2. Checkout</span>
            <span class="pv-badge">3. Confirmação</span>
          </div>
        </div>
        <router-link :to="{ name: 'customer.cart', params: { restaurantSlug: tenant.slug } }" class="pv-btn pv-btn-ghost">
          Voltar
        </router-link>
      </div>
    </div>

    <form class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]" @submit.prevent="submit">
      <div class="space-y-4">
      <div
        v-if="tenant.restaurant && tenant.restaurant.isOpen === false"
        class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <div class="font-semibold">Restaurante fechado</div>
        <div class="mt-1">{{ tenant.restaurant.closedMessage || 'No momento não estamos aceitando pedidos.' }}</div>
      </div>

      <div v-if="minOrder > 0" class="pv-card p-4 text-sm text-slate-700">
        <div class="flex items-center justify-between gap-3">
          <div>
            <div class="font-semibold">Pedido mínimo</div>
            <div class="mt-1">R$ {{ (minOrder / 100).toFixed(2) }}</div>
          </div>
          <div
            class="rounded-full px-3 py-2 text-xs font-extrabold"
            :class="remainingForMinOrder > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'"
          >
            {{ remainingForMinOrder > 0 ? `Faltam R$ ${(remainingForMinOrder / 100).toFixed(2)}` : 'Pedido mínimo atingido' }}
          </div>
        </div>
      </div>

      <div v-if="checkoutOpportunity || checkoutSuggestions.length" class="pv-card p-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div class="text-sm font-extrabold text-slate-900">Antes de fechar</div>
            <div class="mt-1 text-sm text-slate-600">Última chance de completar o pedido e melhorar o valor final sem atrapalhar o checkout.</div>
          </div>
          <div v-if="remainingForMinOrder > 0" class="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Faltam R$ {{ (remainingForMinOrder / 100).toFixed(2) }}
          </div>
        </div>

        <div v-if="checkoutOpportunity" class="mt-4 rounded-2xl border p-4" :class="checkoutOpportunity.tone === 'warning' ? 'border-amber-200 bg-amber-50/70' : 'border-slate-200 bg-slate-50'">
          <div class="text-base font-black text-slate-950">{{ checkoutOpportunity.title }}</div>
          <div class="mt-1 text-sm text-slate-700">{{ checkoutOpportunity.message }}</div>
        </div>

        <div v-if="checkoutSuggestions.length" class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div
            v-for="product in checkoutSuggestions"
            :key="`checkout_suggestion_${product.id}`"
            class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-base font-black text-slate-950">{{ product.name }}</div>
                <div class="mt-1 text-sm text-slate-600">{{ checkoutSuggestionHint(product) }}</div>
              </div>
              <div class="text-right">
                <div class="text-base font-black text-[color:var(--pv-primary-strong)]">R$ {{ (product.price / 100).toFixed(2) }}</div>
                <div class="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Sugestão</div>
              </div>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <button type="button" class="pv-btn pv-btn-primary px-4 py-2" @click="addSuggested(product)">Adicionar</button>
              <router-link :to="{ name: 'customer.menu', params: { restaurantSlug: tenant.slug } }" class="pv-chip">
                Ver cardápio
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <div class="pv-card p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-sm font-extrabold text-slate-900">Como você quer receber?</div>
            <div class="mt-1 text-sm text-slate-600">Escolha entrega ou retirada para calcular o total certinho.</div>
          </div>
          <div class="hidden rounded-full bg-orange-50 px-3 py-1 text-xs font-extrabold text-orange-900 md:block">
            Passo 1
          </div>
        </div>
        <div class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <button
            type="button"
            class="pv-btn pv-btn-ghost min-h-[88px] w-full"
            :class="fulfillmentMethod === 'DELIVERY' ? 'border-transparent text-white shadow-sm' : ''"
            :style="fulfillmentMethod === 'DELIVERY' ? { background: 'linear-gradient(135deg, var(--pv-primary) 0%, var(--pv-primary-strong) 100%)' } : {}"
            @click="fulfillmentMethod = 'DELIVERY'"
          >
            <span class="text-base">Entregar em casa</span>
          </button>
          <button
            type="button"
            class="pv-btn pv-btn-ghost min-h-[88px] w-full"
            :class="fulfillmentMethod === 'PICKUP' ? 'border-transparent text-white shadow-sm' : ''"
            :style="fulfillmentMethod === 'PICKUP' ? { background: 'linear-gradient(135deg, var(--pv-primary) 0%, var(--pv-primary-strong) 100%)' } : {}"
            @click="fulfillmentMethod = 'PICKUP'"
          >
            <span class="text-base">Retirar no local</span>
          </button>
        </div>

        <div v-if="fulfillmentMethod === 'PICKUP'" class="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <div class="text-xs font-semibold text-slate-500">Retirada em</div>
          <div class="mt-1 font-semibold text-slate-900">{{ pickupAddress || 'Consulte o endereço do restaurante no WhatsApp.' }}</div>
          <div class="mt-2 text-xs text-slate-600">A taxa de entrega fica R$ 0,00.</div>
        </div>
      </div>

      <div class="pv-card p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-sm font-extrabold text-slate-900">Seus dados</div>
            <div class="mt-1 text-sm text-slate-600">Usamos essas informações para confirmar o pedido.</div>
          </div>
          <div class="hidden rounded-full bg-orange-50 px-3 py-1 text-xs font-extrabold text-orange-900 md:block">
            Passo 2
          </div>
        </div>
        <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input v-model.trim="form.name" class="pv-input" placeholder="Nome" />
          <input v-model.trim="phoneModel" class="pv-input" placeholder="Telefone" />
        </div>
      </div>

      <transition name="pv-fade" mode="out-in">
        <div v-if="fulfillmentMethod === 'DELIVERY'" class="pv-card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-sm font-extrabold text-slate-900">Endereço de entrega</div>
              <div class="mt-1 text-sm text-slate-600">Digite seu CEP para preencher parte do endereço automaticamente.</div>
            </div>
            <div class="hidden rounded-full bg-orange-50 px-3 py-1 text-xs font-extrabold text-orange-900 md:block">
              Passo 3
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr]">
            <div>
              <label class="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-slate-500">CEP</label>
              <input v-model.trim="zipModel" class="pv-input" placeholder="00000-000" />
            </div>
            <div class="flex items-end">
              <button type="button" class="pv-btn pv-btn-ghost w-full md:w-auto" :disabled="zipLoading || !canLookupZip" @click="lookupZip">
                {{ zipLoading ? 'Buscando CEP...' : 'Buscar CEP' }}
              </button>
            </div>
          </div>

          <div v-if="zipFeedback" class="mt-3 rounded-2xl p-3 text-sm" :class="zipError ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'">
            {{ zipFeedback }}
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px]">
            <div>
              <label class="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Rua</label>
              <input v-model.trim="form.street" class="pv-input" placeholder="Rua" />
            </div>
            <div>
              <label class="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Número</label>
              <input v-model.trim="form.number" class="pv-input" placeholder="Número" />
            </div>
          </div>

          <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label class="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Bairro</label>
              <input v-model.trim="form.neighborhood" class="pv-input" placeholder="Bairro" />
            </div>
            <div>
              <label class="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Ponto de referência</label>
              <input v-model.trim="form.reference" class="pv-input" placeholder="Apartamento, casa, portão, referência..." />
            </div>
          </div>

          <div v-if="allowedNeighborhoods && allowedNeighborhoods.length > 0" class="mt-4">
            <div class="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Bairros atendidos</div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="n in allowedNeighborhoods"
                :key="n"
                type="button"
                class="pv-chip"
                :class="isNeighborhoodSelected(n) ? 'border-transparent text-white shadow-sm' : ''"
                :style="isNeighborhoodSelected(n) ? { background: 'linear-gradient(135deg, var(--pv-primary) 0%, var(--pv-primary-strong) 100%)' } : {}"
                @click="form.neighborhood = n"
              >
                {{ n }}
              </button>
            </div>
          </div>
        </div>
      </transition>

      <div class="pv-card p-5">
        <div class="text-sm font-extrabold text-slate-900">Observações gerais</div>
        <div class="mt-1 text-sm text-slate-600">Ex: tocar interfone, sem guardanapo, pedido para empresa.</div>
        <textarea
          v-model.trim="form.note"
          rows="3"
          class="pv-textarea mt-4"
          placeholder="Observações (opcional)"
        ></textarea>
      </div>

      <div class="pv-card p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-sm font-extrabold text-slate-900">Pagamento</div>
            <div class="mt-1 text-sm text-slate-600">Escolha a forma de pagamento para o restaurante separar tudo certo.</div>
          </div>
          <div class="hidden rounded-full bg-orange-50 px-3 py-1 text-xs font-extrabold text-orange-900 md:block">
            Passo 4
          </div>
        </div>
        <div class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <button
            type="button"
            class="pv-btn pv-btn-ghost w-full"
            :class="payment.method === 'PIX' ? 'border-transparent text-white shadow-sm' : ''"
            :style="payment.method === 'PIX' ? { background: 'linear-gradient(135deg, var(--pv-primary) 0%, var(--pv-primary-strong) 100%)' } : {}"
            @click="payment.method = 'PIX'"
          >
            <span class="text-base">PIX</span>
          </button>
          <button
            type="button"
            class="pv-btn pv-btn-ghost w-full"
            :class="payment.method === 'CASH' ? 'border-transparent text-white shadow-sm' : ''"
            :style="payment.method === 'CASH' ? { background: 'linear-gradient(135deg, var(--pv-primary) 0%, var(--pv-primary-strong) 100%)' } : {}"
            @click="payment.method = 'CASH'"
          >
            <span class="text-base">Dinheiro</span>
          </button>
          <button
            type="button"
            class="pv-btn pv-btn-ghost w-full"
            :class="payment.method === 'CARD' ? 'border-transparent text-white shadow-sm' : ''"
            :style="payment.method === 'CARD' ? { background: 'linear-gradient(135deg, var(--pv-primary) 0%, var(--pv-primary-strong) 100%)' } : {}"
            @click="payment.method = 'CARD'"
          >
            <span class="text-base">Cartão</span>
          </button>
        </div>

        <transition name="pv-fade" mode="out-in">
          <div v-if="payment.method === 'PIX'" key="pix" class="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <div class="text-xs font-semibold text-slate-500">Chave PIX do restaurante</div>
            <div class="mt-1 break-all font-mono text-sm font-semibold text-slate-900">{{ tenant.restaurant?.pixKey || '-' }}</div>
            <div class="mt-2 text-xs text-slate-600">
              Ao finalizar, envie o comprovante pelo WhatsApp. Se preferir, também dá para anexar na próxima tela.
            </div>
          </div>

          <div v-else-if="payment.method === 'CASH'" key="cash" class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <input v-model.number="payment.changeForReais" class="pv-input" placeholder="Precisa de troco para quanto? (R$) (opcional)" />
          </div>

          <div v-else-if="payment.method === 'CARD'" key="card" class="mt-3 space-y-2">
            <select v-model="payment.cardType" class="pv-select">
              <option disabled value="">Débito ou crédito?</option>
              <option value="DEBIT">Débito</option>
              <option value="CREDIT">Crédito</option>
            </select>
            <select v-model="payment.cardBrand" class="pv-select">
              <option value="">Bandeira (opcional)</option>
              <option value="Visa">Visa</option>
              <option value="Mastercard">Mastercard</option>
              <option value="Elo">Elo</option>
              <option value="American Express">American Express</option>
              <option value="Hipercard">Hipercard</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div v-else key="none"></div>
        </transition>
      </div>

      <div class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" v-if="error">{{ error }}</div>
      </div>

      <div class="space-y-3 lg:sticky lg:top-6 lg:self-start">
      <div class="pv-card p-5 text-sm text-slate-800">
        <div class="text-sm font-extrabold text-slate-900">Resumo do pedido</div>
        <div class="mt-4 space-y-3 border-b border-slate-100 pb-4">
          <div v-for="i in cart.items" :key="i.productId" class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="truncate font-semibold text-slate-900">{{ i.qty }}x {{ i.name }}</div>
              <div v-if="i.note" class="mt-1 text-xs text-orange-700">Obs item: {{ i.note }}</div>
            </div>
            <div class="font-semibold">R$ {{ ((i.price * i.qty) / 100).toFixed(2) }}</div>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <div class="mt-4 text-slate-600">Subtotal</div>
          <div class="font-semibold">R$ {{ (cart.total / 100).toFixed(2) }}</div>
        </div>
        <div class="mt-2 flex items-center justify-between">
          <div class="text-slate-600">Taxa de entrega</div>
          <div class="font-semibold">R$ {{ (deliveryFee / 100).toFixed(2) }}</div>
        </div>
        <div class="mt-2 flex items-center justify-between">
          <div class="text-slate-600">Recebimento</div>
          <div class="font-semibold">{{ fulfillmentMethod === 'PICKUP' ? 'Retirada no local' : 'Entrega em casa' }}</div>
        </div>
        <div class="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
          <div class="font-semibold">Total</div>
          <div class="text-2xl font-black text-[color:var(--pv-primary-strong)]">R$ {{ (grandTotal / 100).toFixed(2) }}</div>
        </div>
        <div v-if="payment.method === 'PIX'" class="mt-4 rounded-2xl bg-orange-50 p-3 text-xs text-orange-900">
          PIX selecionado. Copie a chave e envie o comprovante após o pedido.
        </div>
        <div v-if="fulfillmentMethod === 'PICKUP'" class="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-900">
          Retirada selecionada. Sem taxa de entrega.
        </div>
        <div v-if="checkoutSuggestions.length" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div class="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Boa para completar</div>
          <div class="mt-2 space-y-2">
            <div v-for="product in checkoutSuggestions.slice(0, 2)" :key="`summary_${product.id}`" class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold text-slate-900">{{ product.name }}</div>
                <div class="mt-1 text-xs text-slate-500">{{ checkoutSuggestionHint(product) }}</div>
              </div>
              <button type="button" class="pv-chip shrink-0" @click="addSuggested(product)">Adicionar</button>
            </div>
          </div>
        </div>
      </div>

      <button
        :disabled="submitting || cart.items.length === 0 || tenant.restaurant?.isOpen === false"
        class="pv-btn pv-btn-primary w-full py-5 text-base"
      >
        {{ submitting ? 'Enviando...' : 'Enviar pedido' }}
      </button>
      </div>
    </form>

    <div v-if="cart.items.length > 0" class="fixed inset-x-4 bottom-4 z-40 lg:hidden">
      <div class="rounded-[24px] border border-orange-200 bg-white/95 p-3 shadow-xl backdrop-blur">
        <div class="mb-2 flex items-center justify-between text-sm">
          <div class="font-bold text-slate-900">{{ fulfillmentMethod === 'PICKUP' ? 'Retirada' : 'Entrega' }}</div>
          <div class="font-black text-[color:var(--pv-primary-strong)]">R$ {{ (grandTotal / 100).toFixed(2) }}</div>
        </div>
        <button
          :disabled="submitting || cart.items.length === 0 || tenant.restaurant?.isOpen === false"
          class="pv-btn pv-btn-primary w-full"
          @click="submit"
        >
          {{ submitting ? 'Enviando...' : 'Finalizar pedido' }}
        </button>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../api/client'
import { useTenantStore } from '../../stores/tenant'
import { useCartStore } from '../../stores/cart'

const router = useRouter()
const tenant = useTenantStore()
const cart = useCartStore()

const submitting = ref(false)
const error = ref(null)

const fulfillmentMethod = ref('DELIVERY')
const zipLoading = ref(false)
const zipFeedback = ref('')
const zipError = ref(false)
const categories = ref([])

const deliveryFee = computed(() => (fulfillmentMethod.value === 'PICKUP' ? 0 : Number(tenant.restaurant?.deliveryFee || 0)))
const minOrder = computed(() => Number(tenant.restaurant?.minOrder || 0))
const grandTotal = computed(() => cart.total + deliveryFee.value)
const remainingForMinOrder = computed(() => Math.max(0, minOrder.value - cart.total))
const allProducts = computed(() => categories.value.flatMap((category) => category.products || []))

const pickupAddress = computed(() => {
  const r = tenant.restaurant
  if (!r) return ''
  const parts = []
  if (r.addressStreet) parts.push(r.addressStreet)
  if (r.addressNumber) parts.push(r.addressNumber)
  const line1 = parts.join(', ')
  const line2 = [r.addressNeighborhood, r.addressCity, r.addressState].filter(Boolean).join(' - ')
  const full = [line1, line2].filter(Boolean).join(' / ')
  return full
})

const checkoutSuggestions = computed(() => {
  const inCart = new Set(cart.items.map((item) => item.productId))
  return allProducts.value
    .filter((product) => product.isAvailable && !inCart.has(product.id))
    .map((product) => ({ product, score: checkoutSuggestionScore(product) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.product)
})

const checkoutOpportunity = computed(() => {
  if (remainingForMinOrder.value > 0) {
    return {
      title: 'Vale completar antes de enviar',
      message: `Faltam R$ ${(remainingForMinOrder.value / 100).toFixed(2)} para atingir o pedido mínimo. Um item leve pode destravar a compra agora.`,
      tone: 'warning'
    }
  }
  if (cart.items.some((item) => normalizeText(item.name).includes('combo'))) {
    return {
      title: 'Seu pedido já tem cara de combo',
      message: 'Um complemento simples pode melhorar o ticket final sem aumentar muito o esforço de escolha.',
      tone: 'neutral'
    }
  }
  return {
    title: 'Última chance de subir o ticket',
    message: 'Antes de pagar, vale incluir um item estratégico para aproveitar melhor o pedido.',
    tone: 'neutral'
  }
})

const form = reactive({
  name: '',
  phone: '',
  zip: '',
  street: '',
  number: '',
  neighborhood: '',
  reference: '',
  note: ''
})

const payment = reactive({
  method: 'PIX',
  changeForReais: null,
  cardType: '',
  cardBrand: ''
})

const allowedNeighborhoods = computed(() => {
  const list = tenant.restaurant?.deliveryNeighborhoods
  return Array.isArray(list) ? list : null
})

const zipModel = computed({
  get: () => formatZip(form.zip),
  set: (v) => {
    form.zip = String(v || '').replace(/\D/g, '').slice(0, 8)
    zipFeedback.value = ''
    zipError.value = false
  }
})

const canLookupZip = computed(() => String(form.zip || '').replace(/\D/g, '').length === 8)

function formatPhone(digits) {
  const d = String(digits || '').replace(/\D/g, '').slice(0, 13)
  if (d.length <= 2) return d
  const ddi = d.length > 11 ? d.slice(0, d.length - 11) : ''
  const rest = d.slice(ddi.length)
  const ddd = rest.slice(0, 2)
  const number = rest.slice(2)
  const part1 = number.length > 5 ? number.slice(0, number.length - 4) : number.slice(0, Math.min(5, number.length))
  const part2 = number.length > 4 ? number.slice(-4) : ''
  const base = `(${ddd}) ${part1}${part2 ? `-${part2}` : ''}`.trim()
  return ddi ? `+${ddi} ${base}` : base
}

function formatZip(value) {
  const d = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

const phoneModel = computed({
  get: () => formatPhone(form.phone),
  set: (v) => {
    form.phone = String(v || '').replace(/\D/g, '').slice(0, 13)
  }
})

function recentOrderStorageKey(slug) {
  return `pv_recent_order_${slug || 'unknown'}`
}

function persistRecentOrder(slug) {
  try {
    const subtotal = Number(cart.total || 0)
    const total = subtotal + Number(fulfillmentMethod.value === 'PICKUP' ? 0 : tenant.restaurant?.deliveryFee || 0)
    localStorage.setItem(
      recentOrderStorageKey(slug),
      JSON.stringify({
        restaurantSlug: slug,
        createdAt: new Date().toISOString(),
        fulfillmentMethod: fulfillmentMethod.value,
        paymentMethod: payment.method,
        itemCount: cart.count,
        subtotal,
        total,
        items: cart.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          qty: item.qty
        }))
      })
    )
  } catch {}
}

onMounted(async () => {
  cart.load()
  await loadMenu()
})

watch(
  () => tenant.slug,
  async () => {
    cart.load()
    await loadMenu()
  }
)

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function hasCartKeyword(keyword) {
  return cart.items.some((item) => normalizeText(item.name).includes(keyword))
}

function checkoutSuggestionScore(product) {
  const name = normalizeText(product?.name)
  const price = Number(product?.price || 0)
  let score = 0
  if (remainingForMinOrder.value > 0) {
    if (price <= remainingForMinOrder.value * 1.25) score += 6800
    if (price >= remainingForMinOrder.value * 0.55 && price <= remainingForMinOrder.value * 1.1) score += 3400
  } else if (price >= 1800 && price <= 4600) {
    score += 2600
  }
  if (name.includes('combo') && !hasCartKeyword('combo')) score += 5000
  if ((name.includes('yakisoba') || name.includes('yakissoba')) && !hasCartKeyword('yakisoba') && !hasCartKeyword('yakissoba')) score += 4200
  if (name.includes('temaki') && !hasCartKeyword('temaki')) score += 3600
  if (name.includes('sushi') && !hasCartKeyword('sushi')) score += 2200
  return score + Math.round(price / 10)
}

function checkoutSuggestionHint(product) {
  const name = normalizeText(product?.name)
  if (remainingForMinOrder.value > 0) return 'Ajuda a bater o mínimo e libera o envio do pedido.'
  if (name.includes('combo')) return 'Boa pedida para transformar o fechamento em um combo de maior valor.'
  if (name.includes('temaki')) return 'Extra fácil de encaixar no fim da compra.'
  if (name.includes('yakisoba') || name.includes('yakissoba')) return 'Complementa bem a refeição e eleva o total com facilidade.'
  return 'Combina com o momento da compra e aumenta o valor do pedido.'
}

function addSuggested(product) {
  cart.add(product)
}

async function loadMenu() {
  if (!tenant.slug) return
  const { data } = await api.get(`/t/${encodeURIComponent(tenant.slug)}/public/menu`)
  categories.value = data.categories || []
}

function isNeighborhoodSelected(value) {
  return String(form.neighborhood || '').trim().toLowerCase() === String(value || '').trim().toLowerCase()
}

async function lookupZip() {
  zipFeedback.value = ''
  zipError.value = false
  const zip = String(form.zip || '').replace(/\D/g, '')
  if (zip.length !== 8) {
    zipError.value = true
    zipFeedback.value = 'Digite um CEP válido com 8 números.'
    return
  }
  zipLoading.value = true
  try {
    const { data } = await api.get(`https://viacep.com.br/ws/${zip}/json/`, { timeout: 12000 })
    if (data?.erro) {
      zipError.value = true
      zipFeedback.value = 'CEP não encontrado.'
      return
    }
    form.street = data?.logradouro || form.street
    form.neighborhood = data?.bairro || form.neighborhood
    zipError.value = false
    zipFeedback.value = 'CEP encontrado. Rua e bairro preenchidos.'
  } catch {
    zipError.value = true
    zipFeedback.value = 'Não foi possível consultar o CEP agora.'
  } finally {
    zipLoading.value = false
  }
}

async function submit() {
  error.value = null
  if (!tenant.slug) return
  if (cart.items.length === 0) return
  if (tenant.restaurant?.isOpen === false) {
    error.value = tenant.restaurant.closedMessage || 'Restaurante fechado no momento.'
    return
  }
  if (minOrder.value > 0 && cart.total < minOrder.value) {
    error.value = `Pedido mínimo: R$ ${(minOrder.value / 100).toFixed(2)}`
    return
  }
  if (!form.name || !form.phone) {
    error.value = 'Preencha nome e telefone.'
    return
  }
  if (fulfillmentMethod.value === 'DELIVERY' && (!form.street || !form.number || !form.neighborhood)) {
    error.value = 'Preencha o endereço completo.'
    return
  }
  if (String(form.phone).replace(/\D/g, '').length < 10) {
    error.value = 'Telefone inválido.'
    return
  }
  if (fulfillmentMethod.value === 'DELIVERY' && allowedNeighborhoods.value && allowedNeighborhoods.value.length > 0) {
    const norm = (s) => String(s || '').trim().toLowerCase()
    const ok = allowedNeighborhoods.value.some((n) => norm(n) === norm(form.neighborhood))
    if (!ok) {
      error.value = 'Endereço fora da área de entrega.'
      return
    }
  }
  if (payment.method === 'PIX' && !tenant.restaurant?.pixKey) {
    error.value = 'Este restaurante ainda não configurou a chave PIX.'
    return
  }
  if (payment.method === 'CARD' && !payment.cardType) {
    error.value = 'Selecione débito ou crédito.'
    return
  }
  submitting.value = true
  try {
    const changeCents =
      payment.method === 'CASH' && typeof payment.changeForReais === 'number' && payment.changeForReais > 0
        ? Math.round(Number(payment.changeForReais) * 100)
        : null
    const payload = {
      fulfillmentMethod: fulfillmentMethod.value,
      customer: {
        name: form.name,
        phone: form.phone,
        note: form.note || null,
        address:
          fulfillmentMethod.value === 'DELIVERY'
            ? {
                street: form.street,
                number: form.number,
                neighborhood: form.neighborhood,
                reference: form.reference
              }
            : null
      },
      paymentMethod: payment.method,
      paymentChangeCents: changeCents,
      cardType: payment.method === 'CARD' ? payment.cardType : null,
      cardBrand: payment.method === 'CARD' ? payment.cardBrand || null : null,
      items: cart.items.map((i) => ({ productId: i.productId, qty: i.qty, note: i.note || null }))
    }
    const { data } = await api.post(`/t/${encodeURIComponent(tenant.slug)}/public/orders`, payload)
    sessionStorage.setItem(
      'pv_last_order',
      JSON.stringify({
        restaurantSlug: tenant.slug,
        orderId: data?.order?.id || null,
        whatsappUrl: data?.whatsappUrl || null,
        paymentMethod: payment.method,
        fulfillmentMethod: fulfillmentMethod.value
      })
    )
    persistRecentOrder(tenant.slug)
    cart.clear()
    router.push({ name: 'customer.success', params: { restaurantSlug: tenant.slug } })
  } catch (e) {
    error.value = e?.response?.data?.message || 'Não foi possível enviar o pedido.'
  } finally {
    submitting.value = false
  }
}
</script>
