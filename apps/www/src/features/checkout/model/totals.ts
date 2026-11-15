import type { Order } from '@/shared/api/payload-types';

export function calculateTotals(
  items: Order['items'],
  discountPercent: number,
  deliveryPrice: number,
) {
  const productsTotalKopecks = items.reduce(
    (sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity,
    0,
  );

  const discountKopecks = Math.round(
    (productsTotalKopecks * discountPercent) / 100,
  );

  const deliveryKopecks = Math.round(deliveryPrice * 100);

  const total =
    (productsTotalKopecks - discountKopecks + deliveryKopecks) / 100;

  const productsTotalBynKopecks = items.reduce(
    (sum, item) => sum + Math.round(item.unitPriceByn! * 100) * item.quantity,
    0,
  );

  const discountBynKopecks = Math.round(
    (productsTotalBynKopecks * discountPercent) / 100,
  );

  const cartRate =
    productsTotalKopecks > 0
      ? productsTotalBynKopecks / productsTotalKopecks
      : 0;

  const deliveryBynKopecks = Math.round(deliveryKopecks * cartRate);

  const totalBynKopecks =
    productsTotalBynKopecks - discountBynKopecks + deliveryBynKopecks;

  return {
    total,
    discountKopecks,
    discountBynKopecks,
    deliveryKopecks,
    deliveryBynKopecks,
    totalBynKopecks,
  };
}
