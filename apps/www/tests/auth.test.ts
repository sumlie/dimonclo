import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SignJWT } from 'jose';
import type { Payload, PayloadRequest } from 'payload';
import { safeRedirect } from '../src/features/auth/redirects';
import {
  createState,
  readStateCookie,
  verifyStateValue,
} from '../src/features/auth/state';
import {
  clearedSessionCookies,
  socialSessionStrategy,
} from '../src/entities/customer/api/session';
import { AUTH_SECRET, SESSION_COOKIE } from '../src/shared/config/auth';
import { Orders } from '../src/entities/order/payload/collection';
import { Users } from '../src/entities/user/payload/collection';
import { Customers } from '../src/entities/customer/payload/collection';

const asRequest = (pathname: string, user: unknown = null) =>
  ({ pathname, user }) as PayloadRequest;

test('redirects reject external URLs, encoded host tricks and control characters', () => {
  for (const path of [
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/account\nLocation: evil',
  ]) {
    assert.equal(safeRedirect(path), '/account');
  }

  assert.equal(
    safeRedirect('/account?tab=orders#latest'),
    '/account?tab=orders#latest',
  );
});

test('OAuth state round-trips and rejects tampering and state mismatch', async () => {
  const { state, cookie } = await createState({
    provider: 'google',
    redirectTo: '/account',
    mode: 'login',
    consent: true,
  });

  const headers = new Headers({ cookie: cookie.split(';')[0]! });
  const restored = await readStateCookie(headers);

  assert.equal(restored.state, state.state);
  assert.equal(restored.codeVerifier, state.codeVerifier);
  assert.throws(() => verifyStateValue(state.state, 'wrong'));
  assert.throws(() => verifyStateValue(state.state, null));
  const [name, token] = cookie.split(';')[0]!.split('=');
  const parts = token!.split('.');

  parts[2] = (parts[2]![0] === 'a' ? 'b' : 'a') + parts[2]!.slice(1);
  await assert.rejects(
    readStateCookie(new Headers({ cookie: `${name}=${parts.join('.')}` })),
  );
});

test('customer session authenticates checkout but never staff routes; revoked sessions fail', async () => {
  const token = await new SignJWT({
    kind: 'social-session',
    sid: 'session-1',
    provider: 'google',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('7')
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(AUTH_SECRET));

  let reads = 0;

  const customer = {
    id: 7,
    isBlocked: false,
    sessions: [
      {
        id: 'session-1',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      },
    ],
  };

  const payload = {
    findByID: async () => {
      reads++;

      return { ...customer };
    },
  } as unknown as Payload;

  const authenticate = socialSessionStrategy.authenticate;
  const headers = new Headers({ cookie: `${SESSION_COOKIE}=${token}` });

  const result = await authenticate({
    headers,
    payload,
    req: asRequest('/api/checkout'),
  });

  assert.equal(result.user?.id, 7);
  assert.equal(result.user?.collection, 'customers');

  for (const path of ['/admin', '/api/users', '/api/products', '/']) {
    assert.equal(
      (await authenticate({ headers, payload, req: asRequest(path) })).user,
      null,
    );
  }

  assert.equal(reads, 1);
  customer.sessions = [];

  const revoked = await authenticate({
    headers,
    payload,
    req: asRequest('/api/auth/me'),
  });

  assert.equal(revoked.user, null);
  assert.ok(revoked.responseHeaders?.get('Set-Cookie'));
  assert.ok(
    clearedSessionCookies().some((cookie) => cookie.includes('Path=/api;')),
  );
  assert.ok(
    clearedSessionCookies().some((cookie) =>
      cookie.includes('Path=/api/auth;'),
    ),
  );
});

test('customer accounts cannot access staff operations or another customer orders', async () => {
  const req = asRequest('/api/orders', {
    id: 7,
    collection: 'customers',
    isBlocked: false,
  });

  assert.equal(await Users.access!.admin!({ req, slug: 'users' }), false);
  assert.equal(await Users.access!.update!({ req, slug: 'users' }), false);
  assert.equal(
    await Customers.access!.admin!({ req, slug: 'customers' }),
    false,
  );
  assert.equal(await Orders.access!.update!({ req, slug: 'orders' }), false);
  assert.deepEqual(await Orders.access!.read!({ req, slug: 'orders' }), {
    customer: { equals: 7 },
  });
  assert.equal(
    await Orders.access!.read!({
      slug: 'orders',
      req: asRequest('/api/orders', {
        id: 7,
        collection: 'customers',
        isBlocked: true,
      }),
    }),
    false,
  );
});
