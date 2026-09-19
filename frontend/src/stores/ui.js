import { defineStore } from 'pinia'

let toastSeq = 0

export const useUiStore = defineStore('ui', {
  state: () => ({
    toasts: []
  }),
  actions: {
    toast({ message, type = 'success', duration = 3200 }) {
      const id = `toast_${Date.now()}_${toastSeq++}`
      this.toasts.push({ id, message: String(message || ''), type })
      if (duration > 0) {
        setTimeout(() => {
          this.dismissToast(id)
        }, duration)
      }
      return id
    },
    dismissToast(id) {
      this.toasts = this.toasts.filter((t) => t.id !== id)
    }
  }
})
