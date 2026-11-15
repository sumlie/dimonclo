import { sql } from '@payloadcms/db-postgres';
import {
  authenticateRequest,
  listCustomerIdentities,
} from '@/entities/customer/server';
import {
  reserveItems,
  ProductReservationError,
} from '@/entities/product/server';
import { applyDiscount, PromocodeError } from '@/entities/promocode/server';
import { CheckoutError } from '../model/error';
import { validateBody } from '../model/validation';
import type { TransactionDb } from '../model/types';
import { getDelivery } from '../model/delivery';
import { calculateTotals } from '../model/totals';
import { saveProfile } from '../model/save-profile';
import { notifyOrder } from '../model/notify';

function badRequest(error: string): Response {
  return Response.json(
    { error },
    { status: 400, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request): Promise<Response> {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return badRequest('Некорректный JSON');
  }

  const body = validateBody(rawBody);

  if (typeof body === 'string') {
    return badRequest(body);
  }

  const { payload, req: authReq, user } = await authenticateRequest(request);

  let transactionID: string | number | null = null;

  try {
    transactionID = await payload.db.beginTransaction();

    if (transactionID == null) {
      throw new Error('Не удалось начать транзакцию базы данных');
    }

    const session = payload.db.sessions[transactionID];

    if (!session?.db) {
      throw new Error('Транзакционная сессия базы данных не найдена');
    }

    if (!('execute' in session.db)) {
      throw new Error('Ожидалась PostgreSQL-транзакция');
    }

    const transactionDb = session.db as unknown as TransactionDb;

    const req = authReq;

    req.transactionID = transactionID;

    const customer =
      user?.collection === 'customers' && !user.isBlocked ? user : null;

    let firstOrderEligible = false;

    if (customer) {
      const customerLock = await transactionDb.execute(sql`
        SELECT id FROM customers WHERE id = ${customer.id} FOR UPDATE
      `);

      if (customerLock.rows.length === 0) {
        throw new CheckoutError('Аккаунт покупателя не найден', 401);
      }

      const previousOrders = await payload.find({
        collection: 'orders',
        where: { customer: { equals: customer.id } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      });

      firstOrderEligible = previousOrders.docs.length === 0;
    }

    const deliveryPrices = await payload.findGlobal({
      slug: 'delivery-and-pickup',
      depth: 0,
      overrideAccess: true,
      req,
    });

    if (
      body.deliveryMethod === 'pickup' &&
      (!deliveryPrices.pickupEnabled || !deliveryPrices.pickupAddress?.trim())
    ) {
      throw new CheckoutError(
        'Самовывоз сейчас недоступен. Выбери доставку.',
        409,
      );
    }

    const context = { payload, req, transactionDb };

    const { items, productsById } = await reserveItems(
      payload,
      req,
      transactionDb,
      body,
    );

    const { deliveryPrice, totalWeightG } = await getDelivery(
      context,
      body,
      productsById,
      deliveryPrices,
    );

    const { discountPercent, discountType, appliedPromoCode } =
      await applyDiscount(transactionDb, body.promoCode, firstOrderEligible);

    const {
      total,
      discountKopecks,
      discountBynKopecks,
      deliveryKopecks,
      deliveryBynKopecks,
      totalBynKopecks,
    } = calculateTotals(items, discountPercent, deliveryPrice);

    const deliveryAddress =
      body.deliveryMethod === 'pickup'
        ? deliveryPrices.pickupAddress!.trim()
        : body.deliveryMethod === 'cdek' && body.cdekPointCode
          ? `${body.deliveryAddress}\nКод ПВЗ СДЭК: ${body.cdekPointCode}`
          : body.deliveryAddress;

    const identities = customer
      ? await listCustomerIdentities(payload, customer.id)
      : [];

    const hasEmailProvider = identities.some(
      (i) => i.provider === 'google' || i.provider === 'yandex',
    );

    const hasTelegramProvider = identities.some(
      (i) => i.provider === 'telegram',
    );

    const orderEmail =
      customer && hasEmailProvider ? customer.email : body.email;

    const orderUsername =
      customer && hasTelegramProvider && customer.username?.trim()
        ? customer.username.trim()
        : body.username;

    const order = await payload.create({
      collection: 'orders',
      overrideAccess: true,
      req,
      data: {
        items,
        total,
        totalByn: totalBynKopecks / 100,
        totalWeight: totalWeightG,

        promoCode: appliedPromoCode,
        discountType,
        discountPercent,
        discountAmount: discountKopecks / 100,
        discountAmountByn: discountBynKopecks / 100,
        deliveryPrice: deliveryKopecks / 100,
        deliveryPriceByn: deliveryBynKopecks / 100,

        status: 'new',
        paymentStatus: 'pending',

        customerName: body.customerName,
        username: orderUsername,
        email: orderEmail,
        customer: customer?.id,
        phone: body.phone || undefined,

        deliveryRegion: body.deliveryRegion,
        deliveryMethod: body.deliveryMethod,
        deliveryAddress,
        notificationVersion: 1,
        seenNotificationVersion: 0,

        comment: body.comment || undefined,
      },
    });

    if (customer) {
      await saveProfile(context, body, customer, orderUsername);
    }

    await payload.db.commitTransaction(transactionID);
    transactionID = null;

    try {
      await notifyOrder({
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
      });
    } catch (notificationError) {
      payload.logger.error({
        err: notificationError,
        orderId: order.id,
        msg: 'Order created, but notification failed',
      });
    }

    return Response.json(
      {
        ok: true,
        id: order.id,
        total: order.total,
        discountType,
        discountPercent,
        discountAmount: discountKopecks / 100,
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (transactionID != null) {
      try {
        await payload.db.rollbackTransaction(transactionID);
      } catch (rollbackError) {
        payload.logger.error({
          err: rollbackError,
          msg: 'Checkout rollback failed',
        });
      }
    }

    if (
      error instanceof CheckoutError ||
      error instanceof ProductReservationError ||
      error instanceof PromocodeError
    ) {
      return Response.json(
        { error: error.message },
        {
          status: error instanceof PromocodeError ? 400 : error.status,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    payload.logger.error({ err: error, msg: 'Checkout failed' });

    return Response.json(
      { error: 'Не удалось создать заказ. Попробуй ещё раз.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
