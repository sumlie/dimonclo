import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PayloadRequest } from 'payload';
import { createNumberFieldEndpoint } from '../src/shared/api/payload/field-endpoints';

test('inline updates reject customers, unknown fields and invalid numbers before writing', async () => {
  const endpoint = createNumberFieldEndpoint({
    collection: 'products',
    fields: { stock: { min: 0 } },
  });

  let writes = 0;

  const request = (collection: string, body: unknown) =>
    ({
      user: { id: 1, collection },
      routeParams: { id: '1' },
      json: async () => body,
      payload: {
        update: async (args: { data: object; overrideAccess: boolean }) => {
          assert.equal(args.overrideAccess, false);
          writes++;

          return args.data;
        },
      },
    }) as unknown as PayloadRequest;

  assert.equal(
    (await endpoint.handler(request('customers', { field: 'stock', value: 1 })))
      .status,
    403,
  );

  for (const body of [
    { field: '__proto__', value: 1 },
    { field: 'priceRub', value: 1 },
    { field: 'stock', value: -1 },
    { field: 'stock', value: '10' },
    { field: 'stock', value: Infinity },
  ]) {
    assert.equal((await endpoint.handler(request('users', body))).status, 400);
  }

  assert.equal(writes, 0);

  const result = await endpoint.handler(
    request('users', { field: 'stock', value: 10 }),
  );

  assert.equal(result.status, 200);
  assert.equal(writes, 1);
});
