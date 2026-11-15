import { sql } from '@payloadcms/db-postgres';

export class PromocodeError extends Error {
  constructor(message: string) {
    super(message);
  }
}

type TransactionDb = {
  execute: (query: ReturnType<typeof sql>) => Promise<{ rows: unknown[] }>;
};

export async function applyDiscount(
  transactionDb: TransactionDb,
  promoCode: string,
  firstOrderEligible: boolean,
) {
  let discountPercent = firstOrderEligible ? 10 : 0;

  let discountType: 'none' | 'first_order' | 'promo_code' = firstOrderEligible
    ? 'first_order'
    : 'none';

  let appliedPromoCode: string | undefined;

  if (promoCode) {
    const result = await transactionDb.execute(sql`
        SELECT id, code, discount_percent, is_active, max_uses, used_count, starts_at, expires_at
        FROM promo_codes
        WHERE code = ${promoCode}
        FOR UPDATE
      `);

    const promo = result.rows[0] as
      | {
          id: number;
          code: string;
          discount_percent: number | string;
          is_active: boolean;
          max_uses: number | null;
          used_count: number;
          starts_at: string | Date | null;
          expires_at: string | Date | null;
        }
      | undefined;

    const now = Date.now();

    const startsAt = promo?.starts_at
      ? new Date(promo.starts_at).getTime()
      : null;

    const expiresAt = promo?.expires_at
      ? new Date(promo.expires_at).getTime()
      : null;

    const unavailable =
      !promo ||
      !promo.is_active ||
      (startsAt !== null && (!Number.isFinite(startsAt) || startsAt > now)) ||
      (expiresAt !== null &&
        (!Number.isFinite(expiresAt) || expiresAt <= now)) ||
      (promo.max_uses !== null && promo.used_count >= promo.max_uses);

    if (unavailable || !promo) {
      throw new PromocodeError('Промокод недействителен или закончился');
    }

    const promoPercent = Number(promo.discount_percent);

    if (
      !Number.isInteger(promoPercent) ||
      promoPercent < 1 ||
      promoPercent > 100
    ) {
      throw new PromocodeError('У промокода некорректная скидка');
    }

    if (promoPercent > discountPercent) {
      discountPercent = promoPercent;
      discountType = 'promo_code';
      appliedPromoCode = promo.code;

      await transactionDb.execute(sql`
          UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ${promo.id}
        `);
    }
  }

  return { discountPercent, discountType, appliedPromoCode };
}
