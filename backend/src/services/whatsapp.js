export function buildWhatsAppOrderUrl(whatsappNumber, order) {
  const number = String(whatsappNumber || '').replace(/\D/g, '')
  if (!number) return null
  const methodLabel = (m) => {
    if (m === 'PIX') return 'PIX'
    if (m === 'CASH') return 'Dinheiro'
    if (m === 'CARD') return 'Cartão'
    return String(m || '')
  }
  const cardTypeLabel = (t) => {
    if (t === 'DEBIT') return 'Débito'
    if (t === 'CREDIT') return 'Crédito'
    return null
  }
  const addressLine = () => {
    if (order.fulfillmentMethod === 'PICKUP') {
      const parts = [order.addressStreet, order.addressNumber, order.addressNeighborhood].filter(Boolean)
      if (parts.length > 0) {
        return `Retirada em: ${order.addressStreet || ''}${order.addressNumber ? `, ${order.addressNumber}` : ''}${order.addressNeighborhood ? ` - ${order.addressNeighborhood}` : ''}`
      }
      return 'Retirada no local'
    }
    return `Endereço: ${order.addressStreet}, ${order.addressNumber} - ${order.addressNeighborhood}${order.addressReference ? ` (${order.addressReference})` : ''}`
  }
  const lines = [
    `Pedido ${order.id}`,
    `Cliente: ${order.customerName}`,
    `Telefone: ${order.customerPhone}`,
    addressLine(),
    `Pagamento: ${methodLabel(order.paymentMethod)}`,
    '',
    'Itens:'
  ]

  for (const i of order.items) {
    lines.push(`${i.qty}x ${i.productName} - R$ ${(i.unitPrice / 100).toFixed(2)}`)
    if (i.note) lines.push(`  Obs item: ${i.note}`)
  }

  lines.push('')
  if (typeof order.subtotal === 'number') {
    lines.push(`Subtotal: R$ ${(order.subtotal / 100).toFixed(2)}`)
  }
  if (typeof order.deliveryFee === 'number') {
    lines.push(`Taxa de entrega: R$ ${(order.deliveryFee / 100).toFixed(2)}`)
  }
  lines.push(`Total: R$ ${(order.total / 100).toFixed(2)}`)
  if (order.paymentMethod === 'CASH' && typeof order.paymentChangeCents === 'number' && order.paymentChangeCents > 0) {
    lines.push(`Troco para: R$ ${(order.paymentChangeCents / 100).toFixed(2)}`)
  }
  if (order.paymentMethod === 'CARD') {
    const ct = cardTypeLabel(order.cardType)
    if (ct) lines.push(`Tipo: ${ct}`)
    if (order.cardBrand) lines.push(`Bandeira: ${order.cardBrand}`)
  }
  if (order.paymentMethod === 'PIX') {
    lines.push('Enviar comprovante neste WhatsApp (pode ser foto ou PDF).')
  }
  if (order.customerNote) {
    lines.push('')
    lines.push(`Obs: ${order.customerNote}`)
  }

  const text = encodeURIComponent(lines.join('\n'))
  return `https://wa.me/${number}?text=${text}`
}
