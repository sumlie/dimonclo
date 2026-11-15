import type { Customer } from '@/shared/api/payload-types';
import type { Payload, PayloadRequest } from 'payload';
import { AuthError } from '@/shared/lib/auth/errors';
import {
  createIdentity,
  findCustomerByEmail,
  type CustomerIdentity,
} from '@/entities/customer/server';
import { randomToken, type PendingProfile } from '../state';
import type { ProviderIdentity } from '@/shared/api/oauth';

export function pendingProfile(
  identity: ProviderIdentity,
  consent: boolean,
  redirectTo: string,
): PendingProfile {
  return {
    provider: identity.provider,
    providerId: identity.providerId,
    email: identity.email,
    emailVerified: identity.emailVerified,
    name: identity.name,
    username: identity.username,
    consent,
    redirectTo,
  };
}

export async function createCustomerWithIdentity(args: {
  payload: Payload;
  req: PayloadRequest;
  profile: PendingProfile;
  email: string;
  name: string;
  consent: boolean;
}): Promise<{ customer: Customer; identity: CustomerIdentity }> {
  const { payload, req, profile, email, name, consent } = args;

  if (!consent) {
    throw new AuthError('invalid_request', 'Consent is required', 400);
  }

  const existingCustomer = await findCustomerByEmail(payload, email);

  if (existingCustomer) {
    throw new AuthError(
      'email_exists',
      'An account with this email already exists. Sign in first to link this provider.',
      409,
    );
  }

  const now = new Date().toISOString();

  let customer: Customer;

  try {
    customer = await payload.create({
      collection: 'customers',
      data: {
        email,
        name,
        username: profile.username?.trim() || undefined,
        password: randomToken(32),
        socialOnly: true,
        ...(profile.emailVerified
          ? { _verified: true, emailVerifiedAt: now }
          : {}),
        consentAt: now,
        registrationCompletedAt: now,
      },
      overrideAccess: true,
      req,
    });
  } catch {
    const racedCustomer = await findCustomerByEmail(payload, email);

    if (racedCustomer) {
      throw new AuthError(
        'email_exists',
        'An account with this email already exists. Sign in first to link this provider.',
        409,
      );
    }

    throw new AuthError('internal_error', 'Could not create customer', 500);
  }

  try {
    const identity = await createIdentity(payload, req, {
      customer: customer.id,
      provider: profile.provider,
      providerId: profile.providerId,
      email: profile.email,
      emailVerified: profile.emailVerified,
    });

    return { customer, identity };
  } catch (error) {
    // Do not leave an orphan customer if the identity was linked concurrently.
    await payload.delete({
      collection: 'customers',
      id: customer.id,
      overrideAccess: true,
      req,
    });
    throw error;
  }
}
