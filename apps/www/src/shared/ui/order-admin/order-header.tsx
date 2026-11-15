import type { OrderDocument } from '@/shared/lib/order-admin/types';
import { MUTED_OPACITY } from '@/shared/ui/payload/theme';
import { formatDateTime, getRelativeTime } from '@/shared/lib/format';
import { StatusSelect } from '@/shared/ui/payload/status-select';
import { StatusField } from './status-field';
import {
  STATUS_UPDATE_URL,
  PAYMENT_STATUS_UPDATE_URL,
} from '@/shared/lib/order-admin/presentation';

type Option = { label: string; value: string };

export function OrderHeader({
  order,
  statusOptions,
  paymentOptions,
}: {
  order: OrderDocument;
  statusOptions: Option[];
  paymentOptions: Option[];
}) {
  const id = String(order.id);

  return (
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
  );
}
