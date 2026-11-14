# @dimon/bot

Telegram bot for ДИМОН, built with NestJS and grammY.

A standalone Nest application context owns the bot lifecycle. The bot uses long polling, without an HTTP server, and stops polling on application shutdown. The initial scaffold includes a `/start` handler; order notifications and integration with Payload will be added separately.

- `src/main.ts`: application bootstrap and shutdown hooks.
- `src/app.module.ts`: application composition.
- `src/bot/`: Telegram module, handlers, and polling lifecycle.

The application is independent of `apps/www` and shares only workspace tooling. It uses `BOT_TOKEN` for Telegram authentication.
