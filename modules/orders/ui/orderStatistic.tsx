import type { CSSProperties, ReactNode } from 'react'
import type { AdminViewServerProps } from 'payload'
import type { Order } from '@/payloadTypes'

import { DefaultTemplate } from '@payloadcms/ui/rsc'
import { Gutter } from '@payloadcms/ui'

import {
  BORDER_COLOR,
  CARD_BG,
  ERROR_COLOR,
  MUTED_OPACITY,
  SUCCESS_COLOR,
  border,
} from '@/shared/lib/theme'
import { orderStatus, paymentStatus } from '@/modules/orders/status'

type SearchParams = Record<string, string | string[] | undefined>

type Bucket = {
  label: string
  orders: number
  revenue: number
}

const MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

const FALLBACK_COLOR = 'rgba(128, 128, 128, 0.6)'
const CHART_HEIGHT = 200

/* ---------- Стили ---------- */

const card: CSSProperties = {
  minWidth: 0,
  border,
  borderRadius: 6,
  background: CARD_BG,
  padding: 20,
  boxSizing: 'border-box',
}

const muted: CSSProperties = {
  fontSize: 13,
  opacity: MUTED_OPACITY,
}

const control: CSSProperties = {
  height: 36,
  padding: '0 12px',
  border,
  borderRadius: 4,
  background: 'transparent',
  color: 'inherit',
  colorScheme: 'light dark',
  fontSize: 14,
  fontFamily: 'inherit',
}

/* ---------- Утилиты ---------- */

function formatMoney(value: number): string {
  return `${new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 2,
  }).format(value)} ₽`
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function getMinskParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Minsk',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)

  return { year: get('year'), month: get('month'), day: get('day') }
}

/**
 * Для выбираемых здесь дат с 2020 года Минск использует UTC+3.
 * Границы периода полуоткрытые: [начало, конец).
 */
function minskStartOfMonth(year: number, monthIndex: number): Date {
  return new Date(Date.UTC(year, monthIndex, 1, -3))
}

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/* ---------- Компоненты ---------- */

function StatCard({
  label,
  value,
  hint,
  accent,
  large,
}: {
  label: string
  value: string | number
  hint?: string
  accent?: string
  large?: boolean
}) {
  return (
    <div
      style={{
        ...card,
        borderLeft: accent ? `3px solid ${accent}` : border,
      }}
    >
      <div style={muted}>{label}</div>

      <div
        style={{
          marginTop: 10,
          fontSize: large ? 30 : 24,
          fontWeight: 700,
          lineHeight: 1.2,
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </div>

      {hint && (
        <div style={{ ...muted, marginTop: 8, fontSize: 12, lineHeight: 1.5 }}>
          {hint}
        </div>
      )}
    </div>
  )
}

function Block({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section style={card}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h2>

      {subtitle && <p style={{ ...muted, margin: '6px 0 0' }}>{subtitle}</p>}

      <div style={{ marginTop: 20 }}>{children}</div>
    </section>
  )
}

function Breakdown({
  title,
  counts,
  meta,
}: {
  title: string
  counts: Record<string, number>
  meta: Record<string, { label: string; color: string }>
}) {
  const rows = Object.entries(counts).sort(([, a], [, b]) => b - a)
  const total = rows.reduce((sum, [, count]) => sum + count, 0)

  return (
    <Block title={title}>
      {rows.length === 0 ? (
        <p style={{ ...muted, margin: 0 }}>Нет данных</p>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {rows.map(([key, count]) => {
            const color = meta[key]?.color ?? FALLBACK_COLOR
            const percent = total > 0 ? (count / total) * 100 : 0

            return (
              <div key={key} style={{ display: 'grid', gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    fontSize: 14,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: color,
                      }}
                    />
                    {meta[key]?.label ?? key}
                  </span>

                  <span>
                    <strong>{count}</strong>
                    <span style={{ ...muted, marginLeft: 8 }}>
                      {Math.round(percent)}%
                    </span>
                  </span>
                </div>

                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: BORDER_COLOR,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${percent}%`,
                      height: '100%',
                      background: color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Block>
  )
}

function RevenueChart({
  buckets,
  maxRevenue,
  wide,
}: {
  buckets: Bucket[]
  maxRevenue: number
  wide: boolean
}) {
  const ticks = [1, 0.75, 0.5, 0.25, 0]

  return (
    <div style={{ overflowX: 'auto' }}>
      <div
        style={{
          display: 'flex',
          gap: 12,
          minWidth: wide ? 760 : 480,
        }}
      >
        {/* Подписи оси Y */}
        <div
          style={{
            position: 'relative',
            width: 44,
            height: CHART_HEIGHT,
            flexShrink: 0,
          }}
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              style={{
                ...muted,
                position: 'absolute',
                right: 0,
                top: `${(1 - tick) * 100}%`,
                transform: 'translateY(-50%)',
                fontSize: 11,
              }}
            >
              {maxRevenue > 0 ? formatCompact(maxRevenue * tick) : 0}
            </span>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Область графика */}
          <div
            style={{
              position: 'relative',
              height: CHART_HEIGHT,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 4,
            }}
          >
            {ticks.map((tick) => (
              <div
                key={tick}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${(1 - tick) * 100}%`,
                  borderTop: `1px ${tick === 0 ? 'solid' : 'dashed'} ${BORDER_COLOR}`,
                  pointerEvents: 'none',
                }}
              />
            ))}

            {buckets.map((bucket, index) => {
              const height =
                maxRevenue > 0 ? (bucket.revenue / maxRevenue) * 100 : 0

              return (
                <div
                  key={`${bucket.label}-${index}`}
                  title={`${bucket.label}: ${formatMoney(bucket.revenue)}; заказов всего: ${bucket.orders}`}
                  style={{
                    position: 'relative',
                    flex: 1,
                    minWidth: 0,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 36,
                      height: `${height}%`,
                      minHeight: bucket.revenue > 0 ? 3 : 0,
                      background: SUCCESS_COLOR,
                      borderRadius: '3px 3px 0 0',
                    }}
                  />
                </div>
              )
            })}
          </div>

          {/* Подписи оси X */}
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {buckets.map((bucket, index) => (
              <span
                key={`${bucket.label}-${index}`}
                style={{
                  ...muted,
                  flex: 1,
                  minWidth: 0,
                  textAlign: 'center',
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                }}
              >
                {bucket.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function OrdersStatistic({
  initPageResult,
  params,
  searchParams,
  user,
}: AdminViewServerProps) {
  const { req } = initPageResult

  // Проверяем именно серверного пользователя.
  if (req.user?.collection !== 'admins') {
    return <p>Нет доступа к статистике.</p>
  }

  const query = (await searchParams) as SearchParams
  const now = getMinskParts(new Date())

  const requestedYear = Number(firstValue(query.year))
  const requestedMonth = firstValue(query.month)

  const year =
    Number.isInteger(requestedYear) &&
    requestedYear >= 2020 &&
    requestedYear <= now.year + 1
      ? requestedYear
      : now.year

  const month =
    requestedMonth === 'all'
      ? 0
      : Number.isInteger(Number(requestedMonth)) &&
          Number(requestedMonth) >= 1 &&
          Number(requestedMonth) <= 12
        ? Number(requestedMonth)
        : now.month

  const start =
    month === 0 ? minskStartOfMonth(year, 0) : minskStartOfMonth(year, month - 1)

  const end =
    month === 0 ? minskStartOfMonth(year + 1, 0) : minskStartOfMonth(year, month)

  const bucketCount =
    month === 0 ? 12 : new Date(Date.UTC(year, month, 0)).getUTCDate()

  const buckets: Bucket[] = Array.from({ length: bucketCount }, (_, index) => ({
    label:
      month === 0
        ? MONTHS[index].slice(0, 3).toLowerCase()
        : String(index + 1),
    orders: 0,
    revenue: 0,
  }))

  let orderCount = 0
  let paidCount = 0
  let cancelledCount = 0
  let pendingCount = 0

  let revenue = 0
  let paidDiscounts = 0
  let paidDelivery = 0

  const orderStatusCounts: Record<string, number> = {}
  const paymentStatusCounts: Record<string, number> = {}

  /*
   * Читаем все страницы результатов: иначе статистика
   * ограничилась бы первыми 100 или 200 заказами.
   */
  let pageNumber = 1
  let hasNextPage = true

  while (hasNextPage) {
    //@ts-ignore
    const result = await req.payload.find({
      collection: 'orders',
      where: {
        and: [
          { createdAt: { greater_than_equal: start.toISOString() } },
          { createdAt: { less_than: end.toISOString() } },
        ],
      },
      page: pageNumber,
      limit: 200,
      depth: 0,
      sort: 'createdAt',
      user: req.user,
      overrideAccess: false,
      req,
    })

    //@ts-ignore
    for (const order of result.docs as Order[]) {
      orderCount += 1

      const status = order.status ?? 'unknown'
      const payment = order.paymentStatus ?? 'unknown'

      orderStatusCounts[status] = (orderStatusCounts[status] ?? 0) + 1
      paymentStatusCounts[payment] = (paymentStatusCounts[payment] ?? 0) + 1

      if (status === 'cancelled') cancelledCount += 1
      if (payment === 'pending') pendingCount += 1

      const date = new Date(order.createdAt)
      if (!Number.isFinite(date.getTime())) continue

      const parts = getMinskParts(date)
      const bucket = buckets[month === 0 ? parts.month - 1 : parts.day - 1]

      if (bucket) bucket.orders += 1

      if (payment === 'paid' && status !== 'cancelled') {
        const total = safeNumber(order.total)

        paidCount += 1
        revenue += total
        paidDiscounts += safeNumber(order.discountAmount)
        paidDelivery += safeNumber(order.deliveryPrice)

        if (bucket) bucket.revenue += total
      }
    }

    hasNextPage = result.hasNextPage
    pageNumber += 1
  }

  const averageCheck = paidCount > 0 ? revenue / paidCount : 0
  const maxRevenue = Math.max(0, ...buckets.map((bucket) => bucket.revenue))

  const years = Array.from(
    { length: now.year - 2020 + 2 },
    (_, index) => now.year + 1 - index,
  )

  const periodTitle = month === 0 ? `${year} год` : `${MONTHS[month - 1]} ${year}`

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={req.payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={user}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <div style={{ padding: '16px 0 48px' }}>
          <header
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 20,
              marginBottom: 24,
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>
                Статистика заказов
              </h1>

              <p style={{ ...muted, margin: '6px 0 0' }}>
                {periodTitle} · по дате создания · время Минска
              </p>
            </div>

            <form
              method="get"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                gap: 12,
              }}
            >
              <label style={{ display: 'grid', gap: 6, ...muted }}>
                Год
                <select name="year" defaultValue={year} style={control}>
                  {years.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: 6, ...muted }}>
                Период
                <select
                  name="month"
                  defaultValue={month === 0 ? 'all' : String(month)}
                  style={{ ...control, minWidth: 150 }}
                >
                  <option value="all">Весь год</option>

                  {MONTHS.map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                style={{
                  ...control,
                  padding: '0 18px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  background: CARD_BG,
                }}
              >
                Показать
              </button>
            </form>
          </header>

          {/* Главные показатели */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
              gap: 12,
            }}
          >
            <StatCard
              large
              accent={SUCCESS_COLOR}
              label="Выручка"
              value={formatMoney(revenue)}
              hint="Оплаченные заказы без отменённых, включая доставку"
            />

            <StatCard
              large
              label="Средний чек"
              value={formatMoney(averageCheck)}
              hint={`Оплаченных заказов: ${paidCount}`}
            />

            <StatCard
              large
              label="Всего заказов"
              value={orderCount}
              hint="Все созданные за выбранный период"
            />
          </div>

          {/* Второстепенные показатели */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
              gap: 12,
              marginTop: 12,
            }}
          >
            <StatCard label="Ожидают оплаты" value={pendingCount} />
            <StatCard
              label="Отменено"
              value={cancelledCount}
              accent={cancelledCount > 0 ? ERROR_COLOR : undefined}
            />
            <StatCard label="Скидки" value={formatMoney(paidDiscounts)} />
            <StatCard label="Доставка" value={formatMoney(paidDelivery)} />
          </div>

          <div style={{ marginTop: 20 }}>
            <Block
              title={`Выручка по ${month === 0 ? 'месяцам' : 'дням'}`}
              subtitle="Высота столбца — сумма оплаченных заказов. Наведите, чтобы увидеть точное значение."
            >
              <RevenueChart
                buckets={buckets}
                maxRevenue={maxRevenue}
                wide={month !== 0}
              />

              {orderCount === 0 && (
                <p style={{ ...muted, margin: '16px 0 0' }}>
                  За выбранный период заказов нет.
                </p>
              )}
            </Block>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: 12,
              marginTop: 20,
            }}
          >
            <Breakdown
              title="Статусы заказов"
              counts={orderStatusCounts}
              meta={orderStatus}
            />

            <Breakdown
              title="Статусы оплаты"
              counts={paymentStatusCounts}
              meta={paymentStatus}
            />
          </div>

          <p
            style={{
              ...muted,
              margin: '20px 0 0',
              fontSize: 12,
              lineHeight: 1.6,
              paddingTop: 16,
              borderTop: `1px dashed ${BORDER_COLOR}`,
            }}
          >
            Показатели используют текущие статусы заказов: если изменить статус
            старого заказа, статистика за месяц его создания тоже изменится.
            Возвращённые и отменённые заказы не входят в выручку.
          </p>
        </div>
      </Gutter>
    </DefaultTemplate>
  )
}