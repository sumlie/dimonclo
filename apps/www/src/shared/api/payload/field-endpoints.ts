import type { CollectionSlug, Endpoint } from 'payload';

type NumberRule = { min?: number; max?: number };

type SelectRule = { options: string[] };

export const numberField = { min: 0 };

type Options<Rule> = {
  collection: CollectionSlug;
  fields: Record<string, Rule>;
  path?: string;
};

function createFieldEndpoint<Rule extends NumberRule | SelectRule>(
  { collection, fields, path }: Options<Rule>,
  kind: 'number' | 'select',
): Endpoint {
  return {
    path: path ?? `/:id/update-${kind}`,
    method: 'patch',
    handler: async (req) => {
      if (req.user?.collection !== 'users') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const id = req.routeParams?.id;

      if (typeof id !== 'string' && typeof id !== 'number') {
        return Response.json({ error: 'Missing ID' }, { status: 400 });
      }

      let input: unknown;

      try {
        input = await req.json?.();
      } catch {
        return Response.json({ error: 'Invalid JSON' }, { status: 400 });
      }

      if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return Response.json({ error: 'Invalid body' }, { status: 400 });
      }

      const body = input as Record<string, unknown>;
      const field = body.field;

      if (typeof field !== 'string' || !Object.hasOwn(fields, field)) {
        return Response.json({ error: 'Invalid field' }, { status: 400 });
      }

      const rule = fields[field]!;
      const value = body.value;

      const valid =
        kind === 'number'
          ? typeof value === 'number' &&
            Number.isFinite(value) &&
            (!('min' in rule) || rule.min === undefined || value >= rule.min) &&
            (!('max' in rule) || rule.max === undefined || value <= rule.max)
          : typeof value === 'string' &&
            'options' in rule &&
            rule.options.includes(value);

      if (!valid) {
        return Response.json({ error: 'Invalid value' }, { status: 400 });
      }

      const doc = await req.payload.update({
        collection,
        id,
        data: { [field]: value },
        overrideAccess: false,
        req,
      });

      return Response.json(
        { value: (doc as unknown as Record<string, unknown>)[field] },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    },
  };
}

export function createNumberFieldEndpoint(
  options: Options<NumberRule>,
): Endpoint {
  return createFieldEndpoint(options, 'number');
}

export function createSelectFieldEndpoint(
  options: Options<SelectRule>,
): Endpoint {
  return createFieldEndpoint(options, 'select');
}
