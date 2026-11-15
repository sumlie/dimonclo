import type { Customer } from '@/shared/api/payload-types';
import type { Payload, PayloadRequest } from 'payload';
import { AuthError } from '@/shared/lib/auth/errors';
import {
  findIdentity,
  getCustomer,
  identityCustomerId,
} from '@/entities/customer/server';
import {
  createCustomerSession,
  type SessionResult,
} from '@/entities/customer/server';
import { type PendingProfile } from '../state';
import { requireEmail, requireName } from '../lib/validation';
import { createCustomerWithIdentity } from './register';

export async function completeOnboarding(args: {
  payload: Payload;
  req: PayloadRequest;
  profile: PendingProfile;
  email: string;
  name: string;
  consent: boolean;
}): Promise<{
  customer: Customer;
  session: SessionResult;
  redirectTo: string;
}> {
  const { payload, req, profile, email, name, consent } = args;
  const normalizedEmail = requireEmail(email);
  const normalizedName = requireName(name);

  const existingIdentity = await findIdentity(
    payload,
    profile.provider,
    profile.providerId,
  );

  if (existingIdentity) {
    const customer = await getCustomer(
      payload,
      identityCustomerId(existingIdentity),
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

    const session = await createCustomerSession({
      payload,
      req,
      customer,
      provider: profile.provider,
    });

    return { customer, session, redirectTo: profile.redirectTo };
  }

  const { customer } = await createCustomerWithIdentity({
    payload,
    req,
    profile,
    email: normalizedEmail,
    name: normalizedName,
    consent,
  });

  const session = await createCustomerSession({
    payload,
    req,
    customer,
    provider: profile.provider,
  });

  return { customer, session, redirectTo: profile.redirectTo };
}
