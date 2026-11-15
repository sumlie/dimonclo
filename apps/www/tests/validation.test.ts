import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkoutSchema } from '../src/features/checkout/model/schema';
import {
  onboardingSchema,
  profileSchema,
} from '../src/features/auth/model/schemas';
import { readAuthBody } from '../src/features/auth/api/request-body';
import { requireEmail, requireName } from '../src/features/auth/lib/validation';
import { AuthError, jsonError } from '../src/shared/lib/auth/errors';
import {
  cdekPointsSchema,
  cdekTariffListSchema,
  cdekTokenSchema,
} from '../src/shared/api/cdek/schemas';

const checkout = {
  items: [{ product: 1, quantity: 2 }],
  customerName: ' Customer ',
  username: ' @customer ',
  email: ' customer@example.com ',
  deliveryRegion: ' belarus ',
  deliveryMethod: ' pickup ',
  deliveryAddress: ' Minsk ',
};

const profile = {
  name: ' Customer ',
  phone: '',
  username: '',
  deliveryRegion: '',
  deliveryMethod: '',
  deliveryAddress: '',
  cdekPointCode: '',
};

test('checkout normalizes text and optional fields without coercing numeric input', () => {
  const result = checkoutSchema.parse({
    ...checkout,
    promoCode: ' dimon10 ',
    phone: null,
    extra: true,
  });

  assert.equal(result.customerName, 'Customer');
  assert.equal(result.promoCode, 'DIMON10');
  assert.equal(result.phone, '');
  assert.equal(result.comment, '');
  assert.equal(result.cdekPointCode, '');
  assert.equal(result.deliveryRegion, 'belarus');
  assert.equal('extra' in result, false);

  for (const quantity of [
    '2',
    true,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    101,
  ]) {
    assert.equal(
      checkoutSchema.safeParse({
        ...checkout,
        items: [{ product: 1, quantity }],
      }).success,
      false,
    );
  }

  assert.equal(
    checkoutSchema.safeParse({
      ...checkout,
      items: [{ product: Number.MAX_SAFE_INTEGER + 1, quantity: 1 }],
    }).success,
    false,
  );
});

test('checkout detects duplicate normalized sizes and reports missing CDEK points on the field', () => {
  const duplicate = checkoutSchema.safeParse({
    ...checkout,
    items: [
      { product: 1, quantity: 1, size: ' m ' },
      { product: 1, quantity: 1, size: 'm' },
    ],
  });

  assert.equal(duplicate.success, false);

  if (!duplicate.success) {
    assert.deepEqual(duplicate.error.issues[0]?.path, ['items', 1]);
  }

  const cdek = checkoutSchema.safeParse({
    ...checkout,
    deliveryRegion: 'russia',
    deliveryMethod: 'cdek',
  });

  assert.equal(cdek.success, false);

  if (!cdek.success) {
    assert.deepEqual(cdek.error.issues[0]?.path, ['cdekPointCode']);
  }

  assert.equal(
    checkoutSchema.safeParse({
      ...checkout,
      deliveryRegion: 'russia',
      deliveryMethod: 'cdek',
      cdekPointCode: 'POINT',
    }).success,
    true,
  );
});

test('auth JSON validation rejects malformed bodies with the existing HTTP error contract', async () => {
  for (const body of [
    'null',
    '[]',
    '"text"',
    '{',
    JSON.stringify({
      email: 'a@example.com',
      name: 'Customer',
      consent: 'true',
    }),
  ]) {
    const request = new Request('https://example.com/api/auth/onboarding', {
      method: 'POST',
      body,
    });

    try {
      await readAuthBody(request, onboardingSchema);
      assert.fail('Invalid onboarding body was accepted');
    } catch (error) {
      assert.ok(error instanceof AuthError);
      const response = jsonError(error);

      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: 'invalid_request' });
    }
  }

  assert.deepEqual(
    onboardingSchema.parse({
      email: ' USER@Example.COM ',
      name: ' Customer ',
      consent: true,
    }),
    { email: 'user@example.com', name: 'Customer', consent: true },
  );
  assert.throws(
    () => requireEmail(undefined),
    (error: unknown) =>
      error instanceof AuthError && error.code === 'email_required',
  );
  assert.throws(
    () => requireName('  '),
    (error: unknown) =>
      error instanceof AuthError && error.code === 'name_required',
  );
  assert.throws(
    () => requireName('a'.repeat(121)),
    (error: unknown) =>
      error instanceof AuthError && error.code === 'invalid_request',
  );
});

test('profile validation allows clearing delivery but rejects incomplete data and unrelated pickup codes', () => {
  assert.equal(profileSchema.parse(profile).name, 'Customer');
  assert.equal(
    profileSchema.safeParse({ ...profile, deliveryRegion: 'russia' }).success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({
      ...profile,
      deliveryRegion: 'world',
      deliveryMethod: 'belmail',
      deliveryAddress: 'Address',
      cdekPointCode: 'POINT',
    }).success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({
      ...profile,
      deliveryRegion: 'russia',
      deliveryMethod: 'cdek',
      deliveryAddress: 'Address',
      cdekPointCode: 'POINT',
    }).success,
    true,
  );
  assert.equal(
    profileSchema.safeParse({ ...profile, phone: 123 }).success,
    false,
  );
});

test('external response schemas reject invalid required fields and tolerate unrelated list entries', () => {
  for (const body of [null, [], { access_token: '' }, { access_token: 123 }]) {
    assert.equal(cdekTokenSchema.safeParse(body).success, false);
  }

  const points = cdekPointsSchema.parse([
    null,
    { code: 'WRONG', is_handout: false },
    {
      code: 'VALID',
      is_handout: true,
      location: { country_code: 'RU', city_code: 1 },
      new_provider_field: true,
    },
  ]);

  assert.equal(points.filter((point) => point !== null).length, 1);

  const list = cdekTariffListSchema.parse({
    tariff_codes: [
      null,
      { delivery_sum: '100' },
      { delivery_sum: 100, delivery_mode: 4, period_min: 'unknown' },
    ],
  });

  const tariff = list.tariff_codes.find((item) => item !== null);

  assert.equal(tariff?.delivery_sum, 100);
  assert.equal(tariff?.period_min, null);
});
