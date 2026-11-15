import type { AuthProviderId } from '@/shared/config/auth';
import { googleProvider } from '@/shared/api/oauth/google';
import type { OAuthProvider } from '@/shared/api/oauth/types';
import { yandexProvider } from '@/shared/api/oauth/yandex';

export const oauthProviders: Record<
  Exclude<AuthProviderId, 'telegram'>,
  OAuthProvider
> = {
  google: googleProvider,
  yandex: yandexProvider,
};

export function getOAuthProvider(provider: AuthProviderId): OAuthProvider {
  if (provider === 'telegram') {
    throw new Error('Telegram uses the login widget, not OAuth');
  }

  return oauthProviders[provider];
}

export { verifyTelegramWidget } from '@/shared/api/oauth/telegram';
export type { OAuthProvider, ProviderIdentity } from '@/shared/api/oauth/types';
