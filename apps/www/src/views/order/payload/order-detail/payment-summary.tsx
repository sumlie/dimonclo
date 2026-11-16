import type { OrderDocument } from '@/entities/order/model/admin-types';
import { MUTED_OPACITY, BORDER_COLOR, border } from '@/shared/ui/payload/theme';
import { Section } from '@/shared/ui/payload/section';
import { stack } from './styles';
import {
  isNumber,
  DISCOUNT_COLOR,
  formatOptionalPrice,
  formatByn,
  formatPriceWithByn,
} from './presentation';
import { SummaryRow } from './summary-row';
import { getPaymentSummary } from './payment';

export function PaymentSummary({ order }: { order: OrderDocument }) {
  const { itemsTotal, itemsTotalByn, hasDiscount, discountLabel } =
    getPaymentSummary(order);

  const isPickup = order.deliveryMethod === 'pickup';

  return (
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
          <span style={{ fontSize: '15px', fontWeight: 600 }}>
            Итого к оплате
          </span>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>
              {formatOptionalPrice(order.total)}
            </div>
            {isNumber(order.totalByn) && order.totalByn > 0 && (
              <div
                style={{
                  fontSize: '13px',
                  opacity: MUTED_OPACITY,
                  marginTop: '2px',
                }}
              >
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
  );
}
