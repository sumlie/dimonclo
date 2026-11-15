import type { PayloadRequest } from 'payload';
import type { Order } from '@/shared/api/payload-types';
import type { Bucket, SearchParams } from '@/shared/lib/order-statistics/types';
import {
  MONTHS,
  firstValue,
  getMinskParts,
  minskStartOfMonth,
  safeNumber,
} from '@/shared/lib/order-statistics/period';

export async function getStatistics(
  req: PayloadRequest,
  searchParams: SearchParams,
) {
  const query = searchParams;
  const now = getMinskParts(new Date());

  const requestedYear = Number(firstValue(query.year));
  const requestedMonth = firstValue(query.month);

  const year =
    Number.isInteger(requestedYear) &&
    requestedYear >= 2020 &&
    requestedYear <= now.year + 1
      ? requestedYear
      : now.year;

  const month =
    requestedMonth === 'all'
      ? 0
      : Number.isInteger(Number(requestedMonth)) &&
          Number(requestedMonth) >= 1 &&
          Number(requestedMonth) <= 12
        ? Number(requestedMonth)
        : now.month;

  const start =
    month === 0
      ? minskStartOfMonth(year, 0)
      : minskStartOfMonth(year, month - 1);

  const end =
    month === 0
      ? minskStartOfMonth(year + 1, 0)
      : minskStartOfMonth(year, month);

  const bucketCount =
    month === 0 ? 12 : new Date(Date.UTC(year, month, 0)).getUTCDate();

  const buckets: Bucket[] = Array.from({ length: bucketCount }, (_, index) => ({
    label:
      month === 0
        ? MONTHS[index]!.slice(0, 3).toLowerCase()
        : String(index + 1),
    orders: 0,
    revenue: 0,
  }));

  let orderCount = 0;
  let paidCount = 0;
  let cancelledCount = 0;
  let pendingCount = 0;

  let revenue = 0;
  let paidDiscounts = 0;
  let paidDelivery = 0;

  const orderStatusCounts: Record<string, number> = {};
  const paymentStatusCounts: Record<string, number> = {};

  /*
   * Читаем все страницы результатов: иначе статистика
   * ограничилась бы первыми 100 или 200 заказами.
   */
  let pageNumber = 1;
  let hasNextPage = true;

  while (hasNextPage) {
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
    });

    for (const order of result.docs as Order[]) {
      orderCount += 1;

      const status = order.status ?? 'unknown';
      const payment = order.paymentStatus ?? 'unknown';

      orderStatusCounts[status] = (orderStatusCounts[status] ?? 0) + 1;
      paymentStatusCounts[payment] = (paymentStatusCounts[payment] ?? 0) + 1;

      if (status === 'cancelled') {
        cancelledCount += 1;
      }

      if (payment === 'pending') {
        pendingCount += 1;
      }

      const date = new Date(order.createdAt);

      if (!Number.isFinite(date.getTime())) {
        continue;
      }

      const parts = getMinskParts(date);
      const bucket = buckets[month === 0 ? parts.month - 1 : parts.day - 1];

      if (bucket) {
        bucket.orders += 1;
      }

      if (payment === 'paid' && status !== 'cancelled') {
        const total = safeNumber(order.total);

        paidCount += 1;
        revenue += total;
        paidDiscounts += safeNumber(order.discountAmount);
        paidDelivery += safeNumber(order.deliveryPrice);

        if (bucket) {
          bucket.revenue += total;
        }
      }
    }

    hasNextPage = result.hasNextPage;
    pageNumber += 1;
  }

  const averageCheck = paidCount > 0 ? revenue / paidCount : 0;
  const maxRevenue = Math.max(0, ...buckets.map((bucket) => bucket.revenue));

  const years = Array.from(
    { length: now.year - 2020 + 2 },
    (_, index) => now.year + 1 - index,
  );

  const periodTitle =
    month === 0 ? `${year} год` : `${MONTHS[month - 1]} ${year}`;

  return {
    year,
    month,
    years,
    periodTitle,
    orderCount,
    paidCount,
    cancelledCount,
    pendingCount,
    revenue,
    paidDiscounts,
    paidDelivery,
    averageCheck,
    maxRevenue,
    buckets,
    orderStatusCounts,
    paymentStatusCounts,
  };
}
