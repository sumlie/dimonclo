import 'server-only';

export { authenticateRequest, getAuthContext } from './api/request';
export {
  createIdentity,
  findCustomerByEmail,
  findIdentity,
  getCustomer,
  identityCustomerId,
  listCustomerIdentities,
  updateIdentityLastLogin,
} from './api/identities';
export type { CustomerIdentity } from './api/identities';
export {
  createCustomerSession,
  revokeCustomerSession,
  clearedSessionCookies,
  clearedLegacySessionCookie,
} from './api/session';
export type { SessionResult } from './api/session';
