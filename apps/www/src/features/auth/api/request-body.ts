import type { z } from 'zod';
import { AuthError } from '@/shared/lib/auth/errors';
import { parseAuthInput } from '../lib/validation';

export async function readAuthBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.output<T>> {
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    throw new AuthError('invalid_request', 'Invalid request body', 400);
  }

  return parseAuthInput(schema, input);
}
