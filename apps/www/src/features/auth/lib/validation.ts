import type { z } from 'zod';
import { AuthError } from '@/shared/lib/auth/errors';
import { authEmailSchema, authNameSchema } from '../model/schemas';

export function parseAuthInput<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.output<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    const message = result.error.issues[0]?.message;

    const code =
      message === 'email_required' || message === 'name_required'
        ? message
        : 'invalid_request';

    throw new AuthError(code, undefined, 400);
  }

  return result.data;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function requireEmail(email: string | undefined | null): string {
  return parseAuthInput(authEmailSchema, email ?? '');
}

export function requireName(name: string | undefined | null): string {
  return parseAuthInput(authNameSchema, name ?? '');
}
