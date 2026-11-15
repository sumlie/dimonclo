import { PaymentSummary } from './payment-summary';
import { CustomerDetails } from './customer-details';
import { OrderHeader } from './order-header';
import { stack } from './styles';
import { getOptions } from '@/shared/lib/order-admin/presentation';
import { SetStepNav } from '@payloadcms/ui';
import type { DocumentViewServerProps } from 'payload';
import { MUTED_OPACITY, border } from '@/shared/ui/payload/theme';
import { Section } from '@/shared/ui/payload/section';
import {
  getProductId,
  getProductsById,
} from '@/shared/api/order-admin/get-products';
import { OrderItemCard } from './order-item-card';
import type { OrderDocument } from '@/shared/lib/order-admin/types';

export default async function OrderView({
  doc,
  initPageResult,
}: DocumentViewServerProps) {
  const order = doc as unknown as OrderDocument;

  const id = String(order.id);
  const items = order.items ?? [];

  const { req } = initPageResult;
  const adminRoute = req.payload.config.routes?.admin ?? '/admin';

  const productsById = await getProductsById(req, items);

  const statusOptions = getOptions(req, 'status');
  const paymentOptions = getOptions(req, 'paymentStatus');

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
      <OrderHeader
        order={order}
        statusOptions={statusOptions}
        paymentOptions={paymentOptions}
      />

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
                const productId = getProductId(item.product);

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
                );
              })}
            </div>
          </Section>

          {/* Единственное место, где показан итог */}
          <PaymentSummary order={order} />
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
          <CustomerDetails order={order} />
        </div>
      </div>
    </div>
  );
}
