import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'

function timingSafeEqual(a, b) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

function parseStripeSignature(header) {
  const parts = String(header || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  const map = new Map(parts.map((p) => p.split('=')))
  const t = map.get('t')
  const v1 = parts
    .map((p) => p.split('='))
    .filter((kv) => kv[0] === 'v1' && kv[1])
    .map((kv) => kv[1])
  return { t, v1 }
}

function mapStripeStatus(status) {
  if (status === 'active') return 'ACTIVE'
  if (status === 'trialing') return 'TRIALING'
  if (status === 'past_due' || status === 'unpaid') return 'PAST_DUE'
  if (status === 'canceled' || status === 'incomplete_expired') return 'CANCELED'
  if (status === 'incomplete') return 'PAST_DUE'
  if (status === 'paused') return 'PAST_DUE'
  return 'PAST_DUE'
}

export async function stripeWebhookHandler(req, res) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return res.status(501).json({ message: 'Webhook não configurado.' })

  const header = req.headers['stripe-signature']
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('')
  const { t, v1 } = parseStripeSignature(header)
  if (!t || !v1.length) return res.status(400).json({ message: 'Assinatura inválida.' })

  const signed = `${t}.${raw.toString('utf8')}`
  const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex')
  const ok = v1.some((sig) => timingSafeEqual(sig, expected))
  if (!ok) return res.status(400).json({ message: 'Assinatura inválida.' })

  let event
  try {
    event = JSON.parse(raw.toString('utf8') || '{}')
  } catch {
    return res.status(400).json({ message: 'JSON inválido.' })
  }

  const type = String(event?.type || '')
  const obj = event?.data?.object

  try {
    if (type === 'checkout.session.completed') {
      const restaurantId = obj?.metadata?.restaurantId || null
      const plan = obj?.metadata?.plan || null
      const customerId = obj?.customer || null
      const subscriptionId = obj?.subscription || null

      if (restaurantId && customerId) {
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: {
            stripeCustomerId: String(customerId),
            stripeSubscriptionId: subscriptionId ? String(subscriptionId) : undefined,
            subscriptionStatus: 'ACTIVE',
            ...(plan ? { subscriptionPlan: plan } : {}),
            subscriptionStartedAt: new Date()
          }
        })
      }
    }

    if (type === 'invoice.paid') {
      const subscriptionId = obj?.subscription || null
      if (subscriptionId) {
        await prisma.restaurant.updateMany({
          where: { stripeSubscriptionId: String(subscriptionId) },
          data: { subscriptionStatus: 'ACTIVE' }
        })
      }
    }

    if (type === 'invoice.payment_failed') {
      const subscriptionId = obj?.subscription || null
      if (subscriptionId) {
        await prisma.restaurant.updateMany({
          where: { stripeSubscriptionId: String(subscriptionId) },
          data: { subscriptionStatus: 'PAST_DUE' }
        })
      }
    }

    if (type === 'customer.subscription.deleted') {
      const subscriptionId = obj?.id || null
      if (subscriptionId) {
        await prisma.restaurant.updateMany({
          where: { stripeSubscriptionId: String(subscriptionId) },
          data: { subscriptionStatus: 'CANCELED' }
        })
      }
    }

    if (type === 'customer.subscription.updated') {
      const subscriptionId = obj?.id || null
      const stripeStatus = obj?.status || null
      const restaurantId = obj?.metadata?.restaurantId || null
      const plan = obj?.metadata?.plan || null
      const mapped = mapStripeStatus(String(stripeStatus || ''))

      if (restaurantId) {
        await prisma.restaurant.update({
          where: { id: String(restaurantId) },
          data: {
            subscriptionStatus: mapped,
            ...(subscriptionId ? { stripeSubscriptionId: String(subscriptionId) } : {}),
            ...(plan ? { subscriptionPlan: plan } : {})
          }
        })
      } else if (subscriptionId) {
        await prisma.restaurant.updateMany({
          where: { stripeSubscriptionId: String(subscriptionId) },
          data: { subscriptionStatus: mapped, ...(plan ? { subscriptionPlan: plan } : {}) }
        })
      }
    }
  } catch (e) {
    process.stderr.write(`${e?.stack || e?.message || e}\n`)
    return res.status(500).json({ message: 'Erro ao processar webhook.' })
  }

  res.json({ ok: true })
}

