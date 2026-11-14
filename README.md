# ДИМОН

Clothing store monorepo managed with pnpm and Turborepo. Requires Node.js ^24.22.3 or >=26.13.1 and pnpm 11.9.0.

```text
apps/
  www/                       Next.js frontend + Payload CMS
packages/
  eslint-config/             Shared ESLint configuration
  typescript-config/         Shared TypeScript configuration
  ui/                        Starter UI package (currently unused)
```

`apps/bot` (NestJS + grammY) will be added separately.

## Development

1. Use the Node.js version in `.node-version`, then run `pnpm install`.
2. Start a PostgreSQL database and create a database named `dimon`.
3. Copy `apps/www/.env.example` to `apps/www/.env`, set `DATABASE_URL`, and supply a long random `PAYLOAD_SECRET`.
4. Run `pnpm dev`.

Frontend: http://localhost:3000. Payload: http://localhost:3000/admin.
The initial admin account is created through Payload's first-user setup. These accounts are CMS staff, not frontend customers.

```sh
pnpm lint
pnpm check-types
pnpm build
pnpm --filter @dimon/www generate:types
pnpm --filter @dimon/www generate:importmap
```

Payload updates the development database schema automatically. For production, create and review migrations with `pnpm --filter @dimon/www db:migrate:create`, commit them, and apply them with `pnpm --filter @dimon/www db:migrate` before starting the application. Database provisioning and deployment are not included yet.

See [the architecture guide](docs/architecture.md) for FSD and Payload conventions.

Payload is pinned to `4.0.0-beta.9` (the new admin UI), with Next.js `16.4.2`. All Payload packages must be upgraded together. The admin import map is generated before development and production builds.
