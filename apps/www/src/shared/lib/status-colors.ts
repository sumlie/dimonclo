import { orderStatus, paymentStatus } from '@/entities/order/model/status';
import { productStatus } from '@/entities/product/model/status';

export const statusColors: Record<string, string> = Object.fromEntries(
  Object.entries({ ...productStatus, ...orderStatus, ...paymentStatus }).map(
    ([value, meta]) => [value, meta.color],
  ),
);
