import type { OrderDocument } from '@/entities/order/model/admin-types';
import { isNumber } from './presentation';

export function getPaymentSummary(order: OrderDocument) {
  const items = order.items ?? [];

  /*
   * Сумма товаров по сохранённым ценам заказа (не по текущим ценам товаров).
   * Считаем в копейках, чтобы не накапливать ошибку float.
   * Если в старом заказе нет unitPrice, сумму не выдумываем.
   */
  const itemsTotalKopecks = items.reduce<number | null>((sum, item) => {
    if (sum === null || !isNumber(item.quantity) || !isNumber(item.unitPrice)) {
      return null;
    }

    return sum + Math.round(item.unitPrice * 100) * item.quantity;
  }, 0);

  const itemsTotal =
    items.length > 0 && itemsTotalKopecks !== null
      ? itemsTotalKopecks / 100
      : null;

  const itemsTotalBynKopecks = items.reduce<number | null>((sum, item) => {
    if (sum === null) {
      return null;
    }

    if (!isNumber(item.unitPriceByn) || !isNumber(item.quantity)) {
      return null;
    }

    return sum + Math.round(item.unitPriceByn * 100) * item.quantity;
  }, 0);

  const itemsTotalByn =
    items.length > 0 && itemsTotalBynKopecks !== null
      ? itemsTotalBynKopecks / 100
      : null;

  const hasDiscount =
    Boolean(order.promoCode) ||
    (isNumber(order.discountAmount) && order.discountAmount > 0);

  const discountLabel =
    isNumber(order.discountPercent) && order.discountPercent > 0
      ? `Скидка ${order.discountPercent}%`
      : 'Скидка';

  return { itemsTotal, itemsTotalByn, hasDiscount, discountLabel };
}
