import type { Customer } from '@/shared/api/payload-types';
import type { SessionResult } from '@/entities/customer/server';
import type { PendingProfile } from '../state';

export type SignInResult =
  | {
      type: 'session';
      customer: Customer;
      session: SessionResult;
      redirectTo: string;
    }
  | {
      type: 'onboarding';
      pendingCookie: string;
      profile: PendingProfile;
      redirectTo: string;
    }
  | { type: 'linked'; customer: Customer; redirectTo: string };
