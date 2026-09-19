const ETA_TARGETS = {
  DELIVERY: {
    NOVO: [35, 55],
    PREPARANDO: [20, 35],
    SAIU_PARA_ENTREGA: [8, 18],
    ENTREGUE: [0, 0]
  },
  PICKUP: {
    NOVO: [15, 25],
    PREPARANDO: [8, 15],
    SAIU_PARA_ENTREGA: [0, 5],
    ENTREGUE: [0, 0]
  }
}

function safeDate(value) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

export function getElapsedMinutes(value, now = Date.now()) {
  const date = safeDate(value)
  if (!date) return 0
  const reference = typeof now === 'number' ? now : new Date(now).getTime()
  return Math.max(0, Math.round((reference - date.getTime()) / 60000))
}

export function formatMinutesLabel(totalMinutes) {
  const minutes = Math.max(0, Number(totalMinutes) || 0)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!rest) return `${hours}h`
  return `${hours}h ${rest}min`
}

export function getRelativeDateLabel(value, now = Date.now()) {
  const minutes = getElapsedMinutes(value, now)
  if (minutes <= 0) return 'agora'
  return `ha ${formatMinutesLabel(minutes)}`
}

function remainingWindowLabel(min, max) {
  if (max <= 0) return 'agora'
  if (min <= 0) return `ate ${max} min`
  if (min === max) return `${min} min`
  return `${min}-${max} min`
}

export function getOrderEtaMeta(order, now = Date.now()) {
  const fulfillment = order?.fulfillmentMethod === 'PICKUP' ? 'PICKUP' : 'DELIVERY'
  const status = order?.status || 'NOVO'
  const createdAt = order?.createdAt
  const ageMinutes = getElapsedMinutes(createdAt, now)
  const [minTarget, maxTarget] = ETA_TARGETS[fulfillment]?.[status] || ETA_TARGETS.DELIVERY.NOVO
  const remainingMin = Math.max(0, minTarget - ageMinutes)
  const remainingMax = Math.max(0, maxTarget - ageMinutes)
  const lateByMinutes = Math.max(0, ageMinutes - maxTarget)
  const isLate = status !== 'ENTREGUE' && lateByMinutes >= 8

  if (status === 'ENTREGUE') {
    return {
      etaLabel: 'Finalizado',
      ageMinutes,
      ageLabel: formatMinutesLabel(ageMinutes),
      isLate: false,
      lateByMinutes: 0,
      tone: 'done',
      detail: fulfillment === 'PICKUP' ? 'Pedido retirado com sucesso.' : 'Pedido entregue com sucesso.'
    }
  }

  if (remainingMax === 0) {
    return {
      etaLabel: 'Etapa final',
      ageMinutes,
      ageLabel: formatMinutesLabel(ageMinutes),
      isLate,
      lateByMinutes,
      tone: isLate ? 'late' : 'attention',
      detail:
        fulfillment === 'PICKUP'
          ? 'Seu pedido deve estar pronto para retirada a qualquer momento.'
          : 'Seu pedido esta na etapa final e deve chegar em instantes.'
    }
  }

  return {
    etaLabel: remainingWindowLabel(remainingMin, remainingMax),
    ageMinutes,
    ageLabel: formatMinutesLabel(ageMinutes),
    isLate,
    lateByMinutes,
    tone: isLate ? 'late' : status === 'SAIU_PARA_ENTREGA' ? 'delivery' : status === 'PREPARANDO' ? 'preparing' : 'new',
    detail:
      status === 'SAIU_PARA_ENTREGA'
        ? 'Pedido em rota para o destino informado.'
        : status === 'PREPARANDO'
          ? 'Pedido em preparo pela equipe da loja.'
          : 'Pedido aguardando a primeira acao da loja.'
  }
}

export function getOrderCustomerGuidance(order, now = Date.now()) {
  const fulfillment = order?.fulfillmentMethod === 'PICKUP' ? 'PICKUP' : 'DELIVERY'
  const status = order?.status || 'NOVO'
  const paymentMethod = order?.paymentMethod || 'PIX'
  const hasProof = Boolean(order?.paymentProofUrl)
  const eta = getOrderEtaMeta(order, now)

  if (status === 'ENTREGUE') {
    return {
      headline: fulfillment === 'PICKUP' ? 'Tudo certo, retirada concluida.' : 'Tudo certo, pedido concluido.',
      summary:
        fulfillment === 'PICKUP'
          ? 'Seu pedido foi retirado com sucesso. Se quiser, voce ja pode voltar ao cardapio e pedir novamente.'
          : 'Seu pedido foi finalizado com sucesso. Obrigado por acompanhar por aqui.',
      nextStep: fulfillment === 'PICKUP' ? 'Se quiser, faça um novo pedido quando precisar.' : 'Agora e so aproveitar o pedido.',
      rhythm: 'finalizado',
      tone: 'done'
    }
  }

  if (status === 'SAIU_PARA_ENTREGA') {
    return {
      headline: fulfillment === 'PICKUP' ? 'Seu pedido esta pronto para retirada.' : 'Seu pedido ja esta a caminho.',
      summary:
        fulfillment === 'PICKUP'
          ? 'Pode se organizar para ir ate a loja. A retirada deve acontecer em instantes.'
          : eta.isLate
            ? `O pedido esta em rota, mas acima da previsao em ${formatMinutesLabel(eta.lateByMinutes)}.`
            : 'A entrega entrou na etapa final e deve chegar em breve.',
      nextStep:
        fulfillment === 'PICKUP'
          ? 'Vá ao restaurante e informe o número do pedido ao retirar.'
          : 'Fique atento ao celular e ao endereço informado para receber sem atraso.',
      rhythm: eta.isLate ? 'atrasado' : 'rota-final',
      tone: eta.isLate ? 'warning' : 'delivery'
    }
  }

  if (status === 'PREPARANDO') {
    return {
      headline: 'A loja esta preparando seu pedido.',
      summary: eta.isLate
        ? `A preparação passou da janela prevista em ${formatMinutesLabel(eta.lateByMinutes)}.`
        : 'Sua equipe ja esta separando os itens para seguir para a etapa final.',
      nextStep:
        fulfillment === 'PICKUP'
          ? 'Assim que ficar pronto, a tela muda automaticamente para retirada.'
          : 'Depois da preparação, o pedido segue para a rota de entrega.',
      rhythm: eta.isLate ? 'preparo-lento' : 'preparo',
      tone: eta.isLate ? 'warning' : 'preparing'
    }
  }

  if (paymentMethod === 'PIX' && !hasProof) {
    return {
      headline: 'Seu pedido foi recebido e aguarda confirmação.',
      summary: 'Se quiser agilizar, envie o comprovante do PIX ou fale com a loja no WhatsApp.',
      nextStep:
        fulfillment === 'PICKUP'
          ? 'Depois da confirmação, a loja inicia a preparação e avisa quando estiver pronto.'
          : 'Depois da confirmação, a loja inicia a preparação e segue para entrega.',
      rhythm: 'aguardando-confirmacao',
      tone: 'attention'
    }
  }

  return {
    headline: 'Seu pedido entrou na fila da loja.',
    summary: 'A equipe recebeu sua solicitação e a tela vai atualizar automaticamente quando houver avanço.',
    nextStep:
      fulfillment === 'PICKUP'
        ? 'O próximo passo é a loja iniciar a preparação.'
        : 'O próximo passo é a loja iniciar a preparação antes do despacho.',
    rhythm: 'novo',
    tone: 'new'
  }
}

export function getOrderCustomerAlerts(order, now = Date.now()) {
  const fulfillment = order?.fulfillmentMethod === 'PICKUP' ? 'PICKUP' : 'DELIVERY'
  const status = order?.status || 'NOVO'
  const paymentMethod = order?.paymentMethod || 'PIX'
  const hasProof = Boolean(order?.paymentProofUrl)
  const eta = getOrderEtaMeta(order, now)
  const alerts = []

  if (paymentMethod === 'PIX' && !hasProof && status !== 'ENTREGUE') {
    alerts.push({
      id: 'pix-proof',
      tone: 'warning',
      title: 'Pagamento aguardando confirmação',
      message: 'Envie o comprovante do PIX para agilizar a confirmação do pedido.'
    })
  }

  if (eta.isLate) {
    alerts.push({
      id: 'late-order',
      tone: 'danger',
      title: 'Pedido acima da previsão',
      message: `O pedido está levando mais tempo que o normal, com excesso de ${formatMinutesLabel(eta.lateByMinutes)}.`
    })
  }

  if (status === 'SAIU_PARA_ENTREGA') {
    alerts.push({
      id: 'on-route',
      tone: fulfillment === 'PICKUP' ? 'success' : 'info',
      title: fulfillment === 'PICKUP' ? 'Retirada liberada' : 'Entrega na etapa final',
      message:
        fulfillment === 'PICKUP'
          ? 'Seu pedido já pode ser retirado no restaurante.'
          : 'Fique atento ao celular e ao endereço informado para receber sem atraso.'
    })
  }

  if (status === 'PREPARANDO' && !eta.isLate) {
    alerts.push({
      id: 'in-prep',
      tone: 'info',
      title: 'Produção em andamento',
      message: fulfillment === 'PICKUP'
        ? 'A loja está finalizando seu pedido antes de liberar a retirada.'
        : 'A loja está finalizando o preparo antes de enviar para entrega.'
    })
  }

  return alerts.slice(0, 3)
}

export function getOrderWhatsAppCta(order, now = Date.now()) {
  const fulfillment = order?.fulfillmentMethod === 'PICKUP' ? 'PICKUP' : 'DELIVERY'
  const status = order?.status || 'NOVO'
  const paymentMethod = order?.paymentMethod || 'PIX'
  const hasProof = Boolean(order?.paymentProofUrl)
  const eta = getOrderEtaMeta(order, now)

  if (paymentMethod === 'PIX' && !hasProof && status !== 'ENTREGUE') {
    return {
      label: 'Enviar comprovante no WhatsApp',
      hint: 'Use o WhatsApp para acelerar a confirmação do pagamento.'
    }
  }

  if (eta.isLate) {
    return {
      label: 'Cobrar atualização no WhatsApp',
      hint: 'Vale pedir uma posição da loja, porque o pedido passou da previsão.'
    }
  }

  if (status === 'SAIU_PARA_ENTREGA') {
    return {
      label: fulfillment === 'PICKUP' ? 'Avisar que estou indo retirar' : 'Falar com a loja',
      hint: fulfillment === 'PICKUP' ? 'Se quiser, avise que já está indo buscar.' : 'Use o WhatsApp só se precisar alinhar entrega ou referência.'
    }
  }

  if (status === 'PREPARANDO') {
    return {
      label: 'Falar com a loja',
      hint: 'Canal direto para qualquer ajuste ou dúvida durante o preparo.'
    }
  }

  return {
    label: 'Abrir WhatsApp',
    hint: 'Canal direto com a loja para confirmar qualquer detalhe do pedido.'
  }
}
