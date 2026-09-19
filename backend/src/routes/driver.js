import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { authenticate, requireActiveSubscription, requireDriver } from '../middleware/auth.js'
import { withTenant } from '../middleware/tenant.js'
import { publishOrderEvent, subscribeOrderEvents } from '../services/events.js'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfTomorrow() {
  const d = startOfToday()
  d.setDate(d.getDate() + 1)
  return d
}

function serializeDriverOrder(order) {
  return {
    ...order,
    assignedDriver: order.assignedDriver ? { id: order.assignedDriver.id, email: order.assignedDriver.email } : null,
    items: (order.items || []).map((i) => ({ id: i.id, qty: i.qty, productName: i.productName, unitPrice: i.unitPrice }))
  }
}

function isDriverRelevantOrder(order) {
  return Boolean(order) && order.fulfillmentMethod === 'DELIVERY'
}

export function driverRoutes() {
  const router = Router({ mergeParams: true })

  router.use(withTenant)

  router.post('/auth/login', async (req, res) => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) })
    const input = schema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { email: input.email } })
    if (!user || user.role !== 'DRIVER' || user.restaurantId !== req.tenant.restaurantId) {
      return res.status(401).json({ message: 'Credenciais inválidas.' })
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash)
    if (!ok) return res.status(401).json({ message: 'Credenciais inválidas.' })

    const token = signToken({ userId: user.id, role: user.role, restaurantId: user.restaurantId })
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, restaurantId: user.restaurantId } })
  })

  router.use(authenticate, requireDriver(), requireActiveSubscription())

  router.get('/deliveries/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

    const keepAlive = setInterval(() => {
      res.write(`event: ping\ndata: {}\n\n`)
    }, 25000)

    const unsub = subscribeOrderEvents(req.tenant.restaurantId, (payload) => {
      if (!isDriverRelevantOrder(payload?.order)) return
      res.write(`data: ${JSON.stringify({ ...payload, order: serializeDriverOrder(payload.order) })}\n\n`)
    })

    req.on('close', () => {
      clearInterval(keepAlive)
      unsub()
      res.end()
    })
  })

  router.get('/deliveries/available', async (req, res) => {
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: req.tenant.restaurantId,
        status: { in: ['PREPARANDO', 'SAIU_PARA_ENTREGA'] },
        assignedDriverId: null,
        createdAt: { gte: startOfToday(), lt: startOfTomorrow() }
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    })

    res.json({
      orders: orders.map((o) => ({
        ...serializeDriverOrder(o)
      }))
    })
  })

  router.get('/deliveries', async (req, res) => {
    const schema = z.object({
      status: z.enum(['TODO', 'DONE', 'ALL']).optional().default('TODO'),
      mine: z.enum(['0', '1']).optional().default('1')
    })
    const q = schema.parse(req.query)

    const statuses = q.status === 'ALL' ? ['SAIU_PARA_ENTREGA', 'ENTREGUE'] : q.status === 'DONE' ? ['ENTREGUE'] : ['SAIU_PARA_ENTREGA']
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: req.tenant.restaurantId,
        fulfillmentMethod: 'DELIVERY',
        status: { in: statuses },
        ...(q.mine === '1' ? { assignedDriverId: req.user.userId } : {}),
        createdAt: { gte: startOfToday(), lt: startOfTomorrow() }
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    })

    res.json({
      orders: orders.map((o) => ({
        ...serializeDriverOrder(o)
      }))
    })
  })

  router.patch('/deliveries/:orderId/claim', async (req, res) => {
    const orderId = req.params.orderId
    const existing = await prisma.order.findUnique({ where: { id: orderId } })
    if (!existing || existing.restaurantId !== req.tenant.restaurantId) {
      return res.status(404).json({ message: 'Pedido não encontrado.' })
    }
    if (existing.fulfillmentMethod === 'PICKUP') {
      return res.status(400).json({ message: 'Este pedido é para retirada no local.' })
    }
    if (existing.assignedDriverId) {
      return res.status(400).json({ message: 'Esta entrega já foi atribuída.' })
    }
    if (existing.status !== 'PREPARANDO' && existing.status !== 'SAIU_PARA_ENTREGA') {
      return res.status(400).json({ message: 'Este pedido não está disponível para entrega.' })
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { assignedDriverId: req.user.userId, status: 'SAIU_PARA_ENTREGA' },
      include: { items: true, assignedDriver: { select: { id: true, email: true } } }
    })

    publishOrderEvent(req.tenant.restaurantId, 'order.updated', order)
    res.json({ order })
  })

  router.patch('/deliveries/:orderId/status', async (req, res) => {
    const schema = z.object({ status: z.enum(['ENTREGUE']) })
    const input = schema.parse(req.body)
    const orderId = req.params.orderId

    const existing = await prisma.order.findUnique({ where: { id: orderId } })
    if (!existing || existing.restaurantId !== req.tenant.restaurantId) {
      return res.status(404).json({ message: 'Pedido não encontrado.' })
    }
    if (existing.fulfillmentMethod === 'PICKUP') {
      return res.status(400).json({ message: 'Este pedido é para retirada no local.' })
    }
    if (existing.assignedDriverId !== req.user.userId) {
      return res.status(403).json({ message: 'Esta entrega não está atribuída para você.' })
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: input.status },
      include: { items: true, assignedDriver: { select: { id: true, email: true } } }
    })

    publishOrderEvent(req.tenant.restaurantId, 'order.updated', order)
    res.json({ order })
  })

  return router
}
