import type { Order, Product } from '@/shared/api/payload-types';
import type { CheckoutBody } from './types';
import { sendOrderNotification } from '@/shared/api/notifications/send-order';

export async function notifyOrder({
  body,
  order,
  items,
  productsById,
  orderUsername,
  orderEmail,
  totalWeightG,
  discountType,
  appliedPromoCode,
  discountPercent,
  discountKopecks,
  discountBynKopecks,
  deliveryPrice,
  deliveryBynKopecks,
  totalBynKopecks,
  deliveryAddress,
}: {
  body: CheckoutBody;
  order: Order;
  items: Order['items'];
  productsById: Map<number, Product>;
  orderUsername: string;
  orderEmail: string;
  totalWeightG: number;
  discountType: string;
  appliedPromoCode?: string;
  discountPercent: number;
  discountKopecks: number;
  discountBynKopecks: number;
  deliveryPrice: number;
  deliveryBynKopecks: number;
  totalBynKopecks: number;
  deliveryAddress: string;
}) {
  const formatNumber = (amount: number) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(amount);

  const formatRub = (amount: number) => `${formatNumber(amount)} ₽`;
  const formatByn = (amount: number) => `${formatNumber(amount)} byn`;

  const formatMoney = (rub: number, byn: number) =>
    `${formatRub(rub)} / ${formatByn(byn)}`;

  const productLines = items.map((item) => {
    const productId =
      typeof item.product === 'object' ? item.product.id : item.product;

    const product = productsById.get(Number(productId));
    const title = product?.title ?? `Товар #${productId}`;
    const sizeText = item.sizeLabel ? ` (${item.sizeLabel})` : '';

    return `• ${title}${sizeText} — ${item.quantity} шт. × ${formatMoney(item.unitPrice, item.unitPriceByn ?? 0)}`;
  });

  const deliveryLabels: Record<string, string> = {
    cdek: 'СДЭК',
    belmail: 'Белпочта',
    euromail: 'Европочта',
    pickup: 'Самовывоз',
  };

  const regionLabels: Record<string, string> = {
    belarus: 'Беларусь',
    russia: 'Россия',
    cis: 'Страны СНГ',
    world: 'Остальной мир',
  };

  const discountLabel =
    discountType === 'first_order'
      ? 'первый заказ'
      : discountType === 'promo_code'
        ? `промокод ${appliedPromoCode ?? ''}`.trim()
        : '';

  const lines = [
    `новый заказ №${order.id}`,
    '',
    `имя: ${body.customerName}`,
    `telegram: ${orderUsername}`,
    `email: ${orderEmail}`,
    body.phone ? `телефон: ${body.phone}` : '',
    '',
    'товары:',
    ...productLines,
    `вес: ${totalWeightG} г`,
    '',
    discountPercent > 0
      ? `скидка ${discountPercent}% (${discountLabel}): −${formatMoney(discountKopecks / 100, discountBynKopecks / 100)}`
      : '',
    `доставка: ${
      deliveryPrice === 0
        ? 'бесплатно'
        : formatMoney(deliveryPrice, deliveryBynKopecks / 100)
    }`,
    `итого: ${formatMoney(order.total, totalBynKopecks / 100)}`,
    '',
    `регион: ${regionLabels[body.deliveryRegion] ?? body.deliveryRegion}`,
    `получение: ${deliveryLabels[body.deliveryMethod] ?? body.deliveryMethod}`,
    `адрес: ${deliveryAddress}`,
    body.comment ? `\nкомментарий: ${body.comment}` : '',
  ];

  const message = lines.join('\n');
  const characters = Array.from(message);

  const safeMessage =
    characters.length > 3900
      ? `${characters.slice(0, 3880).join('')}\n\n…сообщение сокращено`
      : message;

  await sendOrderNotification(safeMessage);
}
