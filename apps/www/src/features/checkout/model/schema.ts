import { z } from 'zod';

const invalidData = 'Некорректные данные заказа';

const text = (max: number) =>
  z.string({ error: invalidData }).trim().max(max, { error: invalidData });

const optionalText = (max: number) =>
  z.preprocess((value) => value ?? '', text(max));

export const deliveryRegionSchema = z.enum(
  ['belarus', 'russia', 'cis', 'world'],
  { error: 'Выбери регион доставки' },
);

const deliveryMethodSchema = z.enum(['cdek', 'belmail', 'euromail', 'pickup'], {
  error: 'Выбери способ доставки',
});

const itemError = 'Некорректный товар или количество';

export const checkoutItemSchema = z.object(
  {
    product: z
      .number({ error: itemError })
      .int({ error: itemError })
      .positive({ error: itemError }),
    quantity: z
      .number({ error: itemError })
      .int({ error: itemError })
      .min(1, { error: itemError })
      .max(100, { error: itemError }),
    size: z
      .string({ error: 'Некорректный размер' })
      .trim()
      .min(1, { error: 'Некорректный размер' })
      .max(100, { error: 'Некорректный размер' })
      .nullish()
      .transform((value) => value ?? undefined),
  },
  { error: 'Некорректный товар в заказе' },
);

export const checkoutSchema = z
  .object(
    {
      items: z
        .array(checkoutItemSchema, { error: 'Проверь товары в корзине' })
        .min(1, { error: 'Проверь товары в корзине' })
        .max(100, { error: 'Проверь товары в корзине' }),
      customerName: text(100).min(1, {
        error: 'Заполни имя, email и Telegram',
      }),
      username: text(100).min(1, { error: 'Заполни имя, email и Telegram' }),
      email: text(254)
        .min(1, { error: 'Заполни имя, email и Telegram' })
        .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
          error: 'Укажи корректный email',
        }),
      phone: optionalText(30),
      deliveryRegion: z
        .string({ error: invalidData })
        .trim()
        .pipe(deliveryRegionSchema),
      deliveryMethod: z
        .string({ error: invalidData })
        .trim()
        .pipe(deliveryMethodSchema),
      deliveryAddress: text(500).min(1, {
        error: 'Укажи адрес доставки или пункт выдачи',
      }),
      cdekPointCode: optionalText(100),
      comment: optionalText(1000),
      promoCode: optionalText(40)
        .transform((value) => value.toUpperCase())
        .refine((value) => value === '' || /^[A-Z0-9_-]{3,40}$/.test(value), {
          error: 'Некорректный промокод',
        }),
    },
    { error: 'Некорректное тело запроса' },
  )
  .superRefine((body, context) => {
    const seen = new Set<string>();

    body.items.forEach((item, index) => {
      const key = `${item.product}:${item.size ?? ''}`;

      if (seen.has(key)) {
        context.addIssue({
          code: 'custom',
          path: ['items', index],
          message: 'Один товар указан в корзине несколько раз',
        });
      }

      seen.add(key);
    });

    const issue = (path: string, message: string) =>
      context.addIssue({ code: 'custom', path: [path], message });

    if (body.deliveryMethod === 'pickup' && body.deliveryRegion !== 'belarus') {
      issue('deliveryMethod', 'Самовывоз доступен только в Минске');
    }

    if (body.deliveryRegion === 'russia' && body.deliveryMethod !== 'cdek') {
      issue('deliveryMethod', 'Доставка в Россию доступна только через СДЭК');
    }

    if (
      (body.deliveryRegion === 'cis' || body.deliveryRegion === 'world') &&
      body.deliveryMethod !== 'belmail'
    ) {
      issue(
        'deliveryMethod',
        'Доставка в этот регион доступна только через Белпочту',
      );
    }

    if (
      body.deliveryMethod === 'cdek' &&
      body.deliveryRegion !== 'belarus' &&
      !body.cdekPointCode
    ) {
      issue('cdekPointCode', 'Выбери пункт СДЭК на карте.');
    }
  });

export type CheckoutBody = z.infer<typeof checkoutSchema>;

export type CheckoutItem = z.infer<typeof checkoutItemSchema>;

export type DeliveryRegion = z.infer<typeof deliveryRegionSchema>;
