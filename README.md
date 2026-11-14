# ДИМОН

Monorepo for the ДИМОН clothing store, managed with pnpm and Turborepo.

```text
apps/
  www/                       Next.js frontend + Payload CMS + PostgreSQL
  bot/                       NestJS + grammY Telegram bot
packages/
  eslint-config/             Shared ESLint configurations
  typescript-config/         Shared TypeScript configurations
  ui/                        Starter UI package (currently unused)
```

The frontend and Payload admin share one Next.js application. The bot is a separate process with a NestJS module structure. The applications share tooling and do not import each other's source code.

The web application follows FSD with entity-owned Payload collections and thin Next.js route entry points. See the [architecture guide](docs/architecture.md) for ownership and dependency conventions.
