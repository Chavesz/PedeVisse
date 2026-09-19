import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { withTenant } from '../middleware/tenant.js'
import { publishOrderEvent, subscribeOrderEvents } from '../services/events.js'
import { buildWhatsAppOrderUrl } from '../services/whatsapp.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'

export function publicRoutes() {
  const router = Router({ mergeParams: true })

  router.use(withTenant)

  function serializePublicOrder(order) {
    if (!order) return null
    return {
      id: order.id,
      status: order.status,
      fulfillmentMethod: order.fulfillmentMethod,
      paymentMethod: order.paymentMethod,
      paymentProofUrl: order.paymentProofUrl,
      total: order.total,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }
  }

  router.get('/restaurant', async (req, res) => {
    const r = req.tenant.restaurant
    const subscriptionActive = r.subscriptionStatus === 'ACTIVE'
    const isOpen = Boolean(r.isOpen) && subscriptionActive
    res.json({
      restaurant: {
        id: r.id,
        name: r.name,
        slug: r.slug,
        whatsappNumber: r.whatsappNumber,
        themePrimary: r.themePrimary,
        themeSecondary: r.themeSecondary,
        logoUrl: r.logoUrl,
        bannerUrls: r.bannerUrls,
        commerceType: r.commerceType,
        heroTitle: r.heroTitle,
        heroDescription: r.heroDescription,
        isOpen,
        closedMessage: !subscriptionActive ? 'Restaurante temporariamente indisponível.' : r.closedMessage,
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

  router.get('/menu', async (req, res) => {
    const restaurantId = req.tenant.restaurantId
    const categories = await prisma.category.findMany({
      where: { restaurantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        products: {
          where: { restaurantId },
          orderBy: [{ name: 'asc' }]
        }
      }
    })
    res.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        products: c.products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          unitLabel: p.unitLabel,
          requiresPrescription: p.requiresPrescription,
          imageUrl: p.imageUrl,
          price: p.price,
          isAvailable: p.isAvailable
        }))
      }))
    })
  })

  router.get('/orders/:orderId', async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: req.params.orderId } })
    if (!order || order.restaurantId !== req.tenant.restaurantId) {
      return res.status(404).json({ message: 'Pedido não encontrado.' })
    }

    res.json({ order: serializePublicOrder(order) })
  })

  router.get('/orders/:orderId/stream', async (req, res) => {
    const orderId = req.params.orderId
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order || order.restaurantId !== req.tenant.restaurantId) {
      return res.status(404).json({ message: 'Pedido não encontrado.' })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    res.write(`data: ${JSON.stringify({ type: 'connected', order: serializePublicOrder(order) })}\n\n`)

    const keepAlive = setInterval(() => {
      res.write(`event: ping\ndata: {}\n\n`)
    }, 25000)

    const unsub = subscribeOrderEvents(req.tenant.restaurantId, (payload) => {
      if (payload?.order?.id !== orderId) return
      res.write(`data: ${JSON.stringify({ ...payload, order: serializePublicOrder(payload.order) })}\n\n`)
    })

    req.on('close', () => {
      clearInterval(keepAlive)
      unsub()
      res.end()
    })
  })

  router.post('/orders', async (req, res) => {
    if (req.tenant.restaurant.subscriptionStatus !== 'ACTIVE') {
      return res.status(403).json({ message: 'Restaurante temporariamente indisponível.' })
    }
    if (req.tenant.restaurant.isOpen === false) {
      return res.status(403).json({ message: req.tenant.restaurant.closedMessage || 'Restaurante fechado no momento.' })
    }
    const schema = z.object({
      fulfillmentMethod: z.enum(['DELIVERY', 'PICKUP']).optional().default('DELIVERY'),
      customer: z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
        note: z.string().max(500).optional().nullable(),
        address: z
          .object({
            street: z.string().min(1),
            number: z.string().min(1),
            neighborhood: z.string().min(1),
            reference: z.string().optional().nullable()
          })
          .optional()
          .nullable()
      }),
      paymentMethod: z.enum(['PIX', 'CASH', 'CARD']).optional().default('PIX'),
      paymentChangeCents: z.number().int().min(0).optional().nullable(),
      cardType: z.enum(['DEBIT', 'CREDIT']).optional().nullable(),
      cardBrand: z.string().max(40).optional().nullable(),
      items: z.array(z.object({
        productId: z.string().min(1),
        qty: z.number().int().min(1),
        note: z.string().max(240).optional().nullable()
      })).min(1)
    })

    const input = schema.parse(req.body)
    const restaurantId = req.tenant.restaurantId
    const restaurant = req.tenant.restaurant
    const fulfillmentMethod = input.fulfillmentMethod || 'DELIVERY'
    const isPickup = fulfillmentMethod === 'PICKUP'

    const customerPhone = String(input.customer.phone || '').replace(/\D/g, '')
    if (customerPhone.length < 10 || customerPhone.length > 13) {
      return res.status(400).json({ message: 'Telefone inválido.' })
    }

    if (!isPickup) {
      const address = input.customer.address
      if (!address) return res.status(400).json({ message: 'Endereço é obrigatório para entrega.' })

      const neighborhood = String(address.neighborhood || '').trim()
      const allowed = Array.isArray(restaurant.deliveryNeighborhoods) ? restaurant.deliveryNeighborhoods : null
      if (allowed && allowed.length > 0) {
        const norm = (s) => String(s || '').trim().toLowerCase()
        const ok = allowed.some((n) => norm(n) === norm(neighborhood))
        if (!ok) {
          return res.status(403).json({ message: 'Endereço fora da área de entrega.' })
        }
      }
    }

    if (input.paymentMethod === 'CARD' && !input.cardType) {
      return res.status(400).json({ message: 'Selecione débito ou crédito.' })
    }

    const ids = [...new Set(input.items.map((i) => i.productId))]
    const products = await prisma.product.findMany({
      where: { restaurantId, id: { in: ids } }
    })

    if (products.length !== ids.length) {
      return res.status(400).json({ message: 'Um ou mais produtos são inválidos.' })
    }

    const byId = new Map(products.map((p) => [p.id, p]))
    const orderItems = input.items.map((i) => {
      const p = byId.get(i.productId)
      if (!p) throw new Error('Produto inválido.')
      if (!p.isAvailable) throw new Error('Produto indisponível.')
      return {
        productId: p.id,
        productName: p.name,
        unitPrice: p.price,
        qty: i.qty,
        note: i.note || null
      }
    })

    const subtotal = orderItems.reduce((acc, i) => acc + i.unitPrice * i.qty, 0)
    const deliveryFee = isPickup ? 0 : Number(restaurant.deliveryFee || 0)
    const minOrder = Number(restaurant.minOrder || 0)
    if (minOrder > 0 && subtotal < minOrder) {
      return res.status(400).json({ message: `Pedido mínimo: R$ ${(minOrder / 100).toFixed(2)}` })
    }
    const total = subtotal + deliveryFee

    const created = await prisma.$transaction(async (tx) => {
      const address = input.customer.address || null
      const pickupAddressStreet = restaurant.addressStreet || null
      const pickupAddressNumber = restaurant.addressNumber || null
      const pickupAddressNeighborhood = restaurant.addressNeighborhood || null

      const order = await tx.order.create({
        data: {
          restaurantId,
          fulfillmentMethod,
          customerName: input.customer.name,
          customerPhone,
          customerNote: input.customer.note || null,
          addressStreet: isPickup ? pickupAddressStreet : address?.street || null,
          addressNumber: isPickup ? pickupAddressNumber : address?.number || null,
          addressNeighborhood: isPickup ? pickupAddressNeighborhood : address?.neighborhood || null,
          addressReference: isPickup ? null : address?.reference || null,
          paymentMethod: input.paymentMethod,
          paymentChangeCents: input.paymentMethod === 'CASH' ? (input.paymentChangeCents ?? null) : null,
          cardType: input.paymentMethod === 'CARD' ? (input.cardType || null) : null,
          cardBrand: input.paymentMethod === 'CARD' ? (input.cardBrand || null) : null,
          subtotal,
          deliveryFee,
          total,
          items: { create: orderItems }
        },
        include: { items: true }
      })
      return order
    })

    publishOrderEvent(restaurantId, 'order.created', {
      ...created,
      items: created.items
    })

    const restaurantWhats = req.tenant.restaurant.whatsappNumber
    const whatsappUrl = restaurantWhats ? buildWhatsAppOrderUrl(restaurantWhats, created) : null

    res.status(201).json({
      order: created,
      whatsappUrl
    })
  })

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
  })

  router.post('/orders/:orderId/payment-proof', upload.single('file'), async (req, res) => {
    const orderId = req.params.orderId
    if (!req.file) return res.status(400).json({ message: 'Envie um arquivo.' })

    const existing = await prisma.order.findUnique({ where: { id: orderId } })
    if (!existing || existing.restaurantId !== req.tenant.restaurantId) {
      return res.status(404).json({ message: 'Pedido não encontrado.' })
    }

    const ext = path.extname(req.file.originalname || '').toLowerCase()
    const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf'])
    if (!allowed.has(ext)) return res.status(400).json({ message: 'Formato inválido. Use JPG, PNG, WEBP ou PDF.' })

    const uploadDir = path.join(process.cwd(), 'uploads', req.tenant.restaurant.slug)
    await fs.mkdir(uploadDir, { recursive: true })
    const fileName = `${orderId}_${Date.now()}${ext}`
    const fullPath = path.join(uploadDir, fileName)
    await fs.writeFile(fullPath, req.file.buffer)

    const url = `/uploads/${encodeURIComponent(req.tenant.restaurant.slug)}/${encodeURIComponent(fileName)}`
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { paymentProofUrl: url },
      include: { items: true }
    })

    publishOrderEvent(req.tenant.restaurantId, 'order.updated', updated)
    res.status(201).json({ order: updated })
  })

  return router
}
