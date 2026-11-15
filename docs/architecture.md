# Next.js + Payload + FSD

## One application, two interfaces

`apps/www` contains the storefront and Payload admin/API in one Next.js application. PostgreSQL stores the CMS data. `apps/bot` remains an independent NestJS application and must not import the website's source files.

The root `app/` directory holds thin Next.js adapters. Page and layout implementations live in `src/`. Payload's existing admin page and REST adapters remain framework integration exceptions. The admin import map and `src/shared/api/payload-types.ts` are generated artifacts; never edit either manually.

```text
apps/www/
  app/
    (frontend)/
      api/auth/[...segments]/route.ts
      api/checkout/route.ts
    (payload)/                 Existing Payload adapters and import map
  payload.config.ts            CLI entry point
  src/
    app/
      config/
        payload.ts             Collection/global/view registration and database
        globals/               Home page, legal, social, delivery settings
      layouts/                 Frontend and Payload root layouts
      migrations/              Reviewed database migrations
    views/
      home/
    features/
      auth/                    Login, linking, onboarding, logout, profile HTTP API
      checkout/                Transaction orchestration, delivery and totals
    entities/
      category/
      customer/                Customer profiles, identities and social sessions
      folder/
      media/
      order/
      page/
      product/
      promocode/
      user/                    CMS staff, separate from customers
    shared/
      api/
        cdek/                  External delivery client and quote cache
        notifications/         External order notification transport
        oauth/                 Google/Yandex clients and Telegram verification
        order-admin/           Order admin data access helpers
        order-statistics/      Order statistics data access
        payload/               Request bootstrap, field endpoints and access helpers
        payload-types.ts       Generated schema types
      config/auth.ts           Provider, origin, cookie and secret configuration
      lib/                     Focused formatting, order presentation, status and auth-error utilities
      ui/order-admin/          Order admin view components
      ui/order-statistics/     Order statistics view components
      ui/payload/              Reusable CMS controls and presentation primitives
```

## Dependency direction and ownership

Imports flow downward: `app → views → widgets → features → entities → shared`. `views` is the FSD pages layer, named to avoid Next.js Pages Router conventions. Layers without a use case can remain empty.

Entity directories are singular; collection slugs remain plural. Each collection belongs to its entity's `payload/` entry point. Its hooks, access policies and field groups live beside the collection. Entity-specific custom endpoints and database operations belong in `entities/<entity>/api`. Collection relationships reference Payload slugs, without importing another collection's runtime configuration.

Slices on the same layer are independent. Use public `server.ts` entry points for runtime operations across slices and `payload/index.ts` for schema composition. Import generated domain types using `import type`; do not maintain parallel copies of the order or product schema. Relative imports stay within a slice; cross-layer imports use `@/` aliases.

Server entry points use `import 'server-only'`. Collection configuration and its dependencies must remain compatible with Payload's CLI, which runs outside Next.js. In particular, the customer session strategy is imported directly by the customer collection rather than through its guarded runtime entry point.

`shared/api/payload/request.ts` is the infrastructure bootstrap boundary. It lazily resolves `@payload-config` when a Next.js request needs a Payload instance. The lazy import prevents collection configuration from depending on a runtime feature or initializing Payload recursively. Request URLs and authenticated users are preserved on the resulting Payload request.

The ESLint configuration checks upward imports written with the `@/` alias. It does not currently enforce every same-layer slice dependency or transitive client/server boundary.

## Auth and checkout

Authentication is a business feature rather than a general Shared service. `features/auth` owns sign-in, registration, onboarding, linking and unlinking. Customer persistence, identities and session verification belong to the customer entity. Provider protocol clients, cookies, origin configuration and error infrastructure are reusable lower-level code.

CMS staff retain the `users` slug. Imported checks for the former `admins` collection now target `users`. Customers explicitly cannot enter the CMS or perform staff mutations. Orders can be read by staff or their unblocked owner; only staff can change order workflow fields and admin notes. Products and pages expose published records publicly. Promo codes and identity mutations remain restricted.

Social-session cookies use `/api`, allowing both auth and checkout requests to receive them. The strategy accepts only `/api/auth` endpoints and `/api/checkout`, and never authenticates a staff route. Logout expires both the current cookie scope and previous `/` and `/api/auth` scopes. Server-side session records remain authoritative, so revocation and blocking invalidate a signed token.

The auth route exposes these methods relative to `/api/auth`:

| Method    | Path                                    | Responsibility                              |
| --------- | --------------------------------------- | ------------------------------------------- |
| GET       | `/google/start`, `/yandex/start`        | Begin OAuth login or account linking        |
| GET       | `/google/callback`, `/yandex/callback`  | Complete OAuth flow                         |
| GET       | `/telegram/start`, `/telegram/callback` | Telegram widget flow                        |
| GET       | `/me`, `/links`                         | Current customer and linked identities      |
| GET, POST | `/onboarding`                           | Read pending profile or finish registration |
| PATCH     | `/profile`                              | Update customer profile                     |
| POST      | `/logout`                               | Revoke session and clear cookies            |
| DELETE    | `/links/:provider`                      | Unlink an external identity                 |

`POST /api/checkout` validates input before opening a transaction. It coordinates customer locking, stock reservation, promo-code locking and usage, delivery pricing, minor-unit totals, order persistence and optional profile updates. Stock and promo operations stay inside the same PostgreSQL transaction. Failures roll back; notification delivery occurs after commit and cannot undo a successful order. Both RUB and BYN discount amounts are persisted.

The delivery client separates token management and HTTP transport from quote calculation. Quote cache keys include exact shipment weight and sender location. The notification adapter preserves the imported external `notify.sendOrder` contract; it does not imply that the current bot exposes that service.

## Source formatting

Prettier owns indentation, wrapping and quotes, configured at the repository root with two spaces and single quotes. ESLint Stylistic requires blank lines after imports and directives, around functions, classes, types and exported declarations, before returns, around control-flow statements, and after variable groups. Multiline declarations are separated from adjacent statements; consecutive short variable declarations can stay grouped. Conditionals and loops require braces. Re-export barrels can stay compact. These rules apply through the shared ESLint configuration across the applications and UI package.

Root lint checks formatting before checking code. The fix script applies ESLint fixes in each workspace and then runs Prettier. The original `modules/` snapshot, generated artifacts, existing Payload framework adapters and build outputs are excluded from formatting. The Payload adapters still receive the existing code-quality lint checks.

## Runtime validation

Zod is a direct dependency of the website. Schemas belong to the slice or integration that owns the input contract:

- `features/checkout/model/schema.ts` defines checkout input, normalization, duplicate-item checks and delivery-field combinations. Request types are inferred from these schemas rather than maintained separately.
- `features/auth/model/schemas.ts` defines onboarding and profile requests. The HTTP adapter converts malformed JSON and schema failures to the existing auth error codes and HTTP 400 responses. Service-level name/email validation uses the same field schemas.
- `shared/api/cdek/schemas.ts` validates consumed token, pickup-point and tariff response fields. Invalid unrelated list entries are skipped; missing required response fields cannot become a usable quote.

Use schema parsing at untrusted input boundaries. Keep stock availability, permissions, promo-code usage and database locking in their owning services and transactions. Payload field validators and generated document types continue to describe stored records; request schemas do not replace them. Unknown request fields are stripped, numeric input is not coerced, and schema issue paths are available for future form error presentation. Existing HTTP error envelopes are preserved.

## Globals and Payload UI

A Payload global is a CMS storage mechanism, not an FSD layer. The current globals represent application configuration, and the home-page global relates to products. They are composed in `app/config/globals`, above Entities, rather than introducing a business settings module in Shared. All four globals allow public reads and staff-only updates. If a global develops independent domain behavior, move it into an appropriate entity slice.

`shared/ui/payload` holds reusable editable number/select cells, status controls, sections and visual tokens. Product photos and order-item cells are entity-specific. Order detail and statistics screens belong to `views` because they compose several concerns. Custom view references in configuration are Payload component-path strings, not runtime imports from Entities into Views. Paths are relative to the configured application base directory and begin with `/src/`.

The statistics view separates period boundaries, paginated aggregation and presentation. The order detail view separates header/status controls, payment summary, customer/delivery details and admin-note editing. Collection field groups are organized by responsibility, rather than extracting one file for every field.

## Imported source and data compatibility

The root `modules/` directory is the original reference snapshot. Active code imports nothing from it. It is preserved for comparison and is outside the website's TypeScript project.

The imported `promo-codes` slug is retained, matching checkout's PostgreSQL `promo_codes` table. This differs from the initial placeholder collection `promocodes`. Product/category titles and the rest of the domain fields now follow the imported schemas. This is a source migration, not an executed data conversion: existing placeholder data or an old production database needs a separately reviewed database migration before deployment.

Media retains the imported bulk upload support and visible folder picker, and preserves the current persistent `apps/www/uploads/media` location, image MIME restriction, `alt` field and Payload folder integration. The imported tag relationship was dropped; media keeps only the `alt` field and folder relation. Uploads are runtime data and must persist independently of builds.

Frontend account, onboarding and checkout pages were not part of the imported modules; the imported redirects to `/account` and `/auth/complete` remain integration contracts for those pages. External OAuth, CDEK and notification services require their respective environment configuration. `.env.example` lists the configuration surface without secrets.

Regression tests cover auth state integrity, redirect validation, session scopes and revocation, access boundaries, checkout input, totals, reservation failures, promo-code limits, inline-update validation and delivery-quote cache isolation. They use isolated doubles for persistence; live database concurrency and external-provider behavior require integration validation against configured services.

## References

- [Payload custom components and component paths](https://payloadcms.com/docs/custom-components/overview)
- [Payload collection configuration](https://payloadcms.com/docs/configuration/collections)
- [FSD layers and dependency rules](https://feature-sliced.design/docs/reference/layers)
