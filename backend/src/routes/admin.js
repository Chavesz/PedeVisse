import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { authenticate, requireActiveSubscription, requireRestaurantAdmin } from '../middleware/auth.js'
import { withTenant } from '../middleware/tenant.js'
import { publishOrderEvent, subscribeOrderEvents } from '../services/events.js'

export function adminRoutes() {
  const router = Router({ mergeParams: true })

  router.use(withTenant)

  router.post('/auth/login', async (req, res) => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) })
    const input = schema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { email: input.email } })
    if (!user || user.role !== 'RESTAURANT_ADMIN' || user.restaurantId !== req.tenant.restaurantId) {
      return res.status(401).json({ message: 'Credenciais inválidas.' })
    }

    const ok = await bcrypt.compare(input.password, user.passwordHash)
    if (!ok) return res.status(401).json({ message: 'Credenciais inválidas.' })

    const token = signToken({ userId: user.id, role: user.role, restaurantId: user.restaurantId })
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, restaurantId: user.restaurantId } })
  })

  router.get('/orders/stream', authenticate, requireRestaurantAdmin(), requireActiveSubscription(), async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)

    const unsub = subscribeOrderEvents(req.tenant.restaurantId, (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    })

    req.on('close', () => {
      unsub()
      res.end()
    })
  })

  router.use(authenticate, requireRestaurantAdmin())

  router.get('/billing', async (req, res) => {
    const r = req.tenant.restaurant
    res.json({
      restaurant: {
        id: r.id,
        name: r.name,
        slug: r.slug,
        subscriptionPlan: r.subscriptionPlan,
        subscriptionStatus: r.subscriptionStatus,
        subscriptionStartedAt: r.subscriptionStartedAt
      },
      supportWhatsAppNumber: process.env.SAAS_SUPPORT_WHATSAPP || null
    })
  })

  router.post('/billing/checkout', async (req, res) => {
    const schema = z.object({ plan: z.enum(['START', 'PRO', 'SCALE']).optional().default('PRO') })
    const input = schema.parse(req.body)

    const stripeKey = process.env.STRIPE_SECRET_KEY
    const appBaseUrl = process.env.APP_BASE_URL
    const priceStart = process.env.STRIPE_PRICE_START
    const pricePro = process.env.STRIPE_PRICE_PRO
    const priceScale = process.env.STRIPE_PRICE_SCALE

    if (!stripeKey || !appBaseUrl || !priceStart || !pricePro || !priceScale) {
      return res.status(501).json({ message: 'Checkout não configurado. Configure STRIPE_SECRET_KEY, STRIPE_PRICE_* e APP_BASE_URL.' })
    }

    const priceId = input.plan === 'START' ? priceStart : input.plan === 'SCALE' ? priceScale : pricePro

    async function stripePost(endpoint, params) {
      const body = new URLSearchParams(params).toString()
      const r = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      })
      const data = await r.json()
      if (!r.ok) {
        return { ok: false, error: data?.error?.message || 'Erro ao comunicar com o Stripe.' }
      }
      return { ok: true, data }
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: req.tenant.restaurantId } })
    if (!restaurant) return res.status(404).json({ message: 'Restaurante não encontrado.' })

    let customerId = restaurant.stripeCustomerId || null
    if (!customerId) {
      const created = await stripePost('customers', {
        email: req.user?.email || '',
        name: restaurant.name,
        'metadata[restaurantId]': restaurant.id,
        'metadata[restaurantSlug]': restaurant.slug
      })
      if (!created.ok) return res.status(400).json({ message: created.error })
      customerId = created.data.id
      await prisma.restaurant.update({ where: { id: restaurant.id }, data: { stripeCustomerId: customerId } })
    }

    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { subscriptionPlan: input.plan, subscriptionStatus: restaurant.subscriptionStatus === 'ACTIVE' ? 'ACTIVE' : 'TRIALING' }
    })

    const successUrl = `${String(appBaseUrl).replace(/\/+$/, '')}/${encodeURIComponent(restaurant.slug)}/admin/billing?stripe=success`
    const cancelUrl = `${String(appBaseUrl).replace(/\/+$/, '')}/${encodeURIComponent(restaurant.slug)}/admin/billing?stripe=cancel`

    const session = await stripePost('checkout/sessions', {
      mode: 'subscription',
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'metadata[restaurantId]': restaurant.id,
      'metadata[restaurantSlug]': restaurant.slug,
      'metadata[plan]': input.plan,
      'subscription_data[metadata][restaurantId]': restaurant.id,
      'subscription_data[metadata][restaurantSlug]': restaurant.slug,
      'subscription_data[metadata][plan]': input.plan
    })
    if (!session.ok) return res.status(400).json({ message: session.error })

    res.json({ url: session.data.url })
  })

  router.use(requireActiveSubscription())

  router.get('/restaurant', async (req, res) => {
    const r = await prisma.restaurant.findUnique({ where: { id: req.tenant.restaurantId } })
    if (!r) return res.status(404).json({ message: 'Restaurante não encontrado.' })
    res.json({
      restaurant: {
        id: r.id,
        name: r.name,
        slug: r.slug,
        subscriptionPlan: r.subscriptionPlan,
        subscriptionStatus: r.subscriptionStatus,
        whatsappNumber: r.whatsappNumber,
        themePrimary: r.themePrimary,
        themeSecondary: r.themeSecondary,
        commerceType: r.commerceType,
        heroTitle: r.heroTitle,
        heroDescription: r.heroDescription,
        isOpen: r.isOpen,
        closedMessage: r.closedMessage,
        pixKey: r.pixKey,
        addressStreet: r.addressStreet,
        addressNumber: r.addressNumber,
        addressNeighborhood: r.addressNeighborhood,
        addressCity: r.addressCity,
        addressState: r.addressState,
        addressZip: r.addressZip,
        locationLat: r.locationLat,
        locationLng: r.locationLng,
        deliveryFee: r.deliveryFee,
        minOrder: r.minOrder,
        deliveryNeighborhoods: r.deliveryNeighborhoods
      }
    })
  })

  router.patch('/restaurant', async (req, res) => {
    const schema = z.object({
      name: z.string().min(1).optional(),
      whatsappNumber: z.string().optional().nullable(),
      themePrimary: z.string().optional().nullable(),
      themeSecondary: z.string().optional().nullable(),
      commerceType: z.enum(['GENERAL', 'MARKET', 'PHARMACY', 'CONVENIENCE', 'PET_SHOP', 'RESTAURANT']).optional(),
      heroTitle: z.string().max(120).optional().nullable(),
      heroDescription: z.string().max(300).optional().nullable(),
      isOpen: z.boolean().optional(),
      closedMessage: z.string().max(500).optional().nullable(),
      pixKey: z.string().max(120).optional().nullable(),
      addressStreet: z.string().max(120).optional().nullable(),
      addressNumber: z.string().max(20).optional().nullable(),
      addressNeighborhood: z.string().max(80).optional().nullable(),
      addressCity: z.string().max(80).optional().nullable(),
      addressState: z.string().max(2).optional().nullable(),
      addressZip: z.string().max(12).optional().nullable(),
      locationLat: z.number().min(-90).max(90).optional().nullable(),
      locationLng: z.number().min(-180).max(180).optional().nullable(),
      deliveryFee: z.number().int().min(0).optional(),
      minOrder: z.number().int().min(0).optional(),
      deliveryNeighborhoods: z.array(z.string().min(1).max(80)).optional().nullable()
    })
    const input = schema.parse(req.body)

    const whatsappNumber =
      input.whatsappNumber === undefined || input.whatsappNumber === null
        ? input.whatsappNumber
        : String(input.whatsappNumber).replace(/\D/g, '')

    const existing = await prisma.restaurant.findUnique({ where: { id: req.tenant.restaurantId } })
    if (!existing) return res.status(404).json({ message: 'Restaurante não encontrado.' })

    const restaurant = await prisma.restaurant.update({
      where: { id: req.tenant.restaurantId },
      data: {
        name: input.name ?? existing.name,
        whatsappNumber: whatsappNumber !== undefined ? whatsappNumber : existing.whatsappNumber,
        themePrimary: input.themePrimary !== undefined ? input.themePrimary : existing.themePrimary,
        themeSecondary: input.themeSecondary !== undefined ? input.themeSecondary : existing.themeSecondary,
        commerceType: input.commerceType ?? existing.commerceType,
        heroTitle: input.heroTitle !== undefined ? input.heroTitle : existing.heroTitle,
        heroDescription: input.heroDescription !== undefined ? input.heroDescription : existing.heroDescription,
        isOpen: input.isOpen ?? existing.isOpen,
        closedMessage: input.closedMessage !== undefined ? input.closedMessage : existing.closedMessage,
        pixKey: input.pixKey !== undefined ? input.pixKey : existing.pixKey,
        addressStreet: input.addressStreet !== undefined ? input.addressStreet : existing.addressStreet,
        addressNumber: input.addressNumber !== undefined ? input.addressNumber : existing.addressNumber,
        addressNeighborhood: input.addressNeighborhood !== undefined ? input.addressNeighborhood : existing.addressNeighborhood,
        addressCity: input.addressCity !== undefined ? input.addressCity : existing.addressCity,
        addressState: input.addressState !== undefined ? input.addressState : existing.addressState,
        addressZip: input.addressZip !== undefined ? input.addressZip : existing.addressZip,
        locationLat: input.locationLat !== undefined ? input.locationLat : existing.locationLat,
        locationLng: input.locationLng !== undefined ? input.locationLng : existing.locationLng,
        deliveryFee: input.deliveryFee !== undefined ? input.deliveryFee : existing.deliveryFee,
        minOrder: input.minOrder !== undefined ? input.minOrder : existing.minOrder,
        deliveryNeighborhoods: input.deliveryNeighborhoods !== undefined ? input.deliveryNeighborhoods : existing.deliveryNeighborhoods
      }
    })

    res.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        whatsappNumber: restaurant.whatsappNumber,
        themePrimary: restaurant.themePrimary,
        themeSecondary: restaurant.themeSecondary,
        commerceType: restaurant.commerceType,
        heroTitle: restaurant.heroTitle,
        heroDescription: restaurant.heroDescription,
        isOpen: restaurant.isOpen,
        closedMessage: restaurant.closedMessage,
        pixKey: restaurant.pixKey,
        addressStreet: restaurant.addressStreet,
        addressNumber: restaurant.addressNumber,
        addressNeighborhood: restaurant.addressNeighborhood,
        addressCity: restaurant.addressCity,
        addressState: restaurant.addressState,
        addressZip: restaurant.addressZip,
        locationLat: restaurant.locationLat,
        locationLng: restaurant.locationLng,
        deliveryFee: restaurant.deliveryFee,
        minOrder: restaurant.minOrder,
        deliveryNeighborhoods: restaurant.deliveryNeighborhoods
      }
    })
  })

  function computeRange(range, startStr, endStr) {
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const startOfTomorrow = new Date(startOfToday)
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

    if (range === 'today') return { start: startOfToday, end: startOfTomorrow }
    if (range === '7d') {
      const start = new Date(startOfToday)
      start.setDate(start.getDate() - 6)
      return { start, end: startOfTomorrow }
    }
    if (range === '30d') {
      const start = new Date(startOfToday)
      start.setDate(start.getDate() - 29)
      return { start, end: startOfTomorrow }
    }
    const start = startStr ? new Date(startStr) : null
    const end = endStr ? new Date(endStr) : now
    if (!start || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return null
    return { start, end }
  }

  router.get('/reports/summary', async (req, res) => {
    const schema = z.object({
      range: z.enum(['today', '7d', '30d', 'custom']).default('today'),
      start: z.string().optional(),
      end: z.string().optional()
    })
    const q = schema.parse(req.query)
    const parsed = computeRange(q.range, q.start, q.end)
    if (!parsed) return res.status(400).json({ message: 'Período inválido.' })

    const where = {
      restaurantId: req.tenant.restaurantId,
      createdAt: { gte: parsed.start, lt: parsed.end }
    }

    const [agg, grouped] = await Promise.all([
      prisma.order.aggregate({
        where,
        _count: { _all: true },
        _sum: { total: true }
      }),
      prisma.order.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
        _sum: { total: true }
      })
    ])

    const byStatus = grouped.reduce((acc, g) => {
      acc[g.status] = { count: g._count._all, total: g._sum.total || 0 }
      return acc
    }, {})

    res.json({
      range: q.range,
      start: parsed.start.toISOString(),
      end: parsed.end.toISOString(),
      count: agg._count._all,
      total: agg._sum.total || 0,
      byStatus
    })
  })

  router.get('/reports/orders.csv', async (req, res) => {
    const schema = z.object({
      range: z.enum(['today', '7d', '30d', 'custom']).default('today'),
      start: z.string().optional(),
      end: z.string().optional()
    })
    const q = schema.parse(req.query)
    const parsed = computeRange(q.range, q.start, q.end)
    if (!parsed) return res.status(400).json({ message: 'Período inválido.' })

    const orders = await prisma.order.findMany({
      where: {
        restaurantId: req.tenant.restaurantId,
        createdAt: { gte: parsed.start, lt: parsed.end }
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    })

    function csvEscape(v) {
      const s = String(v ?? '')
      return `"${s.replaceAll('"', '""')}"`
    }

    const header = [
      'id',
      'createdAt',
      'status',
      'customerName',
      'customerPhone',
      'totalCents',
      'addressStreet',
      'addressNumber',
      'addressNeighborhood',
      'addressReference',
      'customerNote',
      'items'
    ]

    const rows = orders.map((o) => {
      const items = (o.items || []).map((i) => `${i.qty}x ${i.productName}`).join(' | ')
      return [
        o.id,
        o.createdAt.toISOString(),
        o.status,
        o.customerName,
        o.customerPhone,
        o.total,
        o.addressStreet,
        o.addressNumber,
        o.addressNeighborhood,
        o.addressReference || '',
        o.customerNote || '',
        items
      ]
        .map(csvEscape)
        .join(',')
    })

    const csv = `\uFEFF${header.join(',')}\n${rows.join('\n')}\n`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="orders_${q.range}.csv"`)
    res.status(200).send(csv)
  })

  router.get('/orders', async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { restaurantId: req.tenant.restaurantId },
      orderBy: { createdAt: 'desc' },
      include: { items: true, assignedDriver: { select: { id: true, email: true } } }
    })
    res.json({
      orders: orders.map((o) => ({
        ...o,
        assignedDriver: o.assignedDriver ? { id: o.assignedDriver.id, email: o.assignedDriver.email } : null,
        items: o.items.map((i) => ({
          id: i.id,
          qty: i.qty,
          productName: i.productName,
          unitPrice: i.unitPrice
        }))
      }))
    })
  })

  router.get('/drivers/summary', async (req, res) => {
    const [drivers, activeOrders] = await Promise.all([
      prisma.user.findMany({
        where: {
          restaurantId: req.tenant.restaurantId,
          role: 'DRIVER'
        },
        orderBy: { email: 'asc' }
      }),
      prisma.order.findMany({
        where: {
          restaurantId: req.tenant.restaurantId,
          fulfillmentMethod: 'DELIVERY',
          status: { in: ['SAIU_PARA_ENTREGA'] },
          assignedDriverId: { not: null }
        },
        select: {
          id: true,
          assignedDriverId: true,
          customerName: true,
          createdAt: true
        }
      })
    ])

    const byDriverId = activeOrders.reduce((acc, order) => {
      if (!order.assignedDriverId) return acc
      if (!acc[order.assignedDriverId]) acc[order.assignedDriverId] = []
      acc[order.assignedDriverId].push(order)
      return acc
    }, {})

    const items = drivers.map((driver) => {
      const activeDeliveries = byDriverId[driver.id] || []
      return {
        id: driver.id,
        email: driver.email,
        activeDeliveriesCount: activeDeliveries.length,
        status: activeDeliveries.length > 0 ? 'BUSY' : 'FREE',
        activeOrders: activeDeliveries
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map((order) => ({
            id: order.id,
            customerName: order.customerName,
            createdAt: order.createdAt
          }))
      }
    })

    res.json({
      drivers: items,
      summary: {
        total: items.length,
        free: items.filter((driver) => driver.status === 'FREE').length,
        busy: items.filter((driver) => driver.status === 'BUSY').length
      }
    })
  })

  router.patch('/orders/:orderId/status', async (req, res) => {
    const schema = z.object({ status: z.enum(['NOVO', 'PREPARANDO', 'SAIU_PARA_ENTREGA', 'ENTREGUE']) })
    const input = schema.parse(req.body)
    const orderId = req.params.orderId

    const existing = await prisma.order.findUnique({ where: { id: orderId } })
    if (!existing || existing.restaurantId !== req.tenant.restaurantId) {
      return res.status(404).json({ message: 'Pedido não encontrado.' })
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: input.status },
      include: { items: true, assignedDriver: { select: { id: true, email: true } } }
    })

    publishOrderEvent(req.tenant.restaurantId, 'order.updated', order)
    res.json({ order })
  })

  router.get('/categories', async (req, res) => {
    const categories = await prisma.category.findMany({
      where: { restaurantId: req.tenant.restaurantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    })
    res.json({ categories })
  })

  router.post('/categories', async (req, res) => {
    const schema = z.object({ name: z.string().min(1) })
    const input = schema.parse(req.body)
    const category = await prisma.category.create({
      data: { restaurantId: req.tenant.restaurantId, name: input.name }
    })
    res.status(201).json({ category })
  })

  router.patch('/categories/:id', async (req, res) => {
    const schema = z.object({ name: z.string().min(1).optional(), sortOrder: z.number().int().optional() })
    const input = schema.parse(req.body)
    const id = req.params.id
    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing || existing.restaurantId !== req.tenant.restaurantId) {
      return res.status(404).json({ message: 'Categoria não encontrada.' })
    }
    const category = await prisma.category.update({
      where: { id },
      data: {
        name: input.name ?? existing.name,
        sortOrder: input.sortOrder ?? existing.sortOrder
      }
    })
    res.json({ category })
  })

  router.delete('/categories/:id', async (req, res) => {
    const id = req.params.id
    const cat = await prisma.category.findUnique({ where: { id } })
    if (!cat || cat.restaurantId !== req.tenant.restaurantId) return res.status(404).json({ message: 'Categoria não encontrada.' })
    await prisma.category.delete({ where: { id } })
    res.status(204).end()
  })

  router.get('/products', async (req, res) => {
    const products = await prisma.product.findMany({
      where: { restaurantId: req.tenant.restaurantId },
      orderBy: [{ name: 'asc' }]
    })
    res.json({ products })
  })

  router.post('/products', async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional().nullable(),
      unitLabel: z.string().max(80).optional().nullable(),
      requiresPrescription: z.boolean().optional(),
      imageUrl: z.string().max(500).optional().nullable(),
      categoryId: z.string().min(1),
      priceCents: z.number().int().min(1)
    })
    const input = schema.parse(req.body)
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } })
    if (!category || category.restaurantId !== req.tenant.restaurantId) {
      return res.status(400).json({ message: 'Categoria inválida.' })
    }
    const product = await prisma.product.create({
      data: {
        restaurantId: req.tenant.restaurantId,
        categoryId: input.categoryId,
        name: input.name,
        description: input.description || null,
        unitLabel: input.unitLabel || null,
        requiresPrescription: input.requiresPrescription || false,
        imageUrl: input.imageUrl || null,
        price: input.priceCents
      }
    })
    res.status(201).json({ product })
  })

  router.patch('/products/:id', async (req, res) => {
    const schema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      unitLabel: z.string().max(80).optional().nullable(),
      requiresPrescription: z.boolean().optional(),
      imageUrl: z.string().max(500).optional().nullable(),
      categoryId: z.string().min(1).optional(),
      isAvailable: z.boolean().optional(),
      priceCents: z.number().int().min(1).optional()
    })
    const input = schema.parse(req.body)
    const id = req.params.id
    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing || existing.restaurantId !== req.tenant.restaurantId) return res.status(404).json({ message: 'Produto não encontrado.' })

    if (input.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: input.categoryId } })
      if (!category || category.restaurantId !== req.tenant.restaurantId) {
        return res.status(400).json({ message: 'Categoria inválida.' })
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: input.name ?? existing.name,
        description: input.description !== undefined ? input.description : existing.description,
        unitLabel: input.unitLabel !== undefined ? input.unitLabel : existing.unitLabel,
        requiresPrescription: input.requiresPrescription ?? existing.requiresPrescription,
        imageUrl: input.imageUrl !== undefined ? input.imageUrl : existing.imageUrl,
        categoryId: input.categoryId ?? existing.categoryId,
        isAvailable: input.isAvailable ?? existing.isAvailable,
        price: input.priceCents ?? existing.price
      }
    })
    res.json({ product })
  })

  router.delete('/products/:id', async (req, res) => {
    const id = req.params.id
    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing || existing.restaurantId !== req.tenant.restaurantId) return res.status(404).json({ message: 'Produto não encontrado.' })
    await prisma.product.delete({ where: { id } })
    res.status(204).end()
  })

  return router
}
