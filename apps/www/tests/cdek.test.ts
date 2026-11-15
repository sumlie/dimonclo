import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getCdekQuote, CdekError } from '../src/shared/api/cdek';

test('CDEK quotes distinguish exact weight and sender and reject malformed responses', async (context) => {
  const originalFetch = globalThis.fetch;
  const originalID = process.env.CDEK_CLIENT_ID;
  const originalSecret = process.env.CDEK_CLIENT_SECRET;
  const originalTariff = process.env.CDEK_TARIFF_CODE;

  process.env.CDEK_CLIENT_ID = 'test-client';
  process.env.CDEK_CLIENT_SECRET = 'test-secret';
  process.env.CDEK_TARIFF_CODE = '1';
  context.after(() => {
    globalThis.fetch = originalFetch;

    for (const [name, value] of Object.entries({
      CDEK_CLIENT_ID: originalID,
      CDEK_CLIENT_SECRET: originalSecret,
      CDEK_TARIFF_CODE: originalTariff,
    })) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });
  let calculations = 0;
  let malformed = false;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));

    if (url.pathname.endsWith('/oauth/token')) {
      return Response.json({ access_token: 'test-token', expires_in: 3600 });
    }

    if (url.pathname.endsWith('/deliverypoints')) {
      return Response.json([
        {
          code: 'TEST-POINT',
          is_handout: true,
          location: { country_code: 'RU', city_code: 1 },
        },
      ]);
    }

    assert.ok(url.pathname.endsWith('/calculator/tariff'));
    calculations++;

    if (malformed) {
      return Response.json({ delivery_sum: 'invalid' });
    }

    const body = JSON.parse(String(init?.body)) as {
      packages: { weight: number }[];
    };

    return Response.json({
      delivery_sum: body.packages[0]!.weight,
      period_min: 1,
      period_max: 2,
    });
  };
  const sender = { country_code: 'BY', city: 'Minsk', address: 'One' };

  assert.equal((await getCdekQuote('TEST-POINT', 101, sender)).priceRub, 101);
  assert.equal((await getCdekQuote('TEST-POINT', 149, sender)).priceRub, 149);
  await getCdekQuote('TEST-POINT', 149, { ...sender, address: 'Two' });
  await getCdekQuote('TEST-POINT', 149, sender);
  assert.equal(calculations, 3);
  malformed = true;
  await assert.rejects(getCdekQuote('TEST-POINT', 200, sender), CdekError);
});
