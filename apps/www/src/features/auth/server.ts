import 'server-only';

export { handleOAuthStart } from './api/start';
export { handleOAuthCallback } from './api/callback';
export { handleTelegramStart, handleTelegramCallback } from './api/telegram';
export { handleMe, handleLinks } from './api/me';
export { handleLogout } from './api/logout';
export { handleOnboarding, handleOnboardingProfile } from './api/onboarding';
export { handleUnlinkProvider } from './api/unlink';
export { handleUpdateProfile } from './api/profile';
export {
  handleAuth as GET,
  handleAuth as POST,
  handleAuth as PATCH,
  handleAuth as DELETE,
} from './api/router';
