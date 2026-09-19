import { defineStore } from 'pinia'
import { api } from '../api/client'
import { useAuthStore } from './auth'

export const useOrdersStore = defineStore('orders', {
  state: () => ({
    orders: [],
    stream: null,
    lastNotifiedOrderId: null,
    newOrderIds: [],
    alertsMuted: false
  }),
  getters: {
    isNew: (s) => (orderId) => s.newOrderIds.includes(orderId),
    countsByStatus: (s) =>
      (s.orders || []).reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1
        return acc
      }, {})
  },
  actions: {
    loadPreferences() {
      try {
        this.alertsMuted = localStorage.getItem('pv_orders_alerts_muted') === '1'
      } catch {}
    },
    setAlertsMuted(value) {
      this.alertsMuted = Boolean(value)
      try {
        localStorage.setItem('pv_orders_alerts_muted', this.alertsMuted ? '1' : '0')
      } catch {}
    },
    toggleAlertsMuted() {
      this.setAlertsMuted(!this.alertsMuted)
    },
    notify() {
      if (this.alertsMuted) return
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.value = 0.05
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.12)
      osc.onended = () => ctx.close()
    },
    markNew(orderId) {
      if (this.newOrderIds.includes(orderId)) return
      this.newOrderIds = [orderId, ...this.newOrderIds].slice(0, 50)
      if (!this._newTimers) this._newTimers = {}
      if (this._newTimers[orderId]) clearTimeout(this._newTimers[orderId])
      this._newTimers[orderId] = setTimeout(() => {
        this.clearNew(orderId)
      }, 25000)
    },
    clearNew(orderId) {
      this.newOrderIds = this.newOrderIds.filter((id) => id !== orderId)
      if (this._newTimers && this._newTimers[orderId]) {
        clearTimeout(this._newTimers[orderId])
        delete this._newTimers[orderId]
      }
    },
    async fetch(slug) {
      this.loadPreferences()
      const { data } = await api.get(`/t/${encodeURIComponent(slug)}/admin/orders`)
      this.orders = data.orders
    },
    async setStatus(slug, orderId, status) {
      const { data } = await api.patch(`/t/${encodeURIComponent(slug)}/admin/orders/${orderId}/status`, { status })
      const idx = this.orders.findIndex((o) => o.id === data.order.id)
      if (idx !== -1) this.orders[idx] = data.order
      else this.orders.unshift(data.order)
    },
    connect(slug) {
      const auth = useAuthStore()
      if (!auth.token) return
      if (this.stream) this.stream.close()
      const url = `/api/t/${encodeURIComponent(slug)}/admin/orders/stream?token=${encodeURIComponent(auth.token)}`
      this.stream = new EventSource(url)
      this.stream.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data)
          if (payload.type === 'order.created' || payload.type === 'order.updated') {
            const order = payload.order
            const idx = this.orders.findIndex((o) => o.id === order.id)
            if (idx !== -1) this.orders[idx] = order
            else this.orders.unshift(order)
            if (payload.type === 'order.created' && this.lastNotifiedOrderId !== order.id) {
              this.lastNotifiedOrderId = order.id
              this.markNew(order.id)
              this.notify()
            }
          }
        } catch {}
      }
    },
    disconnect() {
      if (this.stream) this.stream.close()
      this.stream = null
    }
  }
})
