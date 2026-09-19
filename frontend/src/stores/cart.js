import { defineStore } from 'pinia'
import { useTenantStore } from './tenant'

function storageKey(slug) {
  return `pv_cart_${slug || 'unknown'}`
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: []
  }),
  getters: {
    count: (s) => s.items.reduce((acc, i) => acc + i.qty, 0),
    total: (s) => s.items.reduce((acc, i) => acc + i.qty * i.price, 0)
  },
  actions: {
    load() {
      const tenant = useTenantStore()
      const raw = localStorage.getItem(storageKey(tenant.slug))
      this.items = raw ? JSON.parse(raw) : []
    },
    persist() {
      const tenant = useTenantStore()
      localStorage.setItem(storageKey(tenant.slug), JSON.stringify(this.items))
    },
    add(product) {
      const existing = this.items.find((i) => i.productId === product.id)
      if (existing) existing.qty += 1
      else this.items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        unitLabel: product.unitLabel || null,
        requiresPrescription: Boolean(product.requiresPrescription),
        qty: 1,
        note: ''
      })
      this.persist()
    },
    dec(productId) {
      const idx = this.items.findIndex((i) => i.productId === productId)
      if (idx === -1) return
      this.items[idx].qty -= 1
      if (this.items[idx].qty <= 0) this.items.splice(idx, 1)
      this.persist()
    },
    remove(productId) {
      this.items = this.items.filter((i) => i.productId !== productId)
      this.persist()
    },
    setNote(productId, note) {
      const item = this.items.find((i) => i.productId === productId)
      if (!item) return
      item.note = String(note || '').trim()
      this.persist()
    },
    clear() {
      this.items = []
      this.persist()
    }
  }
})
