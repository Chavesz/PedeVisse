<template>
  <div class="pointer-events-none fixed inset-x-4 top-4 z-[70] flex justify-center sm:justify-end">
    <transition-group
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
      class="flex w-full max-w-sm flex-col gap-2"
      tag="div"
    >
      <div
        v-for="toast in ui.toasts"
        :key="toast.id"
        class="pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg backdrop-blur"
        :class="toastClass(toast.type)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="text-sm font-bold">{{ toast.message }}</div>
          <button type="button" class="rounded-full px-2 py-1 text-xs font-black" @click="ui.dismissToast(toast.id)">x</button>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useUiStore } from '../stores/ui'

const ui = useUiStore()

function toastClass(type) {
  if (type === 'error') return 'border-red-200 bg-red-50/95 text-red-900'
  if (type === 'warning') return 'border-amber-200 bg-amber-50/95 text-amber-900'
  return 'border-emerald-200 bg-emerald-50/95 text-emerald-900'
}
</script>
