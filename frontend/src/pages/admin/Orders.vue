<template>
  <AppShell>
    <div class="pv-container max-w-6xl">
      <div class="pv-card pv-warm-panel p-5">
        <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div class="min-w-0">
            <div class="pv-subtitle">Pedidos</div>
            <div class="pv-title truncate">{{ tenant.restaurant?.name || tenant.slug }}</div>
            <div class="mt-2 text-sm text-slate-600">Acompanhe o rush em tempo real, veja prioridades e atualize a fila com poucos cliques.</div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button class="pv-btn pv-btn-ghost" @click="orders.toggleAlertsMuted()">
              {{ orders.alertsMuted ? 'Ativar alertas' : 'Mutar alertas' }}
            </button>
            <button class="pv-btn pv-btn-primary" @click="refreshOrders">Atualizar agora</button>
          </div>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Novos pedidos</div>
            <div class="mt-2 text-3xl font-black text-slate-950">{{ dashboardStats.newCount }}</div>
            <div class="mt-1 text-sm text-slate-600">Aguardando primeira ação</div>
          </div>
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Faturamento hoje</div>
            <div class="mt-2 text-3xl font-black text-slate-950">R$ {{ (todayStats.total / 100).toFixed(2) }}</div>
            <div class="mt-1 text-sm text-slate-600">{{ todayStats.count }} pedidos no dia</div>
          </div>
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Ticket médio</div>
            <div class="mt-2 text-3xl font-black text-slate-950">R$ {{ (dashboardStats.averageTicket / 100).toFixed(2) }}</div>
            <div class="mt-1 text-sm text-slate-600">Baseado nos pedidos visíveis</div>
          </div>
          <div class="pv-card-soft p-4">
            <div class="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-400">Em produção</div>
            <div class="mt-2 text-3xl font-black text-slate-950">{{ dashboardStats.activeCount }}</div>
            <div class="mt-1 text-sm text-slate-600">Preparando ou saiu para entrega</div>
          </div>
        </div>

        <div class="mt-5 flex flex-col gap-2 md:flex-row md:items-center">
          <input v-model.trim="search" class="pv-input md:flex-1" placeholder="Buscar nome/telefone" />
          <select v-model="statusFilter" class="pv-select md:w-64">
            <option value="ALL">Todos</option>
            <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
          </select>
          <select v-model="fulfillmentFilter" class="pv-select md:w-56">
            <option value="ALL">Entrega e retirada</option>
            <option value="DELIVERY">Só entrega</option>
            <option value="PICKUP">Só retirada</option>
          </select>
        </div>

        <div class="mt-4 rounded-[24px] border p-4" :class="opsBannerClass">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div class="text-xs font-semibold uppercase tracking-[0.22em]" :class="opsBannerAccentClass">Central Operacional</div>
              <div class="mt-1 text-lg font-black text-slate-950">{{ opsBannerTitle }}</div>
              <div class="mt-1 text-sm" :class="opsBannerTextClass">{{ opsBannerMessage }}</div>
            </div>
            <button class="pv-btn px-4 py-3" :class="opsBannerButtonClass" @click="runAnomalyAction(opsBannerAction)">
              {{ opsBannerButtonLabel }}
            </button>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="item in opsPulseItems"
              :key="item.label"
              class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
              :class="item.className"
            >
              {{ item.label }}
            </span>
          </div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div class="pv-card p-4">
          <div class="text-xs font-semibold text-slate-500">Hoje</div>
          <div class="mt-1 text-lg font-extrabold">{{ todayStats.count }} pedidos</div>
          <div class="mt-1 text-sm font-semibold text-slate-700">R$ {{ (todayStats.total / 100).toFixed(2) }}</div>
          <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div class="h-full rounded-full bg-[linear-gradient(135deg,var(--pv-primary)_0%,var(--pv-primary-strong)_100%)]" :style="{ width: `${todayProgress}%` }"></div>
          </div>
          <div class="mt-2 text-xs text-slate-500">Pedidos concluídos hoje: {{ todayStats.byStatus.ENTREGUE || 0 }}</div>
        </div>
        <div class="pv-card p-4">
          <div class="text-xs font-semibold text-slate-500">Hoje (por status)</div>
          <div class="mt-2 flex flex-wrap gap-2">
            <div v-for="s in statuses" :key="s" class="pv-badge" :class="statusBadgeClass(s)">
              {{ statusLabel(s) }}: {{ todayStats.byStatus[s] || 0 }}
            </div>
          </div>
        </div>
        <div class="pv-card p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="text-xs font-semibold text-slate-500">Atalhos</div>
            <div class="text-xs font-semibold" :class="orders.alertsMuted ? 'text-amber-700' : 'text-emerald-700'">
              {{ orders.alertsMuted ? 'Alertas pausados' : 'Alertas ativos' }}
            </div>
          </div>
          <div class="mt-2 flex flex-wrap gap-2">
            <button class="pv-chip" :class="statusFilter === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : ''" @click="statusFilter = 'ALL'">
              Todos ({{ totalCount }})
            </button>
            <button
              v-for="s in statuses"
              :key="s"
              class="pv-chip"
              :class="statusFilter === s ? 'bg-slate-900 text-white border-slate-900' : ''"
              @click="statusFilter = s"
            >
              {{ statusLabel(s) }} ({{ counts[s] || 0 }})
            </button>
          </div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div class="pv-card p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-xs font-semibold text-slate-500">Despacho</div>
              <div class="mt-1 text-lg font-extrabold text-slate-950">Fila sem entregador</div>
              <div class="mt-1 text-sm text-slate-600">Veja o que ainda precisa sair para rua e o que já está acima do prazo.</div>
            </div>
            <button class="pv-btn pv-btn-ghost px-3 py-2 text-xs" @click="focusDispatchQueue">Filtrar despacho</button>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-xs font-semibold text-slate-500">Sem entregador</div>
              <div class="mt-1 text-2xl font-black text-slate-950">{{ dispatchStats.unassignedCount }}</div>
              <div class="mt-1 text-sm text-slate-600">Pedidos de entrega aguardando atribuicao</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-amber-50 p-4">
              <div class="text-xs font-semibold text-amber-700">Prontos para saida</div>
              <div class="mt-1 text-2xl font-black text-amber-900">{{ dispatchStats.readyCount }}</div>
              <div class="mt-1 text-sm text-amber-800">Preparando e sem entregador vinculado</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-xs font-semibold text-slate-500">Criticos</div>
              <div class="mt-1 text-2xl font-black text-slate-950">{{ dispatchStats.criticalCount }}</div>
              <div class="mt-1 text-sm text-slate-600">Acima da previsao e sem entregador</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-xs font-semibold text-slate-500">Mais antigo</div>
              <div class="mt-1 text-2xl font-black text-slate-950">{{ dispatchStats.oldestAge }}</div>
              <div class="mt-1 text-sm text-slate-600">Pedido ha mais tempo esperando saida</div>
            </div>
          </div>
        </div>
        <div class="pv-card p-4">
          <div class="text-xs font-semibold text-slate-500">Proxima saida</div>
          <div class="mt-2 text-lg font-extrabold text-slate-950">{{ nextDispatchTitle }}</div>
          <div class="mt-1 text-sm text-slate-600">{{ nextDispatchMessage }}</div>
          <div class="mt-4 flex flex-wrap gap-2">
            <button class="pv-chip" :class="dispatchFilter === 'READY' ? 'bg-slate-900 text-white border-slate-900' : ''" @click="showReadyDispatch">
              Prontos para saida ({{ dispatchStats.readyCount }})
            </button>
            <button class="pv-chip" :class="dispatchFilter === 'UNASSIGNED' ? 'bg-slate-900 text-white border-slate-900' : ''" @click="showOnlyUnassigned">
              Sem entregador ({{ dispatchStats.unassignedCount }})
            </button>
            <button class="pv-chip" :class="dispatchFilter === 'CRITICAL' ? 'bg-slate-900 text-white border-slate-900' : ''" @click="showCriticalDispatch">
              Criticos ({{ dispatchStats.criticalCount }})
            </button>
            <button class="pv-chip" :class="dispatchFilter === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : ''" @click="clearFilters">
              Limpar
            </button>
          </div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[0.95fr_1.05fr]">
        <div class="pv-card p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-xs font-semibold text-slate-500">Motoristas</div>
              <div class="mt-1 text-lg font-extrabold text-slate-950">Frota do turno</div>
              <div class="mt-1 text-sm text-slate-600">Veja quem está livre para receber saída e quem já está em rota.</div>
            </div>
            <button class="pv-btn pv-btn-ghost px-3 py-2 text-xs" @click="refreshOrders">Atualizar frota</button>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-xs font-semibold text-slate-500">Total</div>
              <div class="mt-1 text-2xl font-black text-slate-950">{{ driversSummary.total }}</div>
              <div class="mt-1 text-sm text-slate-600">Motoristas cadastrados na loja</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-emerald-50 p-4">
              <div class="text-xs font-semibold text-emerald-700">Livres</div>
              <div class="mt-1 text-2xl font-black text-emerald-900">{{ driversSummary.free }}</div>
              <div class="mt-1 text-sm text-emerald-800">Podem receber nova saída agora</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-orange-50 p-4">
              <div class="text-xs font-semibold text-orange-700">Ocupados</div>
              <div class="mt-1 text-2xl font-black text-orange-900">{{ driversSummary.busy }}</div>
              <div class="mt-1 text-sm text-orange-800">Já estão em rota com pedidos</div>
            </div>
          </div>
        </div>
        <div class="pv-card p-4">
          <div class="text-xs font-semibold text-slate-500">Painel da frota</div>
          <div v-if="drivers.length === 0" class="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Nenhum entregador cadastrado ainda.
          </div>
          <div v-else class="mt-3 space-y-3">
            <div
              v-for="driver in drivers"
              :key="driver.id"
              class="rounded-2xl border p-4"
              :class="driver.status === 'FREE' ? 'border-emerald-200 bg-emerald-50/70' : 'border-orange-200 bg-orange-50/70'"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="min-w-0">
                  <div class="truncate text-sm font-extrabold text-slate-950">{{ driver.email }}</div>
                  <div class="mt-1 text-xs text-slate-500">
                    {{ driver.status === 'FREE' ? 'Disponivel para nova saida' : `${driver.activeDeliveriesCount} entrega(s) em rota` }}
                  </div>
                </div>
                <div class="pv-badge" :class="driver.status === 'FREE' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'">
                  {{ driver.status === 'FREE' ? 'LIVRE' : 'OCUPADO' }}
                </div>
              </div>
              <div v-if="driver.activeOrders?.length" class="mt-3 space-y-2">
                <div
                  v-for="active in driver.activeOrders"
                  :key="active.id"
                  class="rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-sm text-slate-700"
                >
                  <div class="font-semibold text-slate-900">{{ active.customerName }}</div>
                  <div class="mt-1 text-xs text-slate-500">Pedido {{ active.id }} · {{ formatTime(active.createdAt) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr]">
        <div class="pv-card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-xs font-semibold text-slate-500">SLA Do Delivery</div>
              <div class="mt-1 text-lg font-extrabold text-slate-950">Saúde dos pedidos do dia</div>
              <div class="mt-1 text-sm text-slate-600">Leitura rápida de no prazo, em risco e estourados no delivery.</div>
            </div>
            <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span class="font-black text-slate-950">{{ slaStats.onTimeRate }}%</span>
              no prazo
            </div>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div class="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div class="text-xs font-semibold text-emerald-700">No prazo</div>
              <div class="mt-1 text-2xl font-black text-emerald-900">{{ slaStats.onTimeCount }}</div>
              <div class="mt-1 text-sm text-emerald-800">Pedidos dentro da janela</div>
            </div>
            <div class="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <div class="text-xs font-semibold text-amber-700">Em risco</div>
              <div class="mt-1 text-2xl font-black text-amber-900">{{ slaStats.atRiskCount }}</div>
              <div class="mt-1 text-sm text-amber-800">Perto de estourar o SLA</div>
            </div>
            <div class="rounded-2xl border border-red-200 bg-red-50/70 p-4">
              <div class="text-xs font-semibold text-red-700">Estourados</div>
              <div class="mt-1 text-2xl font-black text-red-900">{{ slaStats.lateCount }}</div>
              <div class="mt-1 text-sm text-red-800">Acima da meta esperada</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-xs font-semibold text-slate-500">Ciclo médio</div>
              <div class="mt-1 text-2xl font-black text-slate-950">{{ slaStats.averageCycleLabel }}</div>
              <div class="mt-1 text-sm text-slate-600">Delivery do dia</div>
            </div>
          </div>
        </div>

        <div class="pv-card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-xs font-semibold text-slate-500">Produtividade Da Frota</div>
              <div class="mt-1 text-lg font-extrabold text-slate-950">Performance por entregador</div>
              <div class="mt-1 text-sm text-slate-600">Veja produção, entregas concluídas e pressão atual por motorista.</div>
            </div>
            <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span class="font-black text-slate-950">{{ driverPerformance.length }}</span>
              motorista(s)
            </div>
          </div>
          <div class="mt-4 space-y-3">
            <div v-if="driverPerformance.length === 0" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Ainda não há dados suficientes de entrega para medir produtividade por entregador.
            </div>
            <div
              v-for="driver in driverPerformance"
              :key="driver.id"
              class="rounded-2xl border p-4"
              :class="driverCardClass(driver)"
            >
              <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div class="min-w-0">
                  <div class="truncate text-sm font-extrabold text-slate-950">{{ driver.label }}</div>
                  <div class="mt-1 text-xs text-slate-500">{{ driver.statusLabel }}</div>
                </div>
                <div class="pv-badge" :class="driverBadgeClass(driver)">{{ driver.healthLabel }}</div>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <div class="text-xs font-semibold text-slate-500">Em rota</div>
                  <div class="mt-1 text-lg font-black text-slate-950">{{ driver.onRoute }}</div>
                </div>
                <div>
                  <div class="text-xs font-semibold text-slate-500">Concluídas</div>
                  <div class="mt-1 text-lg font-black text-slate-950">{{ driver.delivered }}</div>
                </div>
                <div>
                  <div class="text-xs font-semibold text-slate-500">No prazo</div>
                  <div class="mt-1 text-lg font-black text-slate-950">{{ driver.onTimeRate }}%</div>
                </div>
                <div>
                  <div class="text-xs font-semibold text-slate-500">Alertas</div>
                  <div class="mt-1 text-lg font-black text-slate-950">{{ driver.activeAlerts }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <div
          class="rounded-[28px] border p-5"
          :class="capacityToneClass"
        >
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div class="text-xs font-semibold uppercase tracking-[0.22em]" :class="capacityAccentClass">Capacidade Do Turno</div>
              <div class="mt-2 text-xl font-black text-slate-950">{{ capacityHeadline }}</div>
              <div class="mt-1 text-sm" :class="capacityTextClass">{{ capacityMessage }}</div>
            </div>
            <div class="rounded-2xl bg-white/70 px-4 py-3 text-sm text-slate-700">
              <span class="font-black text-slate-950">{{ capacityPercent }}%</span>
              da frota ocupada
            </div>
          </div>
          <div class="mt-4 h-3 overflow-hidden rounded-full bg-white/70">
            <div class="h-full rounded-full transition-all duration-500" :class="capacityBarClass" :style="{ width: `${capacityPercent}%` }"></div>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-white/70 bg-white/70 p-4">
              <div class="text-xs font-semibold text-slate-500">Folga imediata</div>
              <div class="mt-1 text-2xl font-black text-slate-950">{{ capacityGapLabel }}</div>
              <div class="mt-1 text-sm text-slate-600">Motoristas livres menos saídas prontas</div>
            </div>
            <div class="rounded-2xl border border-white/70 bg-white/70 p-4">
              <div class="text-xs font-semibold text-slate-500">Pedidos liberados</div>
              <div class="mt-1 text-2xl font-black text-slate-950">{{ dispatchStats.readyCount }}</div>
              <div class="mt-1 text-sm text-slate-600">Esperando captura por entregador</div>
            </div>
            <div class="rounded-2xl border border-white/70 bg-white/70 p-4">
              <div class="text-xs font-semibold text-slate-500">Risco operacional</div>
              <div class="mt-1 text-2xl font-black text-slate-950">{{ capacityRiskLabel }}</div>
              <div class="mt-1 text-sm text-slate-600">Leitura rápida da pressão na rua</div>
            </div>
          </div>
        </div>

        <div class="pv-card p-4">
          <div class="text-xs font-semibold text-slate-500">Ações sugeridas</div>
          <div class="mt-3 space-y-3">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-sm font-extrabold text-slate-950">{{ suggestedActionTitle }}</div>
              <div class="mt-1 text-sm text-slate-600">{{ suggestedActionMessage }}</div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button class="pv-chip" @click="showReadyDispatch">
                Ver saídas prontas
              </button>
              <button class="pv-chip" @click="showOnlyUnassigned">
                Ver sem entregador
              </button>
              <button class="pv-chip" @click="showCriticalDispatch">
                Ver críticos
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <div class="pv-card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-xs font-semibold text-slate-500">Performance Do Turno</div>
              <div class="mt-1 text-lg font-extrabold text-slate-950">Pico por horario</div>
              <div class="mt-1 text-sm text-slate-600">Visualize quando os pedidos entraram mais forte hoje.</div>
            </div>
            <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span class="font-black text-slate-950">{{ peakHourLabel }}</span>
              pico do dia
            </div>
          </div>
          <div class="mt-4 space-y-3">
            <div
              v-for="item in topHourBuckets"
              :key="item.hour"
              class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-extrabold text-slate-950">{{ item.label }}</div>
                  <div class="mt-1 text-xs text-slate-500">{{ item.count }} pedido(s)</div>
                </div>
                <div class="text-sm font-black text-slate-950">{{ item.share }}%</div>
              </div>
              <div class="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div class="h-full rounded-full bg-[linear-gradient(90deg,#ff4d00_0%,#ff8a00_100%)]" :style="{ width: `${item.share}%` }"></div>
              </div>
            </div>
            <div v-if="topHourBuckets.length === 0" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Ainda não há pedidos suficientes hoje para gerar pico por horário.
            </div>
          </div>
        </div>

        <div class="pv-card p-5">
          <div class="text-xs font-semibold text-slate-500">Funil Operacional</div>
          <div class="mt-3 space-y-3">
            <div
              v-for="step in flowSteps"
              :key="step.key"
              class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-extrabold text-slate-950">{{ step.label }}</div>
                  <div class="mt-1 text-xs text-slate-500">{{ step.helper }}</div>
                </div>
                <div class="text-xl font-black text-slate-950">{{ step.count }}</div>
              </div>
              <div class="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div class="h-full rounded-full bg-slate-900" :style="{ width: `${step.percent}%` }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <div class="pv-card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-xs font-semibold text-slate-500">Janela Comercial</div>
              <div class="mt-1 text-lg font-extrabold text-slate-950">Horários mais lucrativos</div>
              <div class="mt-1 text-sm text-slate-600">Combine volume com receita para entender onde o caixa acelera de verdade.</div>
            </div>
            <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span class="font-black text-slate-950">{{ bestRevenueWindowLabel }}</span>
              melhor faixa
            </div>
          </div>
          <div class="mt-4 space-y-3">
            <div
              v-for="item in topRevenueBuckets"
              :key="item.hour"
              class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-extrabold text-slate-950">{{ item.label }}</div>
                  <div class="mt-1 text-xs text-slate-500">{{ item.count }} pedido(s) · ticket {{ formatMoney(item.averageTicket) }}</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-black text-slate-950">{{ formatMoney(item.total) }}</div>
                  <div class="mt-1 text-xs text-slate-500">{{ item.share }}% da receita do dia</div>
                </div>
              </div>
              <div class="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div class="h-full rounded-full bg-[linear-gradient(90deg,#ff4d00_0%,#ff8a00_100%)]" :style="{ width: `${item.share}%` }"></div>
              </div>
            </div>
            <div v-if="topRevenueBuckets.length === 0" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Ainda não há receita suficiente hoje para ranquear faixas comerciais.
            </div>
          </div>
        </div>

        <div class="pv-card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-xs font-semibold text-slate-500">Produtividade Da Cozinha</div>
              <div class="mt-1 text-lg font-extrabold text-slate-950">Pressão de preparo</div>
              <div class="mt-1 text-sm text-slate-600">Entenda se a cozinha está fluindo, acumulando fila ou segurando o delivery.</div>
            </div>
            <div class="rounded-2xl px-4 py-3 text-sm" :class="kitchenToneClass">
              <span class="font-black text-slate-950">{{ kitchenPressureLabel }}</span>
              leitura atual
            </div>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-xs font-semibold text-slate-500">Fila em preparo</div>
              <div class="mt-1 text-2xl font-black text-slate-950">{{ kitchenStats.preparingCount }}</div>
              <div class="mt-1 text-sm text-slate-600">Pedidos ativos na cozinha agora</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-xs font-semibold text-slate-500">Giro estimado</div>
              <div class="mt-1 text-2xl font-black text-slate-950">{{ kitchenStats.throughputLabel }}</div>
              <div class="mt-1 text-sm text-slate-600">Pedidos concluídos por hora no dia</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-xs font-semibold text-slate-500">Tempo médio em preparo</div>
              <div class="mt-1 text-2xl font-black text-slate-950">{{ kitchenStats.averagePreparingAge }}</div>
              <div class="mt-1 text-sm text-slate-600">Baseado no que ainda está na cozinha</div>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div class="text-xs font-semibold text-slate-500">Fila acima da meta</div>
              <div class="mt-1 text-2xl font-black text-slate-950">{{ kitchenStats.overTargetCount }}</div>
              <div class="mt-1 text-sm text-slate-600">Pedidos acima do tempo alvo de preparo</div>
            </div>
          </div>
          <div class="mt-4 space-y-3">
            <div
              v-for="item in kitchenBoard"
              :key="item.label"
              class="rounded-2xl border p-4"
              :class="item.className"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-extrabold text-slate-950">{{ item.label }}</div>
                  <div class="mt-1 text-xs text-slate-600">{{ item.helper }}</div>
                </div>
                <div class="text-lg font-black text-slate-950">{{ item.value }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr]">
        <div class="pv-card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-xs font-semibold text-slate-500">Mix Do Canal</div>
              <div class="mt-1 text-lg font-extrabold text-slate-950">Delivery x retirada</div>
              <div class="mt-1 text-sm text-slate-600">Compare volume, receita e ritmo operacional entre os dois canais do turno.</div>
            </div>
            <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span class="font-black text-slate-950">{{ dominantChannelLabel }}</span>
              canal dominante
            </div>
          </div>
          <div class="mt-4 space-y-3">
            <div
              v-for="channel in channelMix"
              :key="channel.key"
              class="rounded-2xl border p-4"
              :class="channelCardClass(channel.key)"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-extrabold text-slate-950">{{ channel.label }}</div>
                  <div class="mt-1 text-xs text-slate-500">{{ channel.count }} pedido(s) · ticket {{ formatMoney(channel.averageTicket) }}</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-black text-slate-950">{{ formatMoney(channel.revenue) }}</div>
                  <div class="mt-1 text-xs text-slate-500">{{ channel.revenueShare }}% da receita</div>
                </div>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <div class="text-xs font-semibold text-slate-500">Pedidos</div>
                  <div class="mt-1 text-lg font-black text-slate-950">{{ channel.orderShare }}%</div>
                </div>
                <div>
                  <div class="text-xs font-semibold text-slate-500">Ciclo atual</div>
                  <div class="mt-1 text-lg font-black text-slate-950">{{ channel.averageCycleLabel }}</div>
                </div>
                <div>
                  <div class="text-xs font-semibold text-slate-500">Itens</div>
                  <div class="mt-1 text-lg font-black text-slate-950">{{ formatMoney(channel.itemsRevenue) }}</div>
                </div>
                <div>
                  <div class="text-xs font-semibold text-slate-500">Frete</div>
                  <div class="mt-1 text-lg font-black text-slate-950">{{ formatMoney(channel.deliveryFeeRevenue) }}</div>
                </div>
              </div>
            </div>
            <div v-if="channelMix.length === 0" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Ainda não há pedidos suficientes hoje para comparar canais.
            </div>
          </div>
        </div>

        <div class="pv-card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-xs font-semibold text-slate-500">Produtos Campeões</div>
              <div class="mt-1 text-lg font-extrabold text-slate-950">O que mais puxou o turno</div>
              <div class="mt-1 text-sm text-slate-600">Veja os itens com maior tração em quantidade e faturamento entre os pedidos do dia.</div>
            </div>
            <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span class="font-black text-slate-950">{{ topProducts.length }}</span>
              item(ns)
            </div>
          </div>
          <div class="mt-4 space-y-3">
            <div
              v-for="(product, index) in topProducts"
              :key="product.name"
              class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-extrabold text-slate-950">{{ index + 1 }}. {{ product.name }}</div>
                  <div class="mt-1 text-xs text-slate-500">{{ product.orders }} pedido(s) · ticket {{ formatMoney(product.averageTicket) }}</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-black text-slate-950">{{ product.qty }} un.</div>
                  <div class="mt-1 text-xs text-slate-500">{{ formatMoney(product.revenue) }}</div>
                </div>
              </div>
              <div class="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div class="h-full rounded-full bg-slate-900" :style="{ width: `${product.share}%` }"></div>
              </div>
            </div>
            <div v-if="topProducts.length === 0" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Ainda não há itens vendidos hoje para gerar ranking de produtos.
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[1.05fr_0.95fr]">
        <div class="pv-card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-xs font-semibold text-slate-500">Oportunidades Do Cardápio</div>
              <div class="mt-1 text-lg font-extrabold text-slate-950">Onde empurrar mais venda</div>
              <div class="mt-1 text-sm text-slate-600">Leitura rápida para decidir destaque, combo e ajuste de oferta ainda no turno.</div>
            </div>
            <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span class="font-black text-slate-950">{{ menuOpportunityCards.length }}</span>
              sinais ativos
            </div>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div
              v-for="card in menuOpportunityCards"
              :key="card.id"
              class="rounded-2xl border p-4"
              :class="menuOpportunityCardClass(card.tone)"
            >
              <div class="text-xs font-semibold uppercase tracking-[0.2em]" :class="menuOpportunityAccentClass(card.tone)">{{ card.label }}</div>
              <div class="mt-2 text-base font-black text-slate-950">{{ card.title }}</div>
              <div class="mt-1 text-sm text-slate-700">{{ card.message }}</div>
            </div>
          </div>
        </div>

        <div class="pv-card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-xs font-semibold text-slate-500">Combos Do Turno</div>
              <div class="mt-1 text-lg font-extrabold text-slate-950">Itens que andam juntos</div>
              <div class="mt-1 text-sm text-slate-600">Use essas combinações para criar sugestão de combo, kit ou adicional na vitrine.</div>
            </div>
            <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span class="font-black text-slate-950">{{ topProductPairs.length }}</span>
              combinação(ões)
            </div>
          </div>
          <div class="mt-4 space-y-3">
            <div
              v-for="pair in topProductPairs"
              :key="pair.key"
              class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-extrabold text-slate-950">{{ pair.label }}</div>
                  <div class="mt-1 text-xs text-slate-500">{{ pair.orders }} pedido(s) juntos · ticket {{ formatMoney(pair.averageTicket) }}</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-black text-slate-950">{{ formatMoney(pair.revenue) }}</div>
                  <div class="mt-1 text-xs text-slate-500">{{ pair.share }}% do combo líder</div>
                </div>
              </div>
              <div class="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div class="h-full rounded-full bg-[linear-gradient(90deg,#222222_0%,#ff4d00_100%)]" :style="{ width: `${pair.share}%` }"></div>
              </div>
            </div>
            <div v-if="topProductPairs.length === 0" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Ainda não há repetição suficiente de itens no mesmo pedido para sugerir combos.
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div class="pv-card p-4">
          <div class="text-xs font-semibold text-slate-500">Ciclo medio</div>
          <div class="mt-1 text-2xl font-black text-slate-950">{{ cycleStats.averageDeliveredCycle }}</div>
          <div class="mt-1 text-sm text-slate-600">Media de criacao ate conclusao dos pedidos entregues hoje</div>
        </div>
        <div class="pv-card p-4">
          <div class="text-xs font-semibold text-slate-500">Tempo medio em preparo</div>
          <div class="mt-1 text-2xl font-black text-slate-950">{{ cycleStats.averagePreparingAge }}</div>
          <div class="mt-1 text-sm text-slate-600">Leitura dos pedidos atualmente em preparo</div>
        </div>
        <div class="pv-card p-4">
          <div class="text-xs font-semibold text-slate-500">Tempo medio na rua</div>
          <div class="mt-1 text-2xl font-black text-slate-950">{{ cycleStats.averageOnRouteAge }}</div>
          <div class="mt-1 text-sm text-slate-600">Baseado nas entregas que ja sairam para entrega</div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[0.95fr_1.05fr]">
        <div class="rounded-[28px] border p-5" :class="anomalyPanelClass">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-xs font-semibold uppercase tracking-[0.22em]" :class="anomalyAccentClass">Radar Do Turno</div>
              <div class="mt-2 text-xl font-black text-slate-950">{{ anomalyHeadline }}</div>
              <div class="mt-1 text-sm" :class="anomalyTextClass">{{ anomalyMessage }}</div>
            </div>
            <div class="rounded-2xl bg-white/70 px-4 py-3 text-sm text-slate-700">
              <span class="font-black text-slate-950">{{ anomalySeverityLabel }}</span>
              risco geral
            </div>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-white/70 bg-white/70 p-4">
              <div class="text-xs font-semibold text-slate-500">Alertas ativos</div>
              <div class="mt-1 text-2xl font-black text-slate-950">{{ activeAnomalyCount }}</div>
              <div class="mt-1 text-sm text-slate-600">Sinais do turno pedindo atenção</div>
            </div>
            <div class="rounded-2xl border border-white/70 bg-white/70 p-4">
              <div class="text-xs font-semibold text-slate-500">Concentração do pico</div>
              <div class="mt-1 text-2xl font-black text-slate-950">{{ peakConcentrationLabel }}</div>
              <div class="mt-1 text-sm text-slate-600">Participação da hora mais forte no dia</div>
            </div>
            <div class="rounded-2xl border border-white/70 bg-white/70 p-4">
              <div class="text-xs font-semibold text-slate-500">Gargalo dominante</div>
              <div class="mt-1 text-2xl font-black text-slate-950">{{ anomalyPrimaryFocus }}</div>
              <div class="mt-1 text-sm text-slate-600">Onde agir primeiro para ganhar vazão</div>
            </div>
          </div>
        </div>

        <div class="pv-card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-xs font-semibold text-slate-500">Alertas Inteligentes</div>
              <div class="mt-1 text-lg font-extrabold text-slate-950">Anomalias detectadas no turno</div>
            </div>
            <button class="pv-btn pv-btn-ghost px-3 py-2 text-xs" @click="clearFilters">Limpar foco</button>
          </div>
          <div class="mt-4 space-y-3">
            <div
              v-for="item in anomalyCards"
              :key="item.id"
              class="rounded-2xl border p-4"
              :class="anomalyCardClass(item.tone)"
            >
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div class="text-sm font-extrabold text-slate-950">{{ item.title }}</div>
                  <div class="mt-1 text-sm text-slate-700">{{ item.message }}</div>
                </div>
                <button class="pv-chip shrink-0" @click="runAnomalyAction(item.action)">
                  {{ item.actionLabel }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="pv-card p-4">
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div class="text-xs font-semibold text-slate-500">Resposta Rápida</div>
              <div class="mt-1 text-lg font-extrabold text-slate-950">Ações em lote do turno</div>
              <div class="mt-1 text-sm text-slate-600">Dispare ações rápidas para destravar a fila sem tratar pedido por pedido.</div>
            </div>
            <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span class="font-black text-slate-950">{{ batchActionableCount }}</span>
              pedido(s) acionáveis
            </div>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <button class="pv-btn bg-orange-500 text-white hover:bg-orange-600" :disabled="batchBusy || readyDispatchOrders.length === 0" @click="releaseReadyBatch">
              {{ batchBusy ? 'Processando...' : `Liberar saídas prontas (${readyDispatchOrders.length})` }}
            </button>
            <button class="pv-btn pv-btn-ghost" :disabled="batchBusy || overdueUnassignedOrders.length === 0" @click="focusCriticalAndNotify">
              Focar críticos ({{ overdueUnassignedOrders.length }})
            </button>
            <button class="pv-btn pv-btn-ghost" :disabled="batchBusy || newOrdersQueue.length === 0" @click="prepareNewOrdersBatch">
              Marcar novos em preparo ({{ newOrdersQueue.length }})
            </button>
          </div>
        </div>

        <div class="pv-card p-4">
          <div class="text-xs font-semibold text-slate-500">Fila priorizada</div>
          <div class="mt-3 space-y-2">
            <div v-for="item in priorityQueuePreview" :key="item.id" class="rounded-2xl border p-3" :class="priorityPreviewClass(item.tone)">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-extrabold text-slate-950">{{ item.customerName }}</div>
                  <div class="mt-1 text-xs text-slate-600">{{ item.reason }}</div>
                </div>
                <div class="pv-badge" :class="priorityPreviewBadgeClass(item.tone)">{{ item.label }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 space-y-3">
        <div
          v-for="o in visibleOrders"
          :key="o.id"
          class="pv-card cursor-pointer p-4"
          :class="orderCardClass(o)"
          @click="orders.clearNew(o.id)"
        >
          <div class="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <div class="text-sm font-extrabold text-slate-900">{{ o.customerName }}</div>
                <div class="pv-badge" :class="statusBadgeClass(o.status)">{{ statusLabel(o.status) }}</div>
                <div v-if="o.paymentMethod" class="pv-badge bg-amber-100 text-amber-900">
                  {{ o.paymentMethod === 'PIX' ? 'PIX' : o.paymentMethod === 'CASH' ? 'Dinheiro' : 'Cartão' }}
                </div>
                <div v-if="o.fulfillmentMethod === 'PICKUP'" class="pv-badge bg-slate-100 text-slate-900">RETIRADA</div>
                <div v-if="o.assignedDriver?.email" class="pv-badge bg-purple-100 text-purple-900">
                  {{ o.assignedDriver.email }}
                </div>
                <div v-else-if="needsDriverAttention(o)" class="pv-badge bg-red-100 text-red-800">SEM ENTREGADOR</div>
                <div v-if="orders.isNew(o.id)" class="pv-badge bg-sky-100 text-sky-700">NOVO</div>
                <div v-if="isCriticalOrder(o)" class="pv-badge bg-red-100 text-red-800">CRITICO</div>
                <div v-else-if="isKitchenBottleneckOrder(o)" class="pv-badge bg-amber-100 text-amber-800">COZINHA</div>
                <div v-else-if="isFreshBacklogOrder(o)" class="pv-badge bg-slate-100 text-slate-800">TRIAGEM</div>
                <div class="text-xs font-semibold text-slate-500">{{ formatTime(o.createdAt) }}</div>
              </div>
              <div class="mt-1 text-sm text-slate-600">{{ formatAddress(o) }}</div>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <div class="pv-badge bg-slate-100 text-slate-800">Previsao: {{ etaMeta(o).etaLabel }}</div>
                <div class="pv-badge bg-slate-100 text-slate-800">Ha {{ etaMeta(o).ageLabel }}</div>
                <div v-if="etaMeta(o).isLate" class="pv-badge bg-red-100 text-red-800">Atrasado ha {{ lateBy(o) }}</div>
              </div>
              <div class="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <div class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Próxima ação sugerida</div>
                <div class="mt-1 text-sm font-semibold text-slate-900">{{ nextBestAction(o).title }}</div>
                <div class="mt-1 text-sm text-slate-600">{{ nextBestAction(o).message }}</div>
              </div>

              <div class="mt-3 space-y-1 text-sm">
                <div v-for="i in o.items" :key="i.id" class="flex justify-between gap-3">
                  <div class="min-w-0">
                    <div class="truncate">{{ i.qty }}x {{ i.productName }}</div>
                    <div v-if="i.note" class="mt-1 text-xs text-orange-700">Obs item: {{ i.note }}</div>
                  </div>
                  <div class="font-semibold">R$ {{ (i.unitPrice / 100).toFixed(2) }}</div>
                </div>
                <div class="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                  <div class="text-sm font-semibold text-slate-600">Total</div>
                  <div class="text-sm font-extrabold">R$ {{ (o.total / 100).toFixed(2) }}</div>
                </div>
                <div v-if="o.customerNote" class="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                  <div class="text-xs font-semibold text-slate-500">Obs</div>
                  <div class="mt-1">{{ o.customerNote }}</div>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-2 md:min-w-[220px]">
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm" :class="orderPriorityTone(o)">
                {{ orderPriorityMessage(o) }}
              </div>
              <button
                v-if="nextBestAction(o).buttonLabel"
                class="pv-btn w-full"
                :class="nextBestActionButtonClass(nextBestAction(o).tone)"
                @click="runNextBestAction(o)"
              >
                {{ nextBestAction(o).buttonLabel }}
              </button>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="shortcut in orderQuickShortcuts(o)"
                  :key="shortcut.key"
                  class="pv-chip"
                  @click="runShortcut(o, shortcut.key)"
                >
                  {{ shortcut.label }}
                </button>
              </div>
              <button
                v-if="canReleaseToDriver(o)"
                class="pv-btn w-full bg-orange-500 text-white hover:bg-orange-600"
                @click="releaseToDriver(o)"
              >
                Liberar para entregador
              </button>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="s in statuses"
                  :key="s"
                  class="pv-btn px-3 py-2 text-xs"
                  :class="statusButtonClass(o.status, s)"
                  @click="orders.setStatus(tenant.slug, o.id, s)"
                >
                  {{ statusLabel(s) }}
                </button>
              </div>
              <button v-if="canUseAddressActions(o)" class="pv-btn pv-btn-ghost w-full" @click="copyAddress(o)">Copiar endereço</button>
              <a
                v-if="canUseAddressActions(o)"
                :href="mapsUrl(o)"
                target="_blank"
                rel="noreferrer"
                class="pv-btn pv-btn-ghost w-full text-center"
              >
                Abrir no Maps
              </a>
              <button class="pv-btn pv-btn-ghost w-full" @click="printOrder(o)">Imprimir</button>
              <a
                v-if="proofUrl(o)"
                :href="proofUrl(o)"
                target="_blank"
                rel="noreferrer"
                class="pv-btn pv-btn-ghost w-full text-center"
              >
                Ver comprovante
              </a>
              <a
                v-if="o.customerPhone"
                :href="customerWhatsUrl(o)"
                target="_blank"
                rel="noreferrer"
                class="pv-btn w-full bg-green-500 text-white hover:bg-green-600"
              >
                Contatar no WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div v-if="visibleOrders.length === 0" class="pv-card p-8 text-center">
          <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-[color:var(--pv-primary-strong)]">
            <svg viewBox="0 0 24 24" class="h-10 w-10" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 5h16v11H4z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 16v3h8v-3" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 9h8" />
            </svg>
          </div>
          <div class="mt-4 text-xl font-black text-slate-950">{{ emptyStateTitle }}</div>
          <div class="mt-2 text-sm text-slate-600">{{ emptyStateMessage }}</div>
          <div class="mt-6 flex flex-wrap justify-center gap-2">
            <button class="pv-btn pv-btn-ghost" @click="clearFilters">Limpar filtros</button>
            <button class="pv-btn pv-btn-primary" @click="refreshOrders">Atualizar pedidos</button>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useTenantStore } from '../../stores/tenant'
import { useOrdersStore } from '../../stores/orders'
import { useUiStore } from '../../stores/ui'
import { api, resolveUploadUrl } from '../../api/client'
import AppShell from '../../components/AppShell.vue'
import { formatMinutesLabel, getOrderEtaMeta } from '../../utils/orderTracking'

const route = useRoute()

const tenant = useTenantStore()
const orders = useOrdersStore()
const ui = useUiStore()

const statuses = ['NOVO', 'PREPARANDO', 'SAIU_PARA_ENTREGA', 'ENTREGUE']
const slug = computed(() => route.params.restaurantSlug)
const statusFilter = ref('NOVO')
const search = ref('')
const fulfillmentFilter = ref('ALL')
const dispatchFilter = ref('ALL')
const nowTick = ref(Date.now())
const driversSummary = ref({ total: 0, free: 0, busy: 0 })
const drivers = ref([])
const batchBusy = ref(false)
let clockTimer = null
let driversTimer = null

const counts = computed(() => orders.countsByStatus || {})
const totalCount = computed(() => (orders.orders || []).length)

const todayStats = computed(() => {
  const all = orders.orders || []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const inDay = all.filter((o) => {
    const d = new Date(o.createdAt)
    return d >= start && d < end
  })
  return {
    count: inDay.length,
    total: inDay.reduce((acc, o) => acc + (o.total || 0), 0),
    byStatus: inDay.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1
      return acc
    }, {})
  }
})

const dashboardStats = computed(() => {
  const all = orders.orders || []
  const visible = visibleOrders.value || []
  const newCount = all.filter((o) => o.status === 'NOVO').length
  const activeCount = all.filter((o) => o.status === 'PREPARANDO' || o.status === 'SAIU_PARA_ENTREGA').length
  const totalVisible = visible.reduce((acc, o) => acc + (o.total || 0), 0)
  return {
    newCount,
    activeCount,
    averageTicket: visible.length ? Math.round(totalVisible / visible.length) : 0
  }
})

const todayProgress = computed(() => {
  const total = todayStats.value.count || 0
  const done = todayStats.value.byStatus?.ENTREGUE || 0
  if (!total) return 0
  return Math.max(8, Math.min(100, Math.round((done / total) * 100)))
})

const dispatchQueue = computed(() =>
  (orders.orders || []).filter((o) => o.fulfillmentMethod === 'DELIVERY' && !o.assignedDriver && (o.status === 'PREPARANDO' || o.status === 'SAIU_PARA_ENTREGA'))
)

const dispatchStats = computed(() => {
  const queue = dispatchQueue.value
  const critical = queue.filter((o) => etaMeta(o).isLate)
  const ready = queue.filter((o) => o.status === 'PREPARANDO')
  const oldest = queue.reduce((max, order) => Math.max(max, etaMeta(order).ageMinutes || 0), 0)
  return {
    unassignedCount: queue.length,
    readyCount: ready.length,
    criticalCount: critical.length,
    oldestAge: formatMinutesLabel(oldest)
  }
})

const nextDispatchOrder = computed(() => {
  const queue = [...dispatchQueue.value]
  if (!queue.length) return null
  queue.sort((a, b) => {
    const lateDiff = Number(etaMeta(b).isLate) - Number(etaMeta(a).isLate)
    if (lateDiff !== 0) return lateDiff
    return (etaMeta(b).ageMinutes || 0) - (etaMeta(a).ageMinutes || 0)
  })
  return queue[0]
})

const nextDispatchTitle = computed(() => {
  if (!nextDispatchOrder.value) return 'Fila sob controle'
  return `${nextDispatchOrder.value.customerName} · ${etaMeta(nextDispatchOrder.value).etaLabel}`
})

const nextDispatchMessage = computed(() => {
  if (!nextDispatchOrder.value) return 'Nenhum pedido de entrega aguardando entregador neste momento.'
  if (etaMeta(nextDispatchOrder.value).isLate) {
    return `Este pedido esta sem entregador e acima da previsao em ${lateBy(nextDispatchOrder.value)}.`
  }
  return `Pedido sem entregador ha ${etaMeta(nextDispatchOrder.value).ageLabel}. Endereco pronto para despacho.`
})

const hourBuckets = computed(() => {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, label: `${String(hour).padStart(2, '0')}:00`, count: 0 }))
  for (const order of todayOrders.value) {
    const date = new Date(order.createdAt)
    const hour = date.getHours()
    if (buckets[hour]) buckets[hour].count += 1
  }
  return buckets
})

const peakHour = computed(() => {
  const sorted = [...hourBuckets.value].sort((a, b) => b.count - a.count)
  return sorted[0]?.count ? sorted[0] : null
})

const peakHourLabel = computed(() => (peakHour.value ? `${peakHour.value.label} (${peakHour.value.count})` : 'Sem pico ainda'))

const topHourBuckets = computed(() => {
  const total = todayStats.value.count || 0
  return [...hourBuckets.value]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((item) => ({
      ...item,
      share: total ? Math.max(8, Math.round((item.count / total) * 100)) : 0
    }))
})

const hourRevenueBuckets = computed(() => {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, label: `${String(hour).padStart(2, '0')}:00`, count: 0, total: 0 }))
  for (const order of todayOrders.value) {
    const date = new Date(order.createdAt)
    const hour = date.getHours()
    if (buckets[hour]) {
      buckets[hour].count += 1
      buckets[hour].total += order.total || 0
    }
  }
  return buckets
})

const topRevenueBuckets = computed(() => {
  const totalRevenue = todayStats.value.total || 0
  return [...hourRevenueBuckets.value]
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 4)
    .map((item) => ({
      ...item,
      share: totalRevenue ? Math.max(8, Math.round((item.total / totalRevenue) * 100)) : 0,
      averageTicket: item.count ? Math.round(item.total / item.count) : 0
    }))
})

const bestRevenueWindowLabel = computed(() => {
  const best = topRevenueBuckets.value[0]
  return best ? `${best.label} · ${formatMoney(best.total)}` : 'Sem dados ainda'
})

const flowSteps = computed(() => {
  const total = todayStats.value.count || 0
  const base = [
    { key: 'NOVO', label: 'Entrada', helper: 'Pedidos recebidos no turno', count: todayStats.value.byStatus?.NOVO || 0 },
    { key: 'PREPARANDO', label: 'Em preparo', helper: 'Pedidos em cozinha ou montagem', count: todayStats.value.byStatus?.PREPARANDO || 0 },
    { key: 'SAIU_PARA_ENTREGA', label: 'Na rua', helper: 'Pedidos ja despachados', count: todayStats.value.byStatus?.SAIU_PARA_ENTREGA || 0 },
    { key: 'ENTREGUE', label: 'Concluidos', helper: 'Pedidos finalizados hoje', count: todayStats.value.byStatus?.ENTREGUE || 0 }
  ]
  return base.map((step) => ({
    ...step,
    percent: total ? Math.max(6, Math.round((step.count / total) * 100)) : 0
  }))
})

const cycleStats = computed(() => {
  const delivered = todayOrders.value.filter((order) => order.status === 'ENTREGUE' && order.createdAt && order.updatedAt)
  const preparing = todayOrders.value.filter((order) => order.status === 'PREPARANDO')
  const onRoute = todayOrders.value.filter((order) => order.status === 'SAIU_PARA_ENTREGA')

  const deliveredAvg = delivered.length
    ? Math.round(
        delivered.reduce((acc, order) => acc + Math.max(0, Math.round((new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime()) / 60000)), 0) /
          delivered.length
      )
    : 0
  const preparingAvg = preparing.length
    ? Math.round(preparing.reduce((acc, order) => acc + (etaMeta(order).ageMinutes || 0), 0) / preparing.length)
    : 0
  const onRouteAvg = onRoute.length
    ? Math.round(onRoute.reduce((acc, order) => acc + (etaMeta(order).ageMinutes || 0), 0) / onRoute.length)
    : 0

  return {
    averageDeliveredCycleMinutes: deliveredAvg,
    averagePreparingAgeMinutes: preparingAvg,
    averageOnRouteAgeMinutes: onRouteAvg,
    averageDeliveredCycle: formatMinutesLabel(deliveredAvg),
    averagePreparingAge: formatMinutesLabel(preparingAvg),
    averageOnRouteAge: formatMinutesLabel(onRouteAvg)
  }
})

const kitchenStats = computed(() => {
  const preparing = todayOrders.value.filter((order) => order.status === 'PREPARANDO')
  const delivered = todayOrders.value.filter((order) => order.status === 'ENTREGUE')
  const overTargetCount = preparing.filter((order) => (etaMeta(order).ageMinutes || 0) >= 18).length
  const averagePreparingAgeMinutes = preparing.length
    ? Math.round(preparing.reduce((acc, order) => acc + (etaMeta(order).ageMinutes || 0), 0) / preparing.length)
    : 0
  const currentHour = new Date().getHours() + 1
  const throughputPerHour = delivered.length ? delivered.length / Math.max(1, currentHour) : 0
  return {
    preparingCount: preparing.length,
    overTargetCount,
    averagePreparingAgeMinutes,
    averagePreparingAge: formatMinutesLabel(averagePreparingAgeMinutes),
    throughputPerHour,
    throughputLabel: delivered.length ? `${throughputPerHour.toFixed(1)}/h` : '0/h'
  }
})

const kitchenPressureLabel = computed(() => {
  if (kitchenStats.value.overTargetCount >= 3 || kitchenStats.value.averagePreparingAgeMinutes >= 20) return 'Alta'
  if (kitchenStats.value.overTargetCount >= 1 || kitchenStats.value.averagePreparingAgeMinutes >= 14) return 'Moderada'
  return 'Saudável'
})

const kitchenToneClass = computed(() => {
  if (kitchenPressureLabel.value === 'Alta') return 'bg-red-50 text-red-800'
  if (kitchenPressureLabel.value === 'Moderada') return 'bg-amber-50 text-amber-800'
  return 'bg-emerald-50 text-emerald-800'
})

const kitchenBoard = computed(() => [
  {
    label: 'Meta de cozinha',
    helper: 'Janela alvo antes de virar gargalo operacional',
    value: '18 min',
    className: 'border-slate-200 bg-slate-50'
  },
  {
    label: 'Pressão da fila',
    helper: kitchenStats.value.overTargetCount
      ? `${kitchenStats.value.overTargetCount} pedido(s) já passaram da meta de preparo.`
      : 'Nenhum pedido acima da meta neste momento.',
    value: kitchenPressureLabel.value,
    className:
      kitchenPressureLabel.value === 'Alta'
        ? 'border-red-200 bg-red-50/70'
        : kitchenPressureLabel.value === 'Moderada'
          ? 'border-amber-200 bg-amber-50/70'
          : 'border-emerald-200 bg-emerald-50/70'
  },
  {
    label: 'Leitura de vazão',
    helper: kitchenStats.value.preparingCount
      ? 'Compare fila ativa da cozinha com o giro médio do dia.'
      : 'Sem fila ativa de preparo agora.',
    value: kitchenStats.value.throughputLabel,
    className: 'border-slate-200 bg-slate-50'
  }
])

const peakConcentration = computed(() => {
  const peakCount = peakHour.value?.count || 0
  const total = todayStats.value.count || 0
  if (!total) return 0
  return Math.round((peakCount / total) * 100)
})

const peakConcentrationLabel = computed(() => `${peakConcentration.value}%`)

const anomalyCards = computed(() => {
  const cards = []

  if (dispatchStats.value.criticalCount > 0) {
    cards.push({
      id: 'critical-dispatch',
      tone: 'danger',
      title: 'Fila critica de entrega',
      message: `${dispatchStats.value.criticalCount} pedido(s) de delivery estao acima da previsao e sem entregador vinculado.`,
      action: 'criticalDispatch',
      actionLabel: 'Ver criticos'
    })
  }

  if (capacityGap.value < 0 || capacityPercent.value >= 85) {
    cards.push({
      id: 'fleet-pressure',
      tone: 'danger',
      title: 'Frota no limite',
      message: capacityGap.value < 0
        ? `Ha ${Math.abs(capacityGap.value)} saida(s) pronta(s) acima da capacidade livre de entregadores.`
        : 'Quase toda a frota esta ocupada agora, o que aumenta risco de atraso nas proximas saidas.',
      action: 'dispatchQueue',
      actionLabel: 'Ver despacho'
    })
  }

  if (cycleStats.value.averagePreparingAgeMinutes >= 18 && cycleStats.value.averagePreparingAgeMinutes > cycleStats.value.averageOnRouteAgeMinutes + 8) {
    cards.push({
      id: 'kitchen-bottleneck',
      tone: 'warning',
      title: 'Cozinha virou gargalo',
      message: `Pedidos em preparo estao com media de ${cycleStats.value.averagePreparingAge}, acima do ritmo atual da rua.`,
      action: 'preparingQueue',
      actionLabel: 'Ver preparo'
    })
  }

  if (peakConcentration.value >= 45 && todayStats.value.count >= 6) {
    cards.push({
      id: 'peak-concentration',
      tone: 'warning',
      title: 'Pico concentrado demais',
      message: `${peakHour.value?.label || 'A hora mais forte'} concentrou ${peakConcentration.value}% dos pedidos de hoje.`,
      action: 'allOrders',
      actionLabel: 'Ver fila'
    })
  }

  if (dashboardStats.value.newCount >= 4 && dispatchStats.value.readyCount === 0) {
    cards.push({
      id: 'front-backlog',
      tone: 'neutral',
      title: 'Acumulo na entrada',
      message: `${dashboardStats.value.newCount} pedido(s) ainda estao em NOVO e podem precisar da primeira acao da equipe.`,
      action: 'newOrders',
      actionLabel: 'Ver novos'
    })
  }

  if (!cards.length) {
    cards.push({
      id: 'healthy',
      tone: 'positive',
      title: 'Turno sob controle',
      message: 'Nao apareceu nenhum sinal forte de gargalo operacional neste momento.',
      action: 'allOrders',
      actionLabel: 'Ver fila'
    })
  }

  return cards
})

const activeAnomalyCount = computed(() => anomalyCards.value.filter((item) => item.id !== 'healthy').length)

const anomalySeverity = computed(() => {
  if (anomalyCards.value.some((item) => item.tone === 'danger')) return 'high'
  if (anomalyCards.value.some((item) => item.tone === 'warning')) return 'medium'
  if (activeAnomalyCount.value > 0) return 'attention'
  return 'low'
})

const anomalySeverityLabel = computed(() => {
  if (anomalySeverity.value === 'high') return 'Alto'
  if (anomalySeverity.value === 'medium') return 'Moderado'
  if (anomalySeverity.value === 'attention') return 'Atencao'
  return 'Baixo'
})

const anomalyHeadline = computed(() => {
  if (anomalySeverity.value === 'high') return 'O turno precisa de ação imediata'
  if (anomalySeverity.value === 'medium') return 'Existem sinais de gargalo se formando'
  if (anomalySeverity.value === 'attention') return 'Há pontos para monitorar de perto'
  return 'A operação está equilibrada agora'
})

const anomalyMessage = computed(() => {
  if (anomalySeverity.value === 'high') return 'Ataque primeiro pedidos críticos e pressão de frota para evitar efeito cascata no delivery.'
  if (anomalySeverity.value === 'medium') return 'Vale redistribuir o foco entre cozinha e despacho antes que o atraso escale.'
  if (anomalySeverity.value === 'attention') return 'Ainda não é crise, mas já existem sinais que merecem acompanhamento.'
  return 'Cozinha, despacho e rua estão rodando com boa leitura de capacidade.'
})

const anomalyPrimaryFocus = computed(() => {
  const first = anomalyCards.value.find((item) => item.id !== 'healthy')
  if (!first) return 'Nenhum'
  if (first.id === 'critical-dispatch') return 'Despacho'
  if (first.id === 'fleet-pressure') return 'Frota'
  if (first.id === 'kitchen-bottleneck') return 'Cozinha'
  if (first.id === 'peak-concentration') return 'Pico'
  if (first.id === 'front-backlog') return 'Triagem'
  return 'Operação'
})

const anomalyPanelClass = computed(() => {
  if (anomalySeverity.value === 'high') return 'border-red-200 bg-red-50/80'
  if (anomalySeverity.value === 'medium') return 'border-amber-200 bg-amber-50/80'
  if (anomalySeverity.value === 'attention') return 'border-slate-200 bg-slate-50/80'
  return 'border-emerald-200 bg-emerald-50/80'
})

const anomalyAccentClass = computed(() => {
  if (anomalySeverity.value === 'high') return 'text-red-700'
  if (anomalySeverity.value === 'medium') return 'text-amber-700'
  if (anomalySeverity.value === 'attention') return 'text-slate-700'
  return 'text-emerald-700'
})

const anomalyTextClass = computed(() => {
  if (anomalySeverity.value === 'high') return 'text-red-800'
  if (anomalySeverity.value === 'medium') return 'text-amber-800'
  if (anomalySeverity.value === 'attention') return 'text-slate-700'
  return 'text-emerald-800'
})

const opsBannerTitle = computed(() => {
  const first = anomalyCards.value[0]
  if (!first) return 'Operação estável no momento'
  return first.title
})

const opsBannerMessage = computed(() => {
  const first = anomalyCards.value[0]
  if (!first) return 'Acompanhe a fila e a capacidade da frota para manter o turno fluindo.'
  return first.message
})

const opsBannerAction = computed(() => {
  const first = anomalyCards.value[0]
  return first?.action || 'allOrders'
})

const opsBannerButtonLabel = computed(() => {
  const first = anomalyCards.value[0]
  return first?.actionLabel || 'Ver fila'
})

const opsBannerClass = computed(() => {
  if (anomalySeverity.value === 'high') return 'border-red-200 bg-red-50/80'
  if (anomalySeverity.value === 'medium') return 'border-amber-200 bg-amber-50/80'
  if (anomalySeverity.value === 'attention') return 'border-slate-200 bg-slate-50/80'
  return 'border-emerald-200 bg-emerald-50/80'
})

const opsBannerAccentClass = computed(() => {
  if (anomalySeverity.value === 'high') return 'text-red-700'
  if (anomalySeverity.value === 'medium') return 'text-amber-700'
  if (anomalySeverity.value === 'attention') return 'text-slate-700'
  return 'text-emerald-700'
})

const opsBannerTextClass = computed(() => {
  if (anomalySeverity.value === 'high') return 'text-red-800'
  if (anomalySeverity.value === 'medium') return 'text-amber-800'
  if (anomalySeverity.value === 'attention') return 'text-slate-700'
  return 'text-emerald-800'
})

const opsBannerButtonClass = computed(() => {
  if (anomalySeverity.value === 'high') return 'bg-red-500 text-white hover:bg-red-600'
  if (anomalySeverity.value === 'medium') return 'bg-orange-500 text-white hover:bg-orange-600'
  if (anomalySeverity.value === 'attention') return 'bg-slate-900 text-white hover:bg-slate-800'
  return 'bg-emerald-500 text-white hover:bg-emerald-600'
})

const opsPulseItems = computed(() => [
  {
    label: `${dispatchStats.value.criticalCount} críticos`,
    className: dispatchStats.value.criticalCount ? 'border-red-200 bg-red-100 text-red-800' : 'border-slate-200 bg-white text-slate-600'
  },
  {
    label: `${dispatchStats.value.readyCount} saídas prontas`,
    className: dispatchStats.value.readyCount ? 'border-amber-200 bg-amber-100 text-amber-900' : 'border-slate-200 bg-white text-slate-600'
  },
  {
    label: `${driversSummary.value.free || 0} motoristas livres`,
    className: Number(driversSummary.value.free || 0) ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'
  }
])

const capacityPercent = computed(() => {
  const total = Number(driversSummary.value.total || 0)
  const busy = Number(driversSummary.value.busy || 0)
  if (!total) return 0
  return Math.min(100, Math.round((busy / total) * 100))
})

const capacityGap = computed(() => Number(driversSummary.value.free || 0) - Number(dispatchStats.value.readyCount || 0))
const capacityGapLabel = computed(() => `${capacityGap.value > 0 ? '+' : ''}${capacityGap.value}`)

const capacityRiskLabel = computed(() => {
  if (!driversSummary.value.total) return 'Sem frota'
  if (capacityGap.value < 0) return 'Alto'
  if (capacityPercent.value >= 85) return 'Alto'
  if (capacityPercent.value >= 60 || dispatchStats.value.criticalCount > 0) return 'Moderado'
  return 'Baixo'
})

const capacityHeadline = computed(() => {
  if (!driversSummary.value.total) return 'Cadastre entregadores para operar delivery'
  if (capacityGap.value < 0) return 'Frota abaixo da demanda pronta para rua'
  if (capacityPercent.value >= 85) return 'Turno operando perto do limite'
  if (dispatchStats.value.criticalCount > 0) return 'Capacidade pressionada por pedidos atrasados'
  return 'Capacidade saudavel para absorver novas saídas'
})

const capacityMessage = computed(() => {
  if (!driversSummary.value.total) return 'Hoje a loja tem pedidos de delivery, mas ainda nao existe frota cadastrada para absorver as saídas.'
  if (capacityGap.value < 0) return `Existem ${Math.abs(capacityGap.value)} saída(s) prontas acima da quantidade de motoristas livres.`
  if (capacityPercent.value >= 85) return 'Quase toda a frota já está em rota. Liberar novos pedidos pode aumentar o tempo de espera.'
  if (dispatchStats.value.criticalCount > 0) return 'Ainda há pedidos críticos sem entregador. Vale redistribuir a operação antes de liberar mais saídas.'
  return 'A fila está equilibrada entre pedidos prontos e motoristas disponíveis.'
})

const capacityToneClass = computed(() => {
  if (!driversSummary.value.total || capacityGap.value < 0 || capacityPercent.value >= 85) return 'border-red-200 bg-red-50/80'
  if (dispatchStats.value.criticalCount > 0 || capacityPercent.value >= 60) return 'border-amber-200 bg-amber-50/80'
  return 'border-emerald-200 bg-emerald-50/80'
})

const capacityAccentClass = computed(() => {
  if (!driversSummary.value.total || capacityGap.value < 0 || capacityPercent.value >= 85) return 'text-red-700'
  if (dispatchStats.value.criticalCount > 0 || capacityPercent.value >= 60) return 'text-amber-700'
  return 'text-emerald-700'
})

const capacityTextClass = computed(() => {
  if (!driversSummary.value.total || capacityGap.value < 0 || capacityPercent.value >= 85) return 'text-red-800'
  if (dispatchStats.value.criticalCount > 0 || capacityPercent.value >= 60) return 'text-amber-800'
  return 'text-emerald-800'
})

const capacityBarClass = computed(() => {
  if (!driversSummary.value.total || capacityGap.value < 0 || capacityPercent.value >= 85) return 'bg-red-500'
  if (dispatchStats.value.criticalCount > 0 || capacityPercent.value >= 60) return 'bg-amber-500'
  return 'bg-emerald-500'
})

const suggestedActionTitle = computed(() => {
  if (!driversSummary.value.total) return 'Próximo passo: montar a frota'
  if (capacityGap.value < 0) return 'Priorize captura de entregas ou reduza novas saídas'
  if (dispatchStats.value.criticalCount > 0) return 'Ataque primeiro os pedidos críticos'
  if (dispatchStats.value.readyCount > 0) return 'Existem pedidos prontos aguardando motorista'
  return 'Operação equilibrada neste momento'
})

const suggestedActionMessage = computed(() => {
  if (!driversSummary.value.total) return 'Cadastre pelo menos um entregador para que o delivery tenha vazão operacional.'
  if (capacityGap.value < 0) return 'A demanda pronta já passou da capacidade livre. Vale puxar entregadores livres ou segurar novas liberações.'
  if (dispatchStats.value.criticalCount > 0) return 'Filtre a fila crítica e resolva os pedidos acima da previsão antes de abrir mais frentes.'
  if (dispatchStats.value.readyCount > 0) return 'Use o filtro de saídas prontas para acompanhar o que já pode ser capturado pela frota.'
  return 'Acompanhe a fila e mantenha o despacho sincronizado com a cozinha.'
})

const visibleOrders = computed(() => {
  const all = orders.orders || []
  let filtered = statusFilter.value === 'ALL' ? all : all.filter((o) => o.status === statusFilter.value)
  if (fulfillmentFilter.value !== 'ALL') {
    filtered = filtered.filter((o) => o.fulfillmentMethod === fulfillmentFilter.value)
  }
  if (dispatchFilter.value === 'UNASSIGNED') {
    filtered = filtered.filter((o) => needsDriverAttention(o))
  }
  if (dispatchFilter.value === 'READY') {
    filtered = filtered.filter((o) => canReleaseToDriver(o))
  }
  if (dispatchFilter.value === 'CRITICAL') {
    filtered = filtered.filter((o) => needsDriverAttention(o) && etaMeta(o).isLate)
  }
  const q = String(search.value || '').toLowerCase()
  const searched = !q ? filtered : filtered.filter((o) => String(o.customerName || '').toLowerCase().includes(q) || String(o.customerPhone || '').includes(q))
  return [...searched].sort((a, b) => {
    const attentionDiff = Number(needsDriverAttention(b)) - Number(needsDriverAttention(a))
    if (attentionDiff !== 0) return attentionDiff
    const lateDiff = Number(etaMeta(b).isLate) - Number(etaMeta(a).isLate)
    if (lateDiff !== 0) return lateDiff
    return (etaMeta(b).ageMinutes || 0) - (etaMeta(a).ageMinutes || 0)
  })
})

const todayOrders = computed(() => {
  const all = orders.orders || []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return all.filter((order) => {
    const date = new Date(order.createdAt)
    return date >= start && date < end
  })
})

const deliveryTodayOrders = computed(() => todayOrders.value.filter((order) => order.fulfillmentMethod === 'DELIVERY'))
const pickupTodayOrders = computed(() => todayOrders.value.filter((order) => order.fulfillmentMethod === 'PICKUP'))

function getOrderSlaMeta(order) {
  const targetMinutes = order?.fulfillmentMethod === 'PICKUP' ? 25 : 55
  const startedAt = order?.createdAt ? new Date(order.createdAt).getTime() : null
  const endedAt = order?.status === 'ENTREGUE' && order?.updatedAt ? new Date(order.updatedAt).getTime() : nowTick.value
  const elapsedMinutes = startedAt ? Math.max(0, Math.round((endedAt - startedAt) / 60000)) : 0
  const overByMinutes = Math.max(0, elapsedMinutes - targetMinutes)
  const isLate = overByMinutes > 0
  const atRisk = !isLate && order?.status !== 'ENTREGUE' && elapsedMinutes >= Math.max(10, targetMinutes - 10)
  return {
    targetMinutes,
    elapsedMinutes,
    overByMinutes,
    isLate,
    atRisk,
    onTime: !isLate
  }
}

const slaStats = computed(() => {
  const list = deliveryTodayOrders.value
  const onTimeCount = list.filter((order) => getOrderSlaMeta(order).onTime && !getOrderSlaMeta(order).atRisk).length
  const atRiskCount = list.filter((order) => getOrderSlaMeta(order).atRisk).length
  const lateCount = list.filter((order) => getOrderSlaMeta(order).isLate).length
  const averageCycle = list.length ? Math.round(list.reduce((acc, order) => acc + getOrderSlaMeta(order).elapsedMinutes, 0) / list.length) : 0
  return {
    onTimeCount,
    atRiskCount,
    lateCount,
    averageCycleLabel: formatMinutesLabel(averageCycle),
    onTimeRate: list.length ? Math.round((onTimeCount / list.length) * 100) : 0
  }
})

const channelMix = computed(() => {
  const totalRevenue = todayStats.value.total || 0
  const totalOrders = todayStats.value.count || 0
  const channels = [
    { key: 'DELIVERY', label: 'Delivery', orders: deliveryTodayOrders.value },
    { key: 'PICKUP', label: 'Retirada', orders: pickupTodayOrders.value }
  ]

  return channels
    .map((channel) => {
      const list = channel.orders || []
      const revenue = list.reduce((acc, order) => acc + (order.total || 0), 0)
      const itemsRevenue = list.reduce((acc, order) => acc + (order.subtotal || 0), 0)
      const deliveryFeeRevenue = list.reduce((acc, order) => acc + (order.deliveryFee || 0), 0)
      const averageTicket = list.length ? Math.round(revenue / list.length) : 0
      const averageCycle = list.length ? Math.round(list.reduce((acc, order) => acc + getOrderSlaMeta(order).elapsedMinutes, 0) / list.length) : 0
      return {
        key: channel.key,
        label: channel.label,
        count: list.length,
        revenue,
        itemsRevenue,
        deliveryFeeRevenue,
        averageTicket,
        averageCycleLabel: formatMinutesLabel(averageCycle),
        revenueShare: totalRevenue ? Math.round((revenue / totalRevenue) * 100) : 0,
        orderShare: totalOrders ? Math.round((list.length / totalOrders) * 100) : 0
      }
    })
    .filter((channel) => channel.count > 0)
    .sort((a, b) => b.revenue - a.revenue)
})

const dominantChannelLabel = computed(() => channelMix.value[0]?.label || 'Sem dados')

const topProducts = computed(() => {
  const productMap = new Map()
  for (const order of todayOrders.value) {
    for (const item of order.items || []) {
      const key = item.productName || 'Produto'
      if (!productMap.has(key)) {
        productMap.set(key, {
          name: key,
          qty: 0,
          revenue: 0,
          orders: 0
        })
      }
      const record = productMap.get(key)
      record.qty += Number(item.qty || 0)
      record.revenue += Number(item.unitPrice || 0) * Number(item.qty || 0)
      record.orders += 1
    }
  }

  const topRevenue = Math.max(0, ...[...productMap.values()].map((item) => item.revenue))
  return [...productMap.values()]
    .map((item) => ({
      ...item,
      averageTicket: item.orders ? Math.round(item.revenue / item.orders) : 0,
      share: topRevenue ? Math.max(10, Math.round((item.revenue / topRevenue) * 100)) : 0
    }))
    .sort((a, b) => {
      const qtyDiff = b.qty - a.qty
      if (qtyDiff !== 0) return qtyDiff
      return b.revenue - a.revenue
    })
    .slice(0, 5)
})

const topProductPairs = computed(() => {
  const pairMap = new Map()
  for (const order of todayOrders.value) {
    const names = [...new Set((order.items || []).map((item) => item.productName).filter(Boolean))].sort()
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) {
        const a = names[i]
        const b = names[j]
        const key = `${a}__${b}`
        if (!pairMap.has(key)) {
          pairMap.set(key, {
            key,
            label: `${a} + ${b}`,
            orders: 0,
            revenue: 0
          })
        }
        const record = pairMap.get(key)
        record.orders += 1
        record.revenue += Number(order.total || 0)
      }
    }
  }
  const maxRevenue = Math.max(0, ...[...pairMap.values()].map((item) => item.revenue))
  return [...pairMap.values()]
    .map((item) => ({
      ...item,
      averageTicket: item.orders ? Math.round(item.revenue / item.orders) : 0,
      share: maxRevenue ? Math.max(10, Math.round((item.revenue / maxRevenue) * 100)) : 0
    }))
    .sort((a, b) => {
      const ordersDiff = b.orders - a.orders
      if (ordersDiff !== 0) return ordersDiff
      return b.revenue - a.revenue
    })
    .slice(0, 4)
})

const menuOpportunityCards = computed(() => {
  const cards = []
  const products = topProducts.value
  const avgTicket = products.length ? Math.round(products.reduce((acc, item) => acc + item.averageTicket, 0) / products.length) : 0
  const anchor = [...products].sort((a, b) => b.revenue - a.revenue)[0]
  const tractionLowTicket = [...products]
    .filter((item) => item.qty >= 2 && item.averageTicket < avgTicket)
    .sort((a, b) => b.qty - a.qty)[0]
  const combo = topProductPairs.value[0]

  if (anchor) {
    cards.push({
      id: 'anchor',
      label: 'Produto âncora',
      title: anchor.name,
      message: `Lidera receita com ${formatMoney(anchor.revenue)}. Vale manter destaque visual e estoque protegido.`,
      tone: 'success'
    })
  }

  if (tractionLowTicket) {
    cards.push({
      id: 'upsell',
      label: 'Upsell rápido',
      title: tractionLowTicket.name,
      message: `Tem alta tração com ${tractionLowTicket.qty} un., mas ticket de ${formatMoney(tractionLowTicket.averageTicket)}. Bom candidato para adicional ou combo.`,
      tone: 'warning'
    })
  }

  if (combo) {
    cards.push({
      id: 'combo',
      label: 'Combo provável',
      title: combo.label,
      message: `Apareceu junto em ${combo.orders} pedido(s). Vale testar sugestão na vitrine ou carrinho.`,
      tone: 'neutral'
    })
  }

  if (!cards.length) {
    cards.push({
      id: 'waiting',
      label: 'Sem leitura',
      title: 'Ainda faltam dados do turno',
      message: 'Quando entrarem mais pedidos, o painel passa a sugerir destaque de produto e combo automaticamente.',
      tone: 'neutral'
    })
  }

  return cards
})

const driverPerformance = computed(() => {
  const map = new Map()

  function ensureDriver(id, label, status) {
    const key = id || label
    if (!key) return null
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        label: label || 'Entregador',
        status: status || 'FREE',
        onRoute: 0,
        delivered: 0,
        onTimeDelivered: 0,
        activeAlerts: 0
      })
    }
    const current = map.get(key)
    if (label && current.label === 'Entregador') current.label = label
    if (status) current.status = status
    return current
  }

  for (const driver of drivers.value || []) {
    ensureDriver(driver.id, driver.email, driver.status)
  }

  for (const order of deliveryTodayOrders.value) {
    const driverId = order?.assignedDriver?.id || order?.assignedDriverId
    const label = order?.assignedDriver?.email || 'Entregador'
    const record = ensureDriver(driverId, label)
    if (!record) continue
    if (order.status === 'SAIU_PARA_ENTREGA') {
      record.onRoute += 1
      if (etaMeta(order).isLate) record.activeAlerts += 1
    }
    if (order.status === 'ENTREGUE') {
      record.delivered += 1
      if (!getOrderSlaMeta(order).isLate) record.onTimeDelivered += 1
    }
  }

  return [...map.values()]
    .map((driver) => {
      const onTimeRate = driver.delivered ? Math.round((driver.onTimeDelivered / driver.delivered) * 100) : 0
      const healthLabel = driver.activeAlerts > 0 ? 'Em alerta' : driver.onRoute > 0 ? 'Em rota' : driver.delivered > 0 ? 'Produtivo' : 'Sem movimento'
      const statusLabel =
        driver.status === 'BUSY'
          ? `${driver.onRoute} entrega(s) em rota agora`
          : driver.delivered
            ? `${driver.delivered} entrega(s) concluída(s) hoje`
            : 'Disponível para novas saídas'
      return {
        ...driver,
        onTimeRate,
        healthLabel,
        statusLabel
      }
    })
    .sort((a, b) => {
      const alertDiff = b.activeAlerts - a.activeAlerts
      if (alertDiff !== 0) return alertDiff
      const routeDiff = b.onRoute - a.onRoute
      if (routeDiff !== 0) return routeDiff
      return b.delivered - a.delivered
    })
})

const overdueUnassignedOrders = computed(() => dispatchQueue.value.filter((order) => etaMeta(order).isLate))
const readyDispatchOrders = computed(() => dispatchQueue.value.filter((order) => order.status === 'PREPARANDO'))
const newOrdersQueue = computed(() => (orders.orders || []).filter((order) => order.status === 'NOVO'))
const kitchenBacklogOrders = computed(() =>
  (orders.orders || []).filter((order) => order.status === 'PREPARANDO' && etaMeta(order).ageMinutes >= Math.max(18, cycleStats.value.averagePreparingAgeMinutes || 0))
)
const batchActionableCount = computed(() => readyDispatchOrders.value.length + newOrdersQueue.value.length)

const priorityQueuePreview = computed(() => {
  const items = [
    ...overdueUnassignedOrders.value.slice(0, 2).map((order) => ({
      id: `critical-${order.id}`,
      customerName: order.customerName,
      reason: `Atrasado há ${lateBy(order)} sem entregador vinculado.`,
      label: 'Critico',
      tone: 'danger'
    })),
    ...kitchenBacklogOrders.value.slice(0, 2).map((order) => ({
      id: `kitchen-${order.id}`,
      customerName: order.customerName,
      reason: `Está em preparo há ${etaMeta(order).ageLabel}.`,
      label: 'Cozinha',
      tone: 'warning'
    })),
    ...newOrdersQueue.value.slice(0, 2).map((order) => ({
      id: `new-${order.id}`,
      customerName: order.customerName,
      reason: `Ainda em NOVO desde ${etaMeta(order).ageLabel}.`,
      label: 'Novo',
      tone: 'neutral'
    }))
  ]
  return items.slice(0, 4)
})

const emptyStateTitle = computed(() => {
  if ((orders.orders || []).length === 0) return 'Nenhum pedido ainda'
  return 'Nenhum pedido encontrado'
})

const emptyStateMessage = computed(() => {
  if ((orders.orders || []).length === 0) return 'Quando um novo pedido entrar, ele aparece aqui em tempo real para sua equipe agir rápido.'
  return 'Tente ajustar busca e filtros para encontrar o pedido que você precisa.'
})

function formatAddress(o) {
  if (o?.fulfillmentMethod === 'PICKUP') {
    const parts = [o.addressStreet, o.addressNumber].filter(Boolean).join(', ')
    const n = o.addressNeighborhood ? ` - ${o.addressNeighborhood}` : ''
    return parts ? `Retirada em: ${parts}${n}` : 'Retirada no local'
  }
  if (!o?.addressStreet || !o?.addressNumber || !o?.addressNeighborhood) return 'Endereço não informado.'
  return `${o.addressStreet}, ${o.addressNumber} - ${o.addressNeighborhood}${o.addressReference ? ` (${o.addressReference})` : ''}`
}

function formatTime(createdAt) {
  if (!createdAt) return ''
  const d = new Date(createdAt)
  return d.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
}

function formatMoney(value) {
  return `R$ ${(Number(value || 0) / 100).toFixed(2)}`
}

function channelCardClass(channelKey) {
  if (channelKey === 'DELIVERY') return 'border-orange-200 bg-orange-50/40'
  return 'border-slate-200 bg-slate-50'
}

function menuOpportunityCardClass(tone) {
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50/60'
  if (tone === 'warning') return 'border-amber-200 bg-amber-50/60'
  return 'border-slate-200 bg-slate-50'
}

function menuOpportunityAccentClass(tone) {
  if (tone === 'success') return 'text-emerald-700'
  if (tone === 'warning') return 'text-amber-700'
  return 'text-slate-600'
}

function statusLabel(status) {
  if (status === 'NOVO') return 'Novo'
  if (status === 'PREPARANDO') return 'Preparando'
  if (status === 'SAIU_PARA_ENTREGA') return 'Saiu'
  if (status === 'ENTREGUE') return 'Entregue'
  return status
}

function statusBadgeClass(status) {
  if (status === 'NOVO') return 'pv-status-new'
  if (status === 'PREPARANDO') return 'pv-status-preparing'
  if (status === 'SAIU_PARA_ENTREGA') return 'bg-emerald-100 text-emerald-800'
  if (status === 'ENTREGUE') return 'pv-status-done'
  return ''
}

function statusButtonClass(current, status) {
  if (current !== status) return 'pv-btn-ghost'
  if (status === 'NOVO') return 'bg-sky-500 text-white'
  if (status === 'PREPARANDO') return 'bg-orange-500 text-white'
  if (status === 'SAIU_PARA_ENTREGA') return 'bg-emerald-500 text-white'
  if (status === 'ENTREGUE') return 'bg-slate-500 text-white'
  return 'bg-slate-900 text-white'
}

function etaMeta(order) {
  return getOrderEtaMeta(order, nowTick.value)
}

function lateBy(order) {
  return formatMinutesLabel(etaMeta(order).lateByMinutes || 0)
}

function isCriticalOrder(order) {
  return needsDriverAttention(order) && etaMeta(order).isLate
}

function isKitchenBottleneckOrder(order) {
  return order?.status === 'PREPARANDO' && etaMeta(order).ageMinutes >= Math.max(18, cycleStats.value.averagePreparingAgeMinutes || 0)
}

function isFreshBacklogOrder(order) {
  return order?.status === 'NOVO' && etaMeta(order).ageMinutes >= 8
}

function orderCardClass(order) {
  if (isCriticalOrder(order)) return 'border-red-300 ring-2 ring-red-100 bg-red-50/30'
  if (isKitchenBottleneckOrder(order)) return 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/30'
  if (isFreshBacklogOrder(order)) return 'border-slate-300 ring-2 ring-slate-100 bg-slate-50/30'
  if (orders.isNew(order.id)) return 'border-sky-300 ring-2 ring-sky-100'
  return 'border-slate-200'
}

function needsDriverAttention(order) {
  return order?.fulfillmentMethod === 'DELIVERY' && !order?.assignedDriver && (order?.status === 'PREPARANDO' || order?.status === 'SAIU_PARA_ENTREGA')
}

function canReleaseToDriver(order) {
  return order?.fulfillmentMethod === 'DELIVERY' && !order?.assignedDriver && order?.status === 'PREPARANDO'
}

function orderPriorityTone(order) {
  if (needsDriverAttention(order) && etaMeta(order).isLate) return 'border-red-200 bg-red-50 text-red-700'
  if (needsDriverAttention(order)) return 'border-amber-200 bg-amber-50 text-amber-800'
  if (etaMeta(order).isLate) return 'border-red-200 bg-red-50 text-red-700'
  return 'text-slate-600'
}

function orderPriorityMessage(order) {
  if (needsDriverAttention(order) && etaMeta(order).isLate) {
    return `Pedido sem entregador e acima da previsao. Excesso: ${lateBy(order)}.`
  }
  if (needsDriverAttention(order)) {
    return `Pedido pronto para despacho. Ainda nao ha entregador vinculado.`
  }
  if (etaMeta(order).isLate) {
    return `Pedido acima da previsao. Excesso: ${lateBy(order)}.`
  }
  return etaMeta(order).detail
}

function nextBestAction(order) {
  if (isCriticalOrder(order)) {
    return {
      title: 'Liberar saída e acionar entrega',
      message: 'Este pedido já passou da previsão e está sem entregador. O ideal é priorizar a rua agora.',
      buttonLabel: canReleaseToDriver(order) ? 'Liberar agora' : 'Focar na fila crítica',
      action: canReleaseToDriver(order) ? 'release' : 'focusCritical',
      tone: 'danger'
    }
  }
  if (order?.status === 'NOVO') {
    return {
      title: 'Começar produção',
      message: 'Pedido novo aguardando a primeira ação da equipe. Colocar em preparo ajuda a reduzir fila de entrada.',
      buttonLabel: 'Marcar em preparo',
      action: 'prepare',
      tone: 'primary'
    }
  }
  if (canReleaseToDriver(order)) {
    return {
      title: 'Despachar para a rua',
      message: 'Pedido já está em preparo e pronto para entrar no fluxo do entregador.',
      buttonLabel: 'Liberar agora',
      action: 'release',
      tone: 'warning'
    }
  }
  if (order?.status === 'SAIU_PARA_ENTREGA') {
    return {
      title: 'Acompanhar conclusão',
      message: 'Pedido já saiu para entrega. O próximo passo é confirmar entrega e manter contato com o cliente se necessário.',
      buttonLabel: 'Marcar entregue',
      action: 'deliver',
      tone: 'success'
    }
  }
  if (order?.paymentMethod === 'PIX' && !order?.paymentProofUrl) {
    return {
      title: 'Conferir pagamento PIX',
      message: 'Ainda não há comprovante anexado. Vale pedir confirmação antes de concluir o pedido.',
      buttonLabel: order?.customerPhone ? 'Chamar no WhatsApp' : null,
      action: 'whatsapp',
      tone: 'neutral'
    }
  }
  return {
    title: 'Seguir monitorando',
    message: 'O pedido está dentro do fluxo esperado. Mantenha a operação sincronizada até a próxima mudança de status.',
    buttonLabel: null,
    action: 'none',
    tone: 'neutral'
  }
}

function nextBestActionButtonClass(tone) {
  if (tone === 'danger') return 'bg-red-500 text-white hover:bg-red-600'
  if (tone === 'warning') return 'bg-orange-500 text-white hover:bg-orange-600'
  if (tone === 'success') return 'bg-emerald-500 text-white hover:bg-emerald-600'
  if (tone === 'primary') return 'pv-btn-primary'
  return 'pv-btn-ghost'
}

function orderQuickShortcuts(order) {
  const shortcuts = []
  if (order?.customerPhone) shortcuts.push({ key: 'whatsapp', label: 'WhatsApp' })
  if (canUseAddressActions(order)) shortcuts.push({ key: 'copyAddress', label: 'Copiar endereço' })
  if (order?.status === 'NOVO') shortcuts.push({ key: 'prepare', label: 'Em preparo' })
  if (canReleaseToDriver(order)) shortcuts.push({ key: 'release', label: 'Liberar' })
  if (order?.status === 'SAIU_PARA_ENTREGA') shortcuts.push({ key: 'deliver', label: 'Entregue' })
  if (proofUrl(order)) shortcuts.push({ key: 'proof', label: 'Comprovante' })
  return shortcuts.slice(0, 4)
}

function clearFilters() {
  search.value = ''
  statusFilter.value = 'ALL'
  fulfillmentFilter.value = 'ALL'
  dispatchFilter.value = 'ALL'
}

function focusDispatchQueue() {
  statusFilter.value = 'ALL'
  fulfillmentFilter.value = 'DELIVERY'
  search.value = ''
}

function showOnlyUnassigned() {
  focusDispatchQueue()
  dispatchFilter.value = 'UNASSIGNED'
}

function showReadyDispatch() {
  focusDispatchQueue()
  dispatchFilter.value = 'READY'
}

function showCriticalDispatch() {
  focusDispatchQueue()
  dispatchFilter.value = 'CRITICAL'
}

function focusPreparingQueue() {
  search.value = ''
  dispatchFilter.value = 'ALL'
  fulfillmentFilter.value = 'ALL'
  statusFilter.value = 'PREPARANDO'
}

function focusNewOrders() {
  search.value = ''
  dispatchFilter.value = 'ALL'
  fulfillmentFilter.value = 'ALL'
  statusFilter.value = 'NOVO'
}

function runAnomalyAction(action) {
  if (action === 'criticalDispatch') {
    showCriticalDispatch()
    return
  }
  if (action === 'dispatchQueue') {
    focusDispatchQueue()
    dispatchFilter.value = 'UNASSIGNED'
    return
  }
  if (action === 'preparingQueue') {
    focusPreparingQueue()
    return
  }
  if (action === 'newOrders') {
    focusNewOrders()
    return
  }
  clearFilters()
}

async function updateOrdersBatch(list, status, successMessage) {
  if (typeof slug.value !== 'string' || !list.length || batchBusy.value) return
  batchBusy.value = true
  try {
    for (const order of list) {
      await orders.setStatus(slug.value, order.id, status)
    }
    await fetchDriversSummary()
    ui.toast({ message: successMessage })
  } finally {
    batchBusy.value = false
  }
}

async function setOrderStatus(order, status, successMessage) {
  if (typeof slug.value !== 'string') return
  await orders.setStatus(slug.value, order.id, status)
  await fetchDriversSummary()
  if (successMessage) ui.toast({ message: successMessage })
}

async function releaseReadyBatch() {
  await updateOrdersBatch(readyDispatchOrders.value.slice(0, 6), 'SAIU_PARA_ENTREGA', 'Saídas prontas liberadas em lote.')
}

async function prepareNewOrdersBatch() {
  await updateOrdersBatch(newOrdersQueue.value.slice(0, 6), 'PREPARANDO', 'Pedidos novos colocados em preparo.')
}

function focusCriticalAndNotify() {
  showCriticalDispatch()
  ui.toast({ message: 'Fila crítica destacada para ação imediata.', type: 'warning' })
}

async function runNextBestAction(order) {
  const action = nextBestAction(order).action
  if (action === 'release') {
    await releaseToDriver(order)
    return
  }
  if (action === 'prepare') {
    await setOrderStatus(order, 'PREPARANDO', 'Pedido colocado em preparo.')
    return
  }
  if (action === 'deliver') {
    await setOrderStatus(order, 'ENTREGUE', 'Pedido marcado como entregue.')
    return
  }
  if (action === 'focusCritical') {
    focusCriticalAndNotify()
    return
  }
  if (action === 'whatsapp' && order?.customerPhone) {
    window.open(customerWhatsUrl(order), '_blank', 'noreferrer')
  }
}

async function runShortcut(order, key) {
  if (key === 'whatsapp' && order?.customerPhone) {
    window.open(customerWhatsUrl(order), '_blank', 'noreferrer')
    return
  }
  if (key === 'copyAddress') {
    await copyAddress(order)
    return
  }
  if (key === 'prepare') {
    await setOrderStatus(order, 'PREPARANDO', 'Pedido colocado em preparo.')
    return
  }
  if (key === 'release') {
    await releaseToDriver(order)
    return
  }
  if (key === 'deliver') {
    await setOrderStatus(order, 'ENTREGUE', 'Pedido marcado como entregue.')
    return
  }
  if (key === 'proof') {
    const url = proofUrl(order)
    if (url) window.open(url, '_blank', 'noreferrer')
  }
}

async function refreshOrders() {
  if (typeof slug.value !== 'string') return
  await Promise.all([orders.fetch(slug.value), fetchDriversSummary()])
  ui.toast({ message: 'Pedidos atualizados.' })
}

async function releaseToDriver(order) {
  if (!canReleaseToDriver(order) || typeof slug.value !== 'string') return
  await orders.setStatus(slug.value, order.id, 'SAIU_PARA_ENTREGA')
  await fetchDriversSummary()
  ui.toast({ message: 'Pedido liberado para entregador.' })
}

async function fetchDriversSummary() {
  if (typeof slug.value !== 'string') return
  try {
    const { data } = await api.get(`/t/${encodeURIComponent(slug.value)}/admin/drivers/summary`)
    drivers.value = data?.drivers || []
    driversSummary.value = data?.summary || { total: 0, free: 0, busy: 0 }
  } catch {
    drivers.value = []
    driversSummary.value = { total: 0, free: 0, busy: 0 }
  }
}

function customerWhatsUrl(o) {
  const text = encodeURIComponent(`Olá ${o.customerName}! Sobre o seu pedido ${o.id}...`)
  return `https://wa.me/${o.customerPhone}?text=${text}`
}

function mapsUrl(o) {
  const query = encodeURIComponent(formatAddress(o))
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

function proofUrl(o) {
  return resolveUploadUrl(o?.paymentProofUrl)
}

function anomalyCardClass(tone) {
  if (tone === 'danger') return 'border-red-200 bg-red-50/70'
  if (tone === 'warning') return 'border-amber-200 bg-amber-50/70'
  if (tone === 'positive') return 'border-emerald-200 bg-emerald-50/70'
  return 'border-slate-200 bg-slate-50'
}

function driverCardClass(driver) {
  if (driver.activeAlerts > 0) return 'border-red-200 bg-red-50/50'
  if (driver.onRoute > 0) return 'border-amber-200 bg-amber-50/50'
  if (driver.delivered > 0) return 'border-emerald-200 bg-emerald-50/50'
  return 'border-slate-200 bg-slate-50'
}

function driverBadgeClass(driver) {
  if (driver.activeAlerts > 0) return 'bg-red-100 text-red-800'
  if (driver.onRoute > 0) return 'bg-amber-100 text-amber-900'
  if (driver.delivered > 0) return 'bg-emerald-100 text-emerald-800'
  return 'bg-slate-100 text-slate-800'
}

function priorityPreviewClass(tone) {
  if (tone === 'danger') return 'border-red-200 bg-red-50/60'
  if (tone === 'warning') return 'border-amber-200 bg-amber-50/60'
  return 'border-slate-200 bg-slate-50'
}

function priorityPreviewBadgeClass(tone) {
  if (tone === 'danger') return 'bg-red-100 text-red-800'
  if (tone === 'warning') return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-800'
}

function canUseAddressActions(o) {
  return o?.fulfillmentMethod !== 'PICKUP' && o?.addressStreet && o?.addressNumber && o?.addressNeighborhood
}

async function copyAddress(o) {
  const text = formatAddress(o)
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    ui.toast({ message: 'Endereço copiado.' })
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
  ui.toast({ message: 'Endereço copiado.' })
}

function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function printOrder(o) {
  const items = (o.items || [])
    .map((i) => `<tr><td>${escapeHtml(`${i.qty}x ${i.productName}`)}${i.note ? `<div style="margin-top:4px; font-size:12px; color:#c2410c">Obs item: ${escapeHtml(i.note)}</div>` : ''}</td><td style="text-align:right">R$ ${escapeHtml((i.unitPrice / 100).toFixed(2))}</td></tr>`)
    .join('')
  const html = `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Pedido ${escapeHtml(o.id)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 10px; }
        .muted { color: #555; font-size: 12px; }
        .box { border: 1px solid #ddd; border-radius: 10px; padding: 12px; margin-top: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        td { padding: 6px 0; border-bottom: 1px solid #eee; font-size: 13px; }
        .total { font-weight: 700; font-size: 14px; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(tenant.restaurant?.name || tenant.slug)} · Pedido ${escapeHtml(o.id)}</h1>
      <div class="muted">${escapeHtml(formatTime(o.createdAt))} · ${escapeHtml(o.status)}</div>

      <div class="box">
        <div><b>Cliente:</b> ${escapeHtml(o.customerName)} (${escapeHtml(o.customerPhone || '-')})</div>
        <div style="margin-top:6px"><b>Endereço:</b> ${escapeHtml(formatAddress(o))}</div>
        ${o.customerNote ? `<div style="margin-top:6px"><b>Obs:</b> ${escapeHtml(o.customerNote)}</div>` : ''}
      </div>

      <div class="box">
        <b>Itens</b>
        <table>${items}</table>
        <div style="display:flex; justify-content:space-between; margin-top:10px" class="total">
          <div>Total</div>
          <div>R$ ${escapeHtml(((o.total || 0) / 100).toFixed(2))}</div>
        </div>
      </div>
      <script>window.onload = () => window.print();<\/script>
    </body>
  </html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
}

onMounted(async () => {
  if (typeof slug.value !== 'string') return
  clockTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 60000)
  driversTimer = setInterval(() => {
    fetchDriversSummary()
  }, 20000)
  await Promise.all([orders.fetch(slug.value), fetchDriversSummary()])
  orders.connect(slug.value)
})

onUnmounted(() => {
  orders.disconnect()
  if (clockTimer) clearInterval(clockTimer)
  if (driversTimer) clearInterval(driversTimer)
})
</script>
