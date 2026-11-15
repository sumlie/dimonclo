import { SetStepNav } from '@payloadcms/ui'
import type { DocumentViewServerProps, PayloadRequest } from 'payload'

import { BORDER_COLOR, MUTED_OPACITY, border } from '@/shared/lib/theme'
import {
  formatDateTime,
  formatPrice,
  getRelativeTime,
} from '@/shared/lib/format'

import { Info } from '@/shared/ui/info'
import { Section } from '@/shared/ui/section'
import { StatusSelect } from '@/shared/ui/statusSelect'

import { getProductId, getProductsById } from './getProductsById'
import { OrderAdminNote } from './orderAdminNote'
import { OrderItemCard } from './orderItemCard'
import type { OrderDocument } from './types'

const STATUS_UPDATE_URL = '/api/orders/:id/update-status'
const PAYMENT_STATUS_UPDATE_URL = '/api/orders/:id/update-payment-status'

const DELIVERY_METHOD_LABELS: Record<string, string> = {
  pickup: 'Самовывоз',
  cdek: 'СДЭК',
  belmail: 'Белпочта',
  euromail: 'Европочта',
}

const DELIVERY_REGION_LABELS: Record<string, string> = {
  belarus: 'Беларусь',
  russia: 'Россия',
  cis: 'Страны СНГ',
  world: 'Остальной мир',
}

const DISCOUNT_COLOR = '#e56b6f'

function getOptions(req: PayloadRequest, name: string) {
  const field = req.payload.collections.orders.config.fields.find(
    (item) => 'name' in item && item.name === name,
  ) as
    | { options?: ({ label: unknown; value: string } | string)[] }
    | undefined

  return (field?.options ?? []).map((option) =>
    typeof option === 'string'
      ? { label: option, value: option }
      : { label: String(option.label), value: option.value },
  )
}

function getLabel(
  value: string | null | undefined,
  labels: Record<string, string>,
): string {
  if (!value) return '—'
  return labels[value] ?? value
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function formatOptionalPrice(value: unknown): string {
  if (!isNumber(value)) return '—'
  return formatPrice(value) ?? '—'
}

function formatByn(value: unknown): string | null {
  if (!isNumber(value) || value <= 0) return null
  const formatted = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 2,
  }).format(value)
  return `${formatted} BYN`
}

function formatPriceWithByn(rub: unknown, byn: unknown): string {
  const rubText = formatOptionalPrice(rub)
  const bynText = formatByn(byn)
  return bynText ? `${rubText} · ${bynText}` : rubText
}

/* ---------- Локальные блоки оформления ---------- */

function SummaryRow({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '16px',
        fontSize: '14px',
      }}
    >
      <span style={{ opacity: MUTED_OPACITY }}>{label}</span>
      <span style={{ fontWeight: 500, color }}>{value}</span>
    </div>
  )
}

function StatusField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '6px',
      }}
    >
      <span style={{ fontSize: '12px', opacity: MUTED_OPACITY }}>{label}</span>
      <div style={{ position: 'relative', width: 'fit-content' }}>
        {children}
      </div>
    </div>
  )
}

const stack: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '16px',
}

export default async function OrderView({
  doc,
  initPageResult,
}: DocumentViewServerProps) {
  const order = doc as unknown as OrderDocument

  const id = String(order.id)
  const items = order.items ?? []

  const { req } = initPageResult
  const adminRoute = req.payload.config.routes?.admin ?? '/admin'

  const productsById = await getProductsById(req, items)

  const statusOptions = getOptions(req, 'status')
  const paymentOptions = getOptions(req, 'paymentStatus')

  const isPickup = order.deliveryMethod === 'pickup'

  const deliveryMethod = getLabel(order.deliveryMethod, DELIVERY_METHOD_LABELS)
  const deliveryRegion = getLabel(order.deliveryRegion, DELIVERY_REGION_LABELS)

  /*
   * Сумма товаров по сохранённым ценам заказа (не по текущим ценам товаров).
   * Считаем в копейках, чтобы не накапливать ошибку float.
   * Если в старом заказе нет unitPrice, сумму не выдумываем.
   */
  const itemsTotalKopecks = items.reduce<number | null>((sum, item) => {
    if (
      sum === null ||
      !isNumber(item.quantity) ||
      !isNumber(item.unitPrice)
    ) {
      return null
    }
    return sum + Math.round(item.unitPrice * 100) * item.quantity
  }, 0)

  const itemsTotal =
    items.length > 0 && itemsTotalKopecks !== null
      ? itemsTotalKopecks / 100
      : null

  const itemsTotalBynKopecks = items.reduce<number | null>((sum, item) => {
    if (sum === null) return null
    if (!isNumber(item.unitPriceByn) || !isNumber(item.quantity)) return null
    return sum + Math.round(item.unitPriceByn * 100) * item.quantity
  }, 0)

  const itemsTotalByn =
    items.length > 0 && itemsTotalBynKopecks !== null
      ? itemsTotalBynKopecks / 100
      : null

  const hasDiscount =
    Boolean(order.promoCode) ||
    (isNumber(order.discountAmount) && order.discountAmount > 0)

  const discountLabel =
    isNumber(order.discountPercent) && order.discountPercent > 0
      ? `Скидка ${order.discountPercent}%`
      : 'Скидка'

  const deliveryPriceText =
    order.deliveryPrice === 0
      ? 'Бесплатно'
      : formatOptionalPrice(order.deliveryPrice)

  const hasContacts = Boolean(
    order.customerName || order.username || order.email || order.phone,
  )

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        padding: '0 30px 40px',
        boxSizing: 'border-box',
      }}
    >
      {/* Хлебные крошки: Dashboard / Заказы / Заказ №… */}
      <SetStepNav
        nav={[
          { label: 'Orders', url: `${adminRoute}/collections/orders` },
          { label: `Order №${id}` },
        ]}
      />

      {/* Шапка: номер, дата и статусы в одном месте */}
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '24px',
          flexWrap: 'wrap',
          padding: '8px 0 24px',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '26px',
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            Заказ №{id}
          </h1>

          <p
            style={{
              margin: '6px 0 0',
              fontSize: '13px',
              opacity: MUTED_OPACITY,
            }}
          >
            Создан {getRelativeTime(order.createdAt)},{' '}
            {formatDateTime(order.createdAt)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <StatusField label="Статус заказа">
            <StatusSelect
              fieldName="status"
              updateURL={STATUS_UPDATE_URL}
              id={order.id}
              value={order.status}
              options={statusOptions}
            />
          </StatusField>

          <StatusField label="Оплата">
            <StatusSelect
              fieldName="paymentStatus"
              updateURL={PAYMENT_STATUS_UPDATE_URL}
              id={order.id}
              value={order.paymentStatus}
              options={paymentOptions}
            />
          </StatusField>
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          gap: '20px',
        }}
      >
        {/* Левая колонка: что заказали и сколько это стоит */}
        <div
          style={{
            flex: '2 1 520px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <Section
            title="Товары"
            aside={
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 400,
                  opacity: MUTED_OPACITY,
                }}
              >
                Позиций: {items.length}
              </span>
            }
          >
            <div style={stack}>
              {items.length === 0 && (
                <span style={{ fontSize: '14px', opacity: MUTED_OPACITY }}>
                  Нет товаров
                </span>
              )}

              {items.map((item, index) => {
                const productId = getProductId(item.product)

                return (
                  <OrderItemCard
                    key={item.id ?? index}
                    item={item}
                    productId={productId}
                    product={
                      productId != null
                        ? productsById.get(productId)
                        : undefined
                    }
                    adminRoute={adminRoute}
                  />
                )
              })}
            </div>
          </Section>

          {/* Единственное место, где показан итог */}
          <Section title="Оплата">
            <div style={stack}>
              <SummaryRow
                label="Товары"
                value={formatPriceWithByn(itemsTotal, itemsTotalByn)}
              />

              {hasDiscount && (
                <SummaryRow
                  label={discountLabel}
                  value={
                    isNumber(order.discountAmount)
                      ? `− ${formatPriceWithByn(order.discountAmount, order.discountAmountByn)}`
                      : '—'
                  }
                  color={DISCOUNT_COLOR}
                />
              )}

              <SummaryRow
                label={isPickup ? 'Самовывоз' : 'Доставка'}
                value={
                  order.deliveryPrice === 0
                    ? 'Бесплатно'
                    : formatPriceWithByn(order.deliveryPrice, order.deliveryPriceByn)
                }
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: '16px',
                  marginTop: '4px',
                  paddingTop: '14px',
                  borderTop: border,
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 600 }}>Итого к оплате</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>
                    {formatOptionalPrice(order.total)}
                  </div>
                  {isNumber(order.totalByn) && order.totalByn > 0 && (
                    <div style={{ fontSize: '13px', opacity: MUTED_OPACITY, marginTop: '2px' }}>
                      ≈ {formatByn(order.totalByn)}
                    </div>
                  )}
                </div>
              </div>

              {order.paymentMethod && (
                <span
                  style={{
                    fontSize: '13px',
                    opacity: MUTED_OPACITY,
                    borderTop: `1px dashed ${BORDER_COLOR}`,
                    paddingTop: '12px',
                  }}
                >
                  Способ оплаты: {order.paymentMethod}
                </span>
              )}
            </div>
          </Section>
        </div>

        {/* Правая колонка: кто и куда */}
        <div
          style={{
            flex: '1 1 300px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <Section title="Покупатель">
            <div style={stack}>
              {hasContacts ? (
                <>
                  <Info label="Имя" value={order.customerName} />
                  <Info label="Аккаунт" value={order.username} />
                  <Info label="Email" value={order.email} />
                  <Info label="Телефон" value={order.phone} />
                </>
              ) : (
                <span style={{ fontSize: '14px', opacity: MUTED_OPACITY }}>
                  Контактов нет
                </span>
              )}
            </div>
          </Section>

          <Section title="Получение">
            <div style={stack}>
              <Info label="Способ" value={deliveryMethod} />
              {!isPickup && <Info label="Регион" value={deliveryRegion} />}
              <Info
                label={isPickup ? 'Адрес самовывоза' : 'Адрес / пункт выдачи'}
                value={order.deliveryAddress}
              />
            </div>
          </Section>

          {order.comment && (
            <Section title="Комментарий покупателя">
              <div style={{ ...stack, whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                {order.comment}
              </div>
            </Section>
          )}
          <Section title="Заметка">
            <OrderAdminNote id={order.id} initialValue={order.adminNote ?? ''} />
          </Section>
        </div>
      </div>
    </div>
  )
}