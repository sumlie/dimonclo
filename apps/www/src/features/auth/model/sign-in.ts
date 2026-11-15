import type { Customer } from '@/shared/api/payload-types';
import type { Payload, PayloadRequest } from 'payload';
import { AuthError } from '@/shared/lib/auth/errors';
import {
  createIdentity,
  findCustomerByEmail,
  findIdentity,
  getCustomer,
  identityCustomerId,
  updateIdentityLastLogin,
} from '@/entities/customer/server';
import { createCustomerSession } from '@/entities/customer/server';
import { createPendingCookie } from '../state';
import type { ProviderIdentity } from '@/shared/api/oauth';
import type { OAuthMode } from '../state';
import type { SignInResult } from './types';
import { normalizeEmail, requireEmail, requireName } from '../lib/validation';
import { pendingProfile, createCustomerWithIdentity } from './register';

export async function signInWithIdentity(args: {
  payload: Payload;
  req: PayloadRequest;
  identity: ProviderIdentity;
  mode: OAuthMode;
  customerId?: number;
  consent: boolean;
  redirectTo: string;
}): Promise<SignInResult> {
  const { payload, req, identity, mode, customerId, consent, redirectTo } =
    args;

  if (mode === 'link') {
    if (!customerId) {
      throw new AuthError(
        'unauthorized',
        'Sign in before linking a provider',
        401,
      );
    }

    const customer = await getCustomer(payload, customerId, req);

    if (!customer || customer.isBlocked) {
      throw new AuthError('unauthorized', 'Customer session is not valid', 401);
    }

    const existing = await findIdentity(
      payload,
      identity.provider,
      identity.providerId,
    );

    if (existing) {
      if (String(identityCustomerId(existing)) !== String(customer.id)) {
        throw new AuthError(
          'identity_taken',
          'This social account is already linked',
          409,
        );
      }

      await updateIdentityLastLogin(payload, req, existing, identity);

      return { type: 'linked', customer, redirectTo };
    }

    await createIdentity(payload, req, {
      customer: customer.id,
      provider: identity.provider,
      providerId: identity.providerId,
      email: identity.email,
      emailVerified: identity.emailVerified,
    });

    return { type: 'linked', customer, redirectTo };
  }

  const existing = await findIdentity(
    payload,
    identity.provider,
    identity.providerId,
  );

  if (existing) {
    const customer = await getCustomer(
      payload,
      identityCustomerId(existing),
      req,
    );

    if (!customer) {
      throw new AuthError(
        'internal_error',
        'Linked customer was not found',
        500,
      );
    }

    if (customer.isBlocked) {
      throw new AuthError('blocked', 'Account is blocked', 403);
    }

    await updateIdentityLastLogin(payload, req, existing, identity);

    const session = await createCustomerSession({
      payload,
      req,
      customer,
      provider: identity.provider,
    });

    return { type: 'session', customer, session, redirectTo };
  }

  const email = identity.email ? normalizeEmail(identity.email) : undefined;
  const name = identity.name?.trim();

  if (!email || !name || !consent) {
    const profile = pendingProfile(identity, consent, redirectTo);

    return {
      type: 'onboarding',
      pendingCookie: await createPendingCookie(profile),
      profile,
      redirectTo,
    };
  }

  if (await findCustomerByEmail(payload, email)) {
    throw new AuthError(
      'email_exists',
      'An account with this email already exists. Sign in first to link this provider.',
      409,
    );
  }

  const { customer } = await createCustomerWithIdentity({
    payload,
    req,
    profile: pendingProfile(identity, consent, redirectTo),
    email: requireEmail(email),
    name: requireName(name),
    consent,
  });

  const session = await createCustomerSession({
    payload,
    req,
    customer,
    provider: identity.provider,
  });

  return { type: 'session', customer, session, redirectTo };
}
