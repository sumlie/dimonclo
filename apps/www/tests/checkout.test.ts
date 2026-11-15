import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Payload, PayloadRequest } from 'payload';
import { validateBody } from '../src/features/checkout/model/validation';
import { calculateTotals } from '../src/features/checkout/model/totals';
import {
  reserveItems,
  ProductReservationError,
} from '../src/entities/product/api/reserve-items';
import {
  applyDiscount,
  PromocodeError,
} from '../src/entities/promocode/api/apply-discount';

const validBody = {
  items: [{ product: 1, quantity: 2 }],
  customerName: 'Customer',
  username: '@customer',
  email: 'customer@example.com',
  phone: '',
  deliveryRegion: 'belarus',
  deliveryMethod: 'pickup',
  deliveryAddress: 'Minsk',
};

test('checkout rejects invalid quantities, duplicate rows and incompatible delivery', () => {
  assert.equal(typeof validateBody(validBody), 'object');

  for (const body of [
    { ...validBody, items: [{ product: 1, quantity: 0 }] },
    { ...validBody, items: [{ product: 1, quantity: 1.5 }] },
    { ...validBody, items: [...validBody.items, ...validBody.items] },
    { ...validBody, deliveryRegion: 'russia' },
    { ...validBody, deliveryRegion: 'world', deliveryMethod: 'cdek' },
  ]) {
    assert.equal(typeof validateBody(body), 'string');
  }
});

test('totals apply discounts in minor units and derive BYN delivery from cart prices', () => {
  const totals = calculateTotals(
    [{ product: 1, quantity: 3, unitPrice: 10.1, unitPriceByn: 1.01 }],
    10,
    5,
  );

  assert.equal(totals.discountKopecks, 303);
  assert.equal(totals.discountBynKopecks, 30);
  assert.equal(totals.total, 32.27);
  assert.equal(totals.deliveryBynKopecks, 50);
  assert.equal(totals.totalBynKopecks, 323);
});

test('invalid product sizes fail before stock is decremented', async () => {
  let writes = 0;

  const payload = {
    find: async () => ({
      docs: [
        {
          id: 1,
          title: 'Shirt',
          priceRub: 10,
          priceByn: 1,
          sizes: [{ id: 'm', label: 'M' }],
        },
      ],
    }),
  } as unknown as Payload;

  const transaction = {
    execute: async () => {
      writes++;

      return { rows: [{ id: 1 }] };
    },
  };

  await assert.rejects(
    reserveItems(payload, {} as PayloadRequest, transaction, {
      items: [{ product: 1, quantity: 1, size: 'missing' }],
    }),
    ProductReservationError,
  );
  assert.equal(writes, 0);
});

test('stock exhaustion aborts reservation rather than creating order items', async () => {
  const payload = {
    find: async () => ({
      docs: [{ id: 1, title: 'Shirt', priceRub: 10, priceByn: 1 }],
    }),
  } as unknown as Payload;

  await assert.rejects(
    reserveItems(
      payload,
      {} as PayloadRequest,
      { execute: async () => ({ rows: [] }) },
      { items: [{ product: 1, quantity: 2 }] },
    ),
    (error: unknown) =>
      error instanceof ProductReservationError && error.status === 409,
  );
});

test('promo counters increase only when the promo beats the first-order discount', async () => {
  for (const discount of [5, 20]) {
    let calls = 0;

    const transaction = {
      execute: async () => {
        calls++;

        return {
          rows: [
            {
              id: 1,
              code: 'TEST',
              discount_percent: discount,
              is_active: true,
              max_uses: null,
              used_count: 0,
              starts_at: null,
              expires_at: null,
            },
          ],
        };
      },
    };

    const result = await applyDiscount(transaction, 'TEST', true);

    assert.equal(result.discountPercent, Math.max(10, discount));
    assert.equal(calls, discount > 10 ? 2 : 1);
    assert.equal(
      result.discountType,
      discount > 10 ? 'promo_code' : 'first_order',
    );
  }
});

test('expired promo codes cannot be consumed', async () => {
  let calls = 0;

  const transaction = {
    execute: async () => {
      calls++;

      return {
        rows: [
          {
            id: 1,
            code: 'OLD',
            discount_percent: 20,
            is_active: true,
            max_uses: null,
            used_count: 0,
            starts_at: null,
            expires_at: '2020-01-01',
          },
        ],
      };
    },
  };

  await assert.rejects(
    applyDiscount(transaction, 'OLD', false),
    PromocodeError,
  );
  assert.equal(calls, 1);
});
