import type { Product, DeliveryAndPickup } from '@/shared/api/payload-types';
import type { CheckoutBody, CheckoutContext } from './types';
import { CheckoutError } from './error';
import { getCdekQuote } from '@/shared/api/cdek';

export async function getDelivery(
  { payload }: CheckoutContext,
  body: CheckoutBody,
  productsById: Map<number, Product>,
  deliveryPrices: DeliveryAndPickup,
) {
  // === ВЕС ЗАКАЗА ===
  let productWeightG = 0;

  for (const item of body.items) {
    const product = productsById.get(item.product)!;
    const weight = Number(product.weight);

    if (!Number.isFinite(weight) || weight <= 0) {
      throw new CheckoutError(
        `У товара «${product.title}» не указан вес (граммы). Обратись в поддержку.`,
        422,
      );
    }

    productWeightG += weight * item.quantity;
  }

  const deliverySettings = deliveryPrices;

  const settingsData = deliverySettings as unknown as {
    senderCountryCode?: string | null;
    senderCity?: string | null;
    senderAddress?: string | null;
    packagingWeightG?: number | null;
  };

  const rawPackaging = Number(settingsData.packagingWeightG ?? 0);

  const packagingWeightG =
    Number.isFinite(rawPackaging) && rawPackaging > 0 ? rawPackaging : 0;

  const totalWeightG = Math.round(productWeightG + packagingWeightG);

  // === СДЭК (цена зависит от веса) ===
  let cdekDeliveryRub: number | null = null;

  if (body.deliveryMethod === 'cdek' && body.deliveryRegion !== 'belarus') {
    const senderCountry = String(settingsData.senderCountryCode ?? '').trim();
    const senderCity = String(settingsData.senderCity ?? '').trim();
    const senderAddress = String(settingsData.senderAddress ?? '').trim();

    if (!senderCountry || !senderCity || !senderAddress) {
      throw new CheckoutError(
        'Настройки отправителя для СДЭК не заполнены.',
        500,
      );
    }

    try {
      const quote = await getCdekQuote(body.cdekPointCode, totalWeightG, {
        country_code: senderCountry,
        city: senderCity,
        address: senderAddress,
      });

      if (quote.country !== 'RU') {
        throw new CheckoutError(
          'Пункт СДЭК не соответствует выбранному региону.',
          400,
        );
      }

      cdekDeliveryRub = quote.priceRub;
    } catch (error) {
      if (error instanceof CheckoutError) {
        throw error;
      }

      payload.logger.error({
        err: error,
        msg: 'CDEK quote failed during checkout',
        pointCode: body.cdekPointCode,
        weightG: totalWeightG,
      });
      throw new CheckoutError(
        'Не удалось рассчитать доставку СДЭК. Попробуй позже.',
        502,
      );
    }
  }

  const deliveryPrice =
    body.deliveryMethod === 'pickup'
      ? 0
      : body.deliveryRegion === 'belarus'
        ? 0
        : body.deliveryMethod === 'cdek'
          ? cdekDeliveryRub
          : body.deliveryRegion === 'cis'
            ? deliveryPrices.cis
            : body.deliveryRegion === 'world'
              ? deliveryPrices.world
              : null;

  if (
    typeof deliveryPrice !== 'number' ||
    !Number.isFinite(deliveryPrice) ||
    deliveryPrice < 0
  ) {
    throw new CheckoutError(
      'Не удалось определить стоимость доставки. Попробуй позже.',
      500,
    );
  }

  return { deliveryPrice, totalWeightG };
}
