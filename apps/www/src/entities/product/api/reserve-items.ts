import type { Payload, PayloadRequest } from 'payload';
import type { Order } from '@/shared/api/payload-types';
import type { sql } from '@payloadcms/db-postgres';
import { sql as query } from '@payloadcms/db-postgres';

export class ProductReservationError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

type Item = { product: number; quantity: number; size?: string };

type TransactionDb = {
  execute: (query: ReturnType<typeof sql>) => Promise<{ rows: unknown[] }>;
};

export async function reserveItems(
  payload: Payload,
  req: PayloadRequest,
  transactionDb: TransactionDb,
  body: { items: Item[] },
) {
  // Грузим товары заранее — они нужны для списания стока и валидации размеров
  const ids = body.items.map((item) => item.product);

  const { docs: products } = await payload.find({
    collection: 'products',
    where: {
      and: [{ id: { in: ids } }, { status: { equals: 'published' } }],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  });

  const productsById = new Map(
    products.map((product) => [Number(product.id), product]),
  );

  if (ids.some((id) => !productsById.has(id))) {
    throw new ProductReservationError(
      'Некоторые товары больше недоступны. Обнови страницу.',
      404,
    );
  }

  // Проверка размеров: товар существует, размер реально есть у товара
  for (const item of body.items) {
    const product = productsById.get(item.product)!;

    const productSizes = product.sizes as
      Array<{ id?: string | number; label?: string | null }> | undefined;

    if (item.size) {
      if (!productSizes?.length) {
        throw new ProductReservationError(
          `У товара «${product.title}» нет размеров`,
          400,
        );
      }

      const found = productSizes.some((s) => String(s.id) === item.size);

      if (!found) {
        throw new ProductReservationError(
          `Размер для «${product.title}» недоступен. Обнови страницу.`,
          409,
        );
      }
    }
  }

  // Списание остатков (общий stock товара)
  const sortedItems = [...body.items].sort((a, b) => a.product - b.product);

  for (const item of sortedItems) {
    const stockResult = await transactionDb.execute(query`
        UPDATE products
        SET stock = stock - ${item.quantity}
        WHERE id = ${item.product}
          AND status = 'published'
          AND stock >= ${item.quantity}
        RETURNING id
      `);

    if (stockResult.rows.length === 0) {
      throw new ProductReservationError(
        'Некоторые товары закончились или их осталось меньше, чем в корзине. Обнови страницу и проверь заказ.',
        409,
      );
    }
  }

  const items: Order['items'] = body.items.map((item) => {
    const product = productsById.get(item.product)!;

    if (
      typeof product.priceRub !== 'number' ||
      !Number.isFinite(product.priceRub) ||
      product.priceRub < 0
    ) {
      throw new ProductReservationError(
        'У одного из товаров некорректная цена',
      );
    }

    if (
      typeof product.priceByn !== 'number' ||
      !Number.isFinite(product.priceByn) ||
      product.priceByn < 0
    ) {
      throw new ProductReservationError(
        'У одного из товаров некорректная цена в BYN',
      );
    }

    let sizeLabel: string | undefined;

    if (item.size) {
      const productSizes = product.sizes as
        Array<{ id?: string | number; label?: string | null }> | undefined;

      const row = productSizes?.find((s) => String(s.id) === item.size);

      sizeLabel = row?.label ?? undefined;
    }

    return {
      product: item.product,
      quantity: item.quantity,
      unitPrice: product.priceRub,
      unitPriceByn: product.priceByn,
      sizeId: item.size,
      sizeLabel,
    };
  });

  return { items, productsById };
}
