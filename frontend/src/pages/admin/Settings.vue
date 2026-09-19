<template>
  <AppShell>
    <div class="pv-container max-w-6xl">
      <div class="pv-card p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="pv-subtitle">Configurações</div>
            <div class="pv-title">{{ tenant.restaurant?.name || tenant.slug }}</div>
          </div>
          <div class="text-sm text-slate-600">Dados, tema, endereço e regras de entrega.</div>
        </div>
      </div>

      <form class="mt-6 space-y-4" @submit.prevent="save">
        <div class="pv-card p-4">
          <div class="text-sm font-extrabold text-slate-900">Identidade da loja</div>

          <div class="mt-4 space-y-3">
            <input v-model.trim="form.name" class="pv-input" placeholder="Nome" />
            <select v-model="form.commerceType" class="pv-select">
              <option value="GENERAL">Comércio local</option><option value="MARKET">Mercado</option><option value="PHARMACY">Farmácia</option><option value="CONVENIENCE">Conveniência</option><option value="PET_SHOP">Pet shop</option><option value="RESTAURANT">Restaurante</option>
            </select>
            <input v-model.trim="form.heroTitle" class="pv-input" maxlength="120" placeholder="Título da home" />
            <textarea v-model.trim="form.heroDescription" rows="3" class="pv-textarea" maxlength="300" placeholder="Descrição da home"></textarea>
            <label class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <div class="text-sm font-extrabold text-slate-900">Loja aberta</div>
                <div class="mt-1 text-xs text-slate-600">Quando desligado, o checkout bloqueia e mostra uma mensagem.</div>
              </div>
              <input v-model="form.isOpen" type="checkbox" class="h-5 w-5" />
            </label>
            <textarea v-model.trim="form.closedMessage" rows="3" class="pv-textarea" placeholder="Mensagem quando estiver fechado (opcional)"></textarea>
            <input v-model.trim="form.whatsappNumber" class="pv-input" placeholder="WhatsApp (somente números, DDI+DDD+Número)" />
            <input v-model.trim="form.pixKey" class="pv-input" placeholder="Chave PIX (ex: celular, email, aleatória)" />
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
            <div class="rounded-2xl border border-orange-100 bg-orange-50 p-4">
              <div class="text-xs font-bold uppercase tracking-[0.22em] text-orange-800">Prévia do tema</div>
              <div class="mt-3 flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black text-white" :style="{ backgroundColor: form.themePrimary || '#FF4D00' }">
                  {{ (form.name || 'PV').slice(0, 2).toUpperCase() }}
                </div>
                <div class="min-w-0">
                  <div class="text-sm font-extrabold text-slate-900">{{ form.name || 'Sua loja' }}</div>
                  <div class="mt-1 text-xs" :style="{ color: form.themeSecondary || '#222222' }">Assim sua identidade aparece no sistema e no catálogo.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="pv-card p-4">
          <div class="text-sm font-extrabold text-slate-900">Endereço (origem)</div>
          <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[200px_1fr_auto]">
            <input v-model.trim="zipModel" class="pv-input" placeholder="CEP" />
            <div class="flex items-center rounded-2xl border border-orange-100 bg-orange-50 px-4 text-sm text-orange-900">
              Digite o CEP para preencher rua, bairro, cidade e UF mais rápido.
            </div>
            <button type="button" class="pv-btn pv-btn-ghost" :disabled="zipLoading || !canLookupZip" @click="lookupZip">
              {{ zipLoading ? 'Buscando...' : 'Buscar CEP' }}
            </button>
          </div>
          <div v-if="zipFeedback" class="mt-3 rounded-2xl p-4 text-sm" :class="zipError ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-emerald-200 bg-emerald-50 text-emerald-900'">
            {{ zipFeedback }}
          </div>
          <div class="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            <input v-model.trim="form.addressStreet" class="pv-input" placeholder="Rua" />
            <input v-model.trim="form.addressNumber" class="pv-input" placeholder="Número" />
            <input v-model.trim="form.addressNeighborhood" class="pv-input" placeholder="Bairro" />
            <input v-model.trim="form.addressCity" class="pv-input" placeholder="Cidade" />
            <input v-model.trim="form.addressState" class="pv-input" placeholder="UF (ex: SP)" />
            <input v-model.trim="zipModel" class="pv-input" placeholder="CEP" />
          </div>
          <details class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <summary class="cursor-pointer text-sm font-extrabold text-slate-900">Localização técnica (opcional)</summary>
            <div class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              <input v-model.number="form.locationLat" class="pv-input" placeholder="Latitude (ex: -23.55)" />
              <input v-model.number="form.locationLng" class="pv-input" placeholder="Longitude (ex: -46.63)" />
            </div>
            <div class="mt-3 text-xs text-slate-500">Use apenas se você realmente precisar de coordenadas manuais.</div>
          </details>
          <div class="mt-3 flex flex-wrap gap-2">
            <a v-if="mapUrl" :href="mapUrl" target="_blank" rel="noreferrer" class="pv-btn pv-btn-ghost">
              Abrir localização no Maps
            </a>
          </div>
        </div>

        <div class="pv-card p-4">
          <div class="text-sm font-extrabold text-slate-900">Entrega</div>
          <div class="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            <input v-model.number="form.deliveryFeeReais" class="pv-input" placeholder="Taxa de entrega (R$)" />
            <input v-model.number="form.minOrderReais" class="pv-input" placeholder="Pedido mínimo (R$)" />
          </div>
          <textarea
            v-model.trim="form.deliveryNeighborhoodsText"
            rows="5"
            class="pv-textarea mt-3"
            placeholder="Bairros atendidos (1 por linha). Deixe vazio para atender qualquer bairro."
          ></textarea>
        </div>

        <button :disabled="saving" class="pv-btn pv-btn-primary w-full">
          {{ saving ? 'Salvando...' : 'Salvar' }}
        </button>

        <div v-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{{ error }}</div>
        <div v-if="ok" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Salvo com sucesso.</div>
      </form>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../../api/client'
import { useTenantStore } from '../../stores/tenant'
import { useUiStore } from '../../stores/ui'
import AppShell from '../../components/AppShell.vue'

const route = useRoute()
const tenant = useTenantStore()
const ui = useUiStore()

const saving = ref(false)
const error = ref(null)
const ok = ref(false)
const zipLoading = ref(false)
const zipFeedback = ref('')
const zipError = ref(false)

const form = reactive({
  name: '',
  commerceType: 'GENERAL',
  heroTitle: '',
  heroDescription: '',
  isOpen: true,
  closedMessage: '',
  whatsappNumber: '',
  pixKey: '',
  themePrimary: '',
  themeSecondary: '',
  addressStreet: '',
  addressNumber: '',
  addressNeighborhood: '',
  addressCity: '',
  addressState: '',
  addressZip: '',
  locationLat: null,
  locationLng: null,
  deliveryFeeReais: 0,
  minOrderReais: 0,
  deliveryNeighborhoodsText: ''
})

const mapUrl = computed(() => {
  if (typeof form.locationLat === 'number' && typeof form.locationLng === 'number') {
    return `https://www.google.com/maps?q=${form.locationLat},${form.locationLng}`
  }
  const parts = [form.addressStreet, form.addressNumber, form.addressNeighborhood, form.addressCity, form.addressState, form.addressZip]
    .map((p) => String(p || '').trim())
    .filter(Boolean)
  if (!parts.length) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`
})

const zipModel = computed({
  get: () => formatZip(form.addressZip),
  set: (v) => {
    form.addressZip = String(v || '').replace(/\D/g, '').slice(0, 8)
    zipFeedback.value = ''
    zipError.value = false
  }
})

const canLookupZip = computed(() => String(form.addressZip || '').replace(/\D/g, '').length === 8)

function slug() {
  return typeof route.params.restaurantSlug === 'string' ? route.params.restaurantSlug : null
}

function formatZip(value) {
  const d = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

async function lookupZip() {
  zipFeedback.value = ''
  zipError.value = false
  const zip = String(form.addressZip || '').replace(/\D/g, '')
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
      ui.toast({ message: zipFeedback.value, type: 'warning' })
      return
    }
    form.addressStreet = data?.logradouro || form.addressStreet
    form.addressNeighborhood = data?.bairro || form.addressNeighborhood
    form.addressCity = data?.localidade || form.addressCity
    form.addressState = data?.uf || form.addressState
    zipFeedback.value = 'CEP encontrado. Endereço preenchido.'
    ui.toast({ message: zipFeedback.value })
  } catch {
    zipError.value = true
    zipFeedback.value = 'Não foi possível buscar o CEP agora.'
    ui.toast({ message: zipFeedback.value, type: 'error' })
  } finally {
    zipLoading.value = false
  }
}

async function load() {
  const s = slug()
  if (!s) return
  const { data } = await api.get(`/t/${encodeURIComponent(s)}/admin/restaurant`)
  form.name = data.restaurant.name || ''
  form.commerceType = data.restaurant.commerceType || 'GENERAL'
  form.heroTitle = data.restaurant.heroTitle || ''
  form.heroDescription = data.restaurant.heroDescription || ''
  form.isOpen = data.restaurant.isOpen !== false
  form.closedMessage = data.restaurant.closedMessage || ''
  form.whatsappNumber = data.restaurant.whatsappNumber || ''
  form.pixKey = data.restaurant.pixKey || ''
  form.themePrimary = data.restaurant.themePrimary || ''
  form.themeSecondary = data.restaurant.themeSecondary || ''
  form.addressStreet = data.restaurant.addressStreet || ''
  form.addressNumber = data.restaurant.addressNumber || ''
  form.addressNeighborhood = data.restaurant.addressNeighborhood || ''
  form.addressCity = data.restaurant.addressCity || ''
  form.addressState = data.restaurant.addressState || ''
  form.addressZip = data.restaurant.addressZip || ''
  form.locationLat = data.restaurant.locationLat ?? null
  form.locationLng = data.restaurant.locationLng ?? null
  form.deliveryFeeReais = Number(((data.restaurant.deliveryFee || 0) / 100).toFixed(2))
  form.minOrderReais = Number(((data.restaurant.minOrder || 0) / 100).toFixed(2))
  form.deliveryNeighborhoodsText = Array.isArray(data.restaurant.deliveryNeighborhoods)
    ? data.restaurant.deliveryNeighborhoods.join('\n')
    : ''
}

async function save() {
  error.value = null
  ok.value = false
  const s = slug()
  if (!s) return
  saving.value = true
  try {
    const neighborhoods = form.deliveryNeighborhoodsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    await api.patch(`/t/${encodeURIComponent(s)}/admin/restaurant`, {
      name: form.name,
      commerceType: form.commerceType,
      heroTitle: form.heroTitle || null,
      heroDescription: form.heroDescription || null,
      isOpen: form.isOpen,
      closedMessage: form.closedMessage || null,
      whatsappNumber: form.whatsappNumber || null,
      pixKey: form.pixKey || null,
      themePrimary: form.themePrimary || null,
      themeSecondary: form.themeSecondary || null,
      addressStreet: form.addressStreet || null,
      addressNumber: form.addressNumber || null,
      addressNeighborhood: form.addressNeighborhood || null,
      addressCity: form.addressCity || null,
      addressState: form.addressState || null,
      addressZip: form.addressZip || null,
      locationLat: typeof form.locationLat === 'number' ? form.locationLat : null,
      locationLng: typeof form.locationLng === 'number' ? form.locationLng : null,
      deliveryFee: Math.round(Number(form.deliveryFeeReais || 0) * 100),
      minOrder: Math.round(Number(form.minOrderReais || 0) * 100),
      deliveryNeighborhoods: neighborhoods.length ? neighborhoods : null
    })
    ok.value = true
    await tenant.loadBySlug(s)
    ui.toast({ message: 'Configurações salvas com sucesso.' })
  } catch (e) {
    error.value = e?.response?.data?.message || 'Erro ao salvar.'
    ui.toast({ message: error.value, type: 'error' })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await load()
})
</script>
