import { z } from 'zod';

export const authEmailSchema = z
  .string({ error: 'invalid_request' })
  .trim()
  .toLowerCase()
  .min(1, { error: 'email_required' })
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { error: 'invalid_request' });

export const authNameSchema = z
  .string({ error: 'invalid_request' })
  .trim()
  .min(1, { error: 'name_required' })
  .max(120, { error: 'invalid_request' });

export const onboardingSchema = z.object(
  {
    email: authEmailSchema,
    name: authNameSchema,
    consent: z.literal(true, { error: 'invalid_request' }),
  },
  { error: 'invalid_request' },
);

const text = (max: number) =>
  z
    .string({ error: 'invalid_request' })
    .trim()
    .max(max, { error: 'invalid_request' });

export const profileSchema = z
  .object(
    {
      name: authNameSchema,
      phone: text(30),
      username: text(33),
      deliveryRegion: text(30).pipe(
        z.enum(['', 'belarus', 'russia', 'cis', 'world'], {
          error: 'invalid_request',
        }),
      ),
      deliveryMethod: text(50).pipe(
        z.enum(['', 'cdek', 'belmail', 'euromail'], {
          error: 'invalid_request',
        }),
      ),
      deliveryAddress: text(500),
      cdekPointCode: text(100),
    },
    { error: 'invalid_request' },
  )
  .superRefine((body, context) => {
    const hasDeliveryData = Boolean(
      body.deliveryRegion ||
      body.deliveryMethod ||
      body.deliveryAddress ||
      body.cdekPointCode,
    );

    if (
      hasDeliveryData &&
      (!body.deliveryRegion || !body.deliveryMethod || !body.deliveryAddress)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['deliveryAddress'],
        message: 'invalid_request',
      });
    }

    const usesCdekMap =
      body.deliveryMethod === 'cdek' &&
      (body.deliveryRegion === 'belarus' || body.deliveryRegion === 'russia');

    if (!usesCdekMap && body.cdekPointCode) {
      context.addIssue({
        code: 'custom',
        path: ['cdekPointCode'],
        message: 'invalid_request',
      });
    }
  });
