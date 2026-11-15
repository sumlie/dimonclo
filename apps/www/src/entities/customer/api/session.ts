import { SignJWT, jwtVerify } from 'jose';
import { addSessionToUser, generateCookie, parseCookies } from 'payload/shared';
import type { AuthStrategy, Payload, PayloadRequest } from 'payload';
import {
  AUTH_COOKIE_PATH,
  AUTH_SECRET,
  LEGACY_SESSION_COOKIE,
  SESSION_COOKIE,
  cookieBase,
  type SocialProviderId,
} from '@/shared/config/auth';
import type { Customer } from '@/shared/api/payload-types';

const key = new TextEncoder().encode(AUTH_SECRET);

type SessionClaims = {
  sub: string;
  sid: string;
  provider: SocialProviderId;
  kind: 'social-session';
};

export type SessionResult = {
  cookie: string;
  sid: string;
  token: string;
};

export async function createCustomerSession(args: {
  payload: Payload;
  req: PayloadRequest;
  customer: Customer;
  provider: SocialProviderId;
}): Promise<SessionResult> {
  const { payload, req, customer, provider } = args;

  if (customer.isBlocked) {
    throw new Error('blocked');
  }

  const collectionConfig = payload.collections.customers.config;

  const { sid } = await addSessionToUser({
    collectionConfig,
    payload,
    req,
    user: { ...customer, collection: 'customers' },
  });

  if (!sid) {
    throw new Error('sessions are disabled for customers');
  }

  const token = await new SignJWT({
    kind: 'social-session',
    provider,
    sid,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(customer.id))
    .setIssuedAt()
    .setExpirationTime(`${collectionConfig.auth.tokenExpiration}s`)
    .sign(key);

  const cookie = generateCookie<false>({
    ...cookieBase,
    maxAge: collectionConfig.auth.tokenExpiration,
    name: SESSION_COOKIE,
    path: AUTH_COOKIE_PATH,
    returnCookieAsObject: false,
    value: token,
  });

  return { cookie, sid, token };
}

function expiredCookie(name: string, path: string): string {
  return generateCookie<false>({
    ...cookieBase,
    expires: new Date(Date.now() - 1000),
    maxAge: 0,
    name,
    path,
    returnCookieAsObject: false,
    value: '',
  });
}

export function clearedSessionCookie(path = AUTH_COOKIE_PATH): string {
  return expiredCookie(SESSION_COOKIE, path);
}

export function clearedLegacySessionCookie(path = '/'): string {
  return expiredCookie(LEGACY_SESSION_COOKIE, path);
}

/** Clears the scoped cookie and every previously used cookie path/name. */
export function clearedSessionCookies(): string[] {
  return [
    clearedSessionCookie(AUTH_COOKIE_PATH),
    clearedSessionCookie('/'),
    clearedSessionCookie('/api/auth'),
    clearedLegacySessionCookie('/'),
    clearedLegacySessionCookie(AUTH_COOKIE_PATH),
    clearedLegacySessionCookie('/api/auth'),
  ];
}

export async function revokeCustomerSession(args: {
  payload: Payload;
  req: PayloadRequest;
  customer: Customer;
  sid?: string;
}): Promise<void> {
  const { payload, req, customer, sid } = args;

  if (!sid) {
    return;
  }

  const sessions = (customer.sessions || []).filter(
    (session) => session.id !== sid,
  );

  await payload.db.updateOne({
    id: customer.id,
    collection: 'customers',
    data: { sessions, updatedAt: null },
    req,
    returning: false,
  });
}

function expiredSessionHeaders(): Headers {
  const headers = new Headers();

  for (const cookie of clearedSessionCookies()) {
    headers.append('Set-Cookie', cookie);
  }

  return headers;
}

export const socialSessionStrategy: AuthStrategy = {
  name: 'dimon-social-session',
  authenticate: async ({ headers, payload, req }) => {
    // Social cookies authenticate only our customer endpoints, never Payload staff routes.
    const pathname = req?.pathname;

    if (
      !pathname ||
      !(
        pathname === '/api/checkout' ||
        pathname === '/api/auth' ||
        pathname.startsWith('/api/auth/')
      )
    ) {
      return { user: null };
    }

    const token = parseCookies(headers).get(SESSION_COOKIE);

    if (!token) {
      return { user: null };
    }

    try {
      const { payload: claims } = await jwtVerify(token, key, {
        algorithms: ['HS256'],
      });

      const sessionClaims = claims as unknown as SessionClaims;

      if (sessionClaims.kind !== 'social-session' || !sessionClaims.sid) {
        return { user: null };
      }

      const customer = (await payload.findByID({
        collection: 'customers',
        id: sessionClaims.sub,
        depth: 0,
        overrideAccess: true,
        req,
        showHiddenFields: true,
      })) as Customer | null;

      if (!customer || customer.isBlocked) {
        return { user: null, responseHeaders: expiredSessionHeaders() };
      }

      const sessions = (customer.sessions || []) as Array<{
        expiresAt: string | Date;
        id: string;
      }>;

      const session = sessions.find((item) => item.id === sessionClaims.sid);

      if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
        return { user: null, responseHeaders: expiredSessionHeaders() };
      }

      const user = customer as Customer & {
        _sid?: string;
        _strategy?: string;
        collection?: string;
      };

      user.collection = 'customers';
      user._sid = sessionClaims.sid;
      user._strategy = 'dimon-social-session';

      return { user };
    } catch {
      return { user: null, responseHeaders: expiredSessionHeaders() };
    }
  },
};
