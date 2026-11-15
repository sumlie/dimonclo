import { checkoutSchema } from './schema';
import type { CheckoutBody } from './schema';

// Keep the existing handler contract while schemas expose field paths to future forms.
export function validateBody(value: unknown): CheckoutBody | string {
  const result = checkoutSchema.safeParse(value);

  return result.success
    ? result.data
    : (result.error.issues[0]?.message ?? 'Некорректные данные заказа');
}
