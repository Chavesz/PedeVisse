import { EventEmitter } from 'node:events'

const emitter = new EventEmitter()

export function publishOrderEvent(restaurantId, type, order) {
  emitter.emit(`orders:${restaurantId}`, { type, order })
}

export function subscribeOrderEvents(restaurantId, handler) {
  const key = `orders:${restaurantId}`
  emitter.on(key, handler)
  return () => emitter.off(key, handler)
}

