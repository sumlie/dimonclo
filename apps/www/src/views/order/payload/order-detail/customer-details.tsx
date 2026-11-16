import type { OrderDocument } from '@/entities/order/model/admin-types';
import { MUTED_OPACITY } from '@/shared/ui/payload/theme';
import { Info } from '@/shared/ui/payload/info';
import { Section } from '@/shared/ui/payload/section';
import { stack } from './styles';
import {
  getLabel,
  DELIVERY_METHOD_LABELS,
  DELIVERY_REGION_LABELS,
} from './presentation';
import { OrderAdminNote } from './order-admin-note';

export function CustomerDetails({ order }: { order: OrderDocument }) {
  const hasContacts = Boolean(
    order.customerName || order.username || order.email || order.phone,
  );

  const isPickup = order.deliveryMethod === 'pickup';
  const deliveryMethod = getLabel(order.deliveryMethod, DELIVERY_METHOD_LABELS);
  const deliveryRegion = getLabel(order.deliveryRegion, DELIVERY_REGION_LABELS);

  return (
    <>
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
    </>
  );
}
