<template>
  <AppShell>
    <div class="pv-container max-w-6xl">
      <div class="pv-card pv-warm-panel p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="pv-subtitle">Gestão de catálogo</div>
            <div class="pv-title">{{ tenant.restaurant?.name || tenant.slug }}</div>
            <div class="mt-2 text-sm text-slate-600">Organize categorias, ajuste disponibilidade e mantenha a vitrine sempre pronta para vender.</div>
          </div>
          <div class="text-sm text-slate-600">Cadastre categorias, produtos, preços e imagens.</div>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Categorias</div>
            <div class="mt-2 text-3xl font-black text-slate-950">{{ categories.length }}</div>
          </div>
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Produtos</div>
            <div class="mt-2 text-3xl font-black text-slate-950">{{ products.length }}</div>
          </div>
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Disponíveis</div>
            <div class="mt-2 text-3xl font-black text-slate-950">{{ availableProductsCount }}</div>
          </div>
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Preço médio</div>
            <div class="mt-2 text-3xl font-black text-slate-950">R$ {{ averagePrice }}</div>
          </div>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="pv-card p-4">
          <div class="text-sm font-extrabold text-slate-900">Categorias</div>
          <form class="mt-4 flex gap-2" @submit.prevent="createCategory">
            <input v-model.trim="newCategoryName" class="pv-input flex-1" placeholder="Nome" />
            <button class="pv-btn pv-btn-primary px-4">Criar</button>
          </form>
          <div class="mt-4 space-y-3">
            <div v-for="c in categories" :key="c.id" class="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center">
              <input v-model.trim="c.name" class="pv-input md:flex-1" />
              <div class="flex items-center gap-2">
                <button class="pv-btn pv-btn-ghost px-4" @click="saveCategory(c)">Salvar</button>
                <button class="pv-btn px-4 text-red-700 hover:bg-red-50" @click="deleteCategory(c.id)">Deletar</button>
              </div>
            </div>
          </div>
        </div>

        <div class="pv-card p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="text-sm font-extrabold text-slate-900">Produtos</div>
            <div class="flex flex-wrap gap-2">
              <input v-model.trim="productSearch" class="pv-input min-w-[220px]" placeholder="Buscar produto..." />
              <select v-model="availabilityFilter" class="pv-select min-w-[180px]">
                <option value="ALL">Todos</option>
                <option value="AVAILABLE">Disponíveis</option>
                <option value="UNAVAILABLE">Indisponíveis</option>
              </select>
            </div>
          </div>
          <form class="mt-4 space-y-3" @submit.prevent="createProduct">
            <input v-model.trim="newProduct.name" class="pv-input" placeholder="Nome" />
            <input v-model.trim="newProduct.description" class="pv-input" placeholder="Descrição (opcional)" />
            <input v-model.trim="newProduct.unitLabel" class="pv-input" placeholder="Unidade, ex.: 500 g, caixa com 20" />
            <label class="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold"><input v-model="newProduct.requiresPrescription" type="checkbox" /> Requer receita</label>
            <input v-model.trim="newProduct.imageUrl" class="pv-input" placeholder="Imagem (URL opcional)" />
            <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
              <select v-model="newProduct.categoryId" class="pv-input">
                <option disabled value="">Categoria</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <input v-model.number="newProduct.price" class="pv-input" placeholder="Preço (R$)" />
            </div>
            <button class="pv-btn pv-btn-primary w-full">Criar produto</button>
          </form>

          <div class="mt-4 space-y-3">
            <div v-for="p in visibleProducts" :key="p.id" class="rounded-2xl border border-slate-200 bg-white p-4">
              <div class="mb-4 flex items-start gap-3">
                <div class="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                  <img v-if="previewImage(p.imageUrl)" :src="previewImage(p.imageUrl)" alt="" class="h-full w-full object-cover" />
                  <div v-else class="flex h-full w-full items-center justify-center text-xs font-extrabold text-slate-400">SEM IMAGEM</div>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-base font-black text-slate-950">{{ p.name || 'Produto' }}</div>
                  <div class="mt-1 text-sm text-slate-600">{{ categoryName(p.categoryId) || 'Sem categoria' }}</div>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <span class="pv-badge" :class="p.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'">
                      {{ p.isAvailable ? 'Disponível' : 'Indisponível' }}
                    </span>
                    <span class="pv-badge">R$ {{ Number(p._priceReais || 0).toFixed(2) }}</span>
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
                <input v-model.trim="p.name" class="pv-input" />
                <select v-model="p.categoryId" class="pv-input">
                  <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
                <input v-model.trim="p.description" class="pv-input" placeholder="Descrição" />
                <input v-model.trim="p.unitLabel" class="pv-input" placeholder="Unidade" />
                <input v-model.number="p._priceReais" class="pv-input" placeholder="Preço (R$)" />
                <label class="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold"><input v-model="p.requiresPrescription" type="checkbox" /> Requer receita</label>
              </div>
              <div class="mt-2">
                <input v-model.trim="p.imageUrl" class="pv-input" placeholder="Imagem (URL opcional)" />
              </div>

              <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
                <button
                  class="pv-btn px-4 py-2 text-xs"
                  :class="p.isAvailable ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'"
                  @click="toggleAvailability(p)"
                >
                  {{ p.isAvailable ? 'Disponível' : 'Indisponível' }}
                </button>
                <div class="flex items-center gap-2">
                  <button class="pv-btn pv-btn-primary px-4" @click="saveProduct(p)">Salvar</button>
                  <button class="pv-btn px-4 text-red-700 hover:bg-red-50" @click="deleteProduct(p.id)">Deletar</button>
                </div>
              </div>
            </div>
            <div v-if="visibleProducts.length === 0" class="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
              Nenhum produto encontrado com os filtros atuais.
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
import { useRoute } from 'vue-router'
import { api } from '../../api/client'
import { useTenantStore } from '../../stores/tenant'
import AppShell from '../../components/AppShell.vue'
import combo12Pecas from '../../assets/combo-12-peças.jpg'
import temakiFrito from '../../assets/temaki-frito.jpg'
import temakiNatural from '../../assets/temaki-natural.jpg'
import sushiFrito from '../../assets/sushi-frito.jpg'
import sushiNatural from '../../assets/sushi-natural.jpg'
import yakissoba from '../../assets/yakissoba.jpg'

const route = useRoute()
const tenant = useTenantStore()

const categories = ref([])
const products = ref([])
const error = ref(null)
const productSearch = ref('')
const availabilityFilter = ref('ALL')

const newCategoryName = ref('')
const newProduct = reactive({ name: '', description: '', unitLabel: '', requiresPrescription: false, imageUrl: '', categoryId: '', price: 0 })

const availableProductsCount = computed(() => (products.value || []).filter((p) => p.isAvailable).length)
const averagePrice = computed(() => {
  const all = products.value || []
  if (!all.length) return '0.00'
  const avg = all.reduce((acc, p) => acc + Number(p.price || 0), 0) / all.length
  return (avg / 100).toFixed(2)
})

const visibleProducts = computed(() => {
  const query = String(productSearch.value || '').trim().toLowerCase()
  const mode = availabilityFilter.value
  return (products.value || []).filter((p) => {
    if (mode === 'AVAILABLE' && !p.isAvailable) return false
    if (mode === 'UNAVAILABLE' && p.isAvailable) return false
    if (!query) return true
    return String(p.name || '').toLowerCase().includes(query) || String(p.description || '').toLowerCase().includes(query)
  })
})

function slug() {
  return typeof route.params.restaurantSlug === 'string' ? route.params.restaurantSlug : null
}

function categoryName(categoryId) {
  return categories.value.find((c) => c.id === categoryId)?.name || ''
}

function previewImage(value) {
  const u = String(value || '').trim()
  if (!u) return null
  if (u === 'asset:combo-12') return combo12Pecas
  if (u === 'asset:temaki-frito') return temakiFrito
  if (u === 'asset:temaki-natural') return temakiNatural
  if (u === 'asset:sushi-frito') return sushiFrito
  if (u === 'asset:sushi-natural') return sushiNatural
  if (u === 'asset:yakissoba') return yakissoba
  return u
}

async function loadAll() {
  error.value = null
  const s = slug()
  if (!s) return
  const [c, p] = await Promise.all([
    api.get(`/t/${encodeURIComponent(s)}/admin/categories`),
    api.get(`/t/${encodeURIComponent(s)}/admin/products`)
  ])
  categories.value = c.data.categories
  products.value = p.data.products.map((prod) => ({
    ...prod,
    _priceReais: Number((prod.price / 100).toFixed(2)),
    imageUrl: prod.imageUrl || ''
  }))
}

async function createCategory() {
  const s = slug()
  if (!s || !newCategoryName.value) return
  await api.post(`/t/${encodeURIComponent(s)}/admin/categories`, { name: newCategoryName.value })
  newCategoryName.value = ''
  await loadAll()
}

async function deleteCategory(id) {
  const s = slug()
  if (!s) return
  await api.delete(`/t/${encodeURIComponent(s)}/admin/categories/${id}`)
  await loadAll()
}

async function saveCategory(c) {
  const s = slug()
  if (!s || !c?.id || !c?.name) return
  await api.patch(`/t/${encodeURIComponent(s)}/admin/categories/${c.id}`, { name: c.name })
  await loadAll()
}

async function createProduct() {
  const s = slug()
  if (!s || !newProduct.name || !newProduct.categoryId || !newProduct.price) return
  await api.post(`/t/${encodeURIComponent(s)}/admin/products`, {
    name: newProduct.name,
    description: newProduct.description || null,
    unitLabel: newProduct.unitLabel || null,
    requiresPrescription: newProduct.requiresPrescription,
    imageUrl: newProduct.imageUrl || null,
    categoryId: newProduct.categoryId,
    priceCents: Math.round(Number(newProduct.price) * 100)
  })
  newProduct.name = ''
  newProduct.description = ''
  newProduct.unitLabel = ''
  newProduct.requiresPrescription = false
  newProduct.imageUrl = ''
  newProduct.categoryId = ''
  newProduct.price = 0
  await loadAll()
}

async function deleteProduct(id) {
  const s = slug()
  if (!s) return
  await api.delete(`/t/${encodeURIComponent(s)}/admin/products/${id}`)
  await loadAll()
}

async function toggleAvailability(p) {
  const s = slug()
  if (!s) return
  await api.patch(`/t/${encodeURIComponent(s)}/admin/products/${p.id}`, { isAvailable: !p.isAvailable })
  await loadAll()
}

async function saveProduct(p) {
  const s = slug()
  if (!s || !p?.id || !p?.name || !p?.categoryId) return
  const priceCents = Math.round(Number(p._priceReais || 0) * 100)
  if (!priceCents) return
  await api.patch(`/t/${encodeURIComponent(s)}/admin/products/${p.id}`, {
    name: p.name,
    description: p.description || null,
    unitLabel: p.unitLabel || null,
    requiresPrescription: Boolean(p.requiresPrescription),
    imageUrl: p.imageUrl || null,
    categoryId: p.categoryId,
    priceCents
  })
  await loadAll()
}

onMounted(async () => {
  try {
    await loadAll()
  } catch (e) {
    error.value = e?.response?.data?.message || 'Erro ao carregar catálogo.'
  }
})
</script>
