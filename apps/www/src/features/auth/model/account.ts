import type { Customer } from '@/shared/api/payload-types';
import type { Payload, PayloadRequest } from 'payload';
import { AuthError } from '@/shared/lib/auth/errors';
import {
  getCustomer,
  listCustomerIdentities,
} from '@/entities/customer/server';
import { revokeCustomerSession } from '@/entities/customer/server';

export async function unlinkProvider(args: {
  payload: Payload;
  req: PayloadRequest;
  customerId: number;
  provider: string;
}): Promise<void> {
  const { payload, req, customerId, provider } = args;
  const customer = await getCustomer(payload, customerId, req);

  if (!customer) {
    throw new AuthError('unauthorized', 'Customer session is not valid', 401);
  }

  if (customer.isBlocked) {
    throw new AuthError('blocked', 'Account is blocked', 403);
  }

  const identities = await listCustomerIdentities(payload, customerId);
  const identity = identities.find((item) => item.provider === provider);

  if (!identity) {
    throw new AuthError('not_found', 'Provider is not linked', 404);
  }

  const hasPassword = Boolean(customer.hash) && !customer.socialOnly;

  if (identities.length <= 1 && !hasPassword) {
    throw new AuthError(
      'last_login_method',
      'Cannot unlink the last login method without a password',
      409,
    );
  }

  await payload.delete({
    collection: 'customer-identities',
    id: identity.id,
    overrideAccess: true,
    req,
  });
}

export async function logoutCustomer(args: {
  payload: Payload;
  req: PayloadRequest;
  customer: Customer & { _sid?: string };
}): Promise<void> {
  const { payload, req, customer } = args;

  await revokeCustomerSession({
    payload,
    req,
    customer,
    sid: customer._sid,
  });
}
