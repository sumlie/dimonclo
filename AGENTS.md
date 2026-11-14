<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": true` in the root `turbo.json` or `turbo.jsonc` to opt in; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

## Communication

Always respond to the user in English, regardless of the language of their message.

## Commit attribution

When the user asks an AI agent to create a commit, preserve the user's configured
Git author identity and add a `Co-authored-by` trailer identifying the agent that
actually contributed to that commit.

- For work contributed by OpenAI Codex, use `Co-authored-by: Codex <codex@openai.com>`.
- DeepSeek and other agents must use their own attribution, not Codex's. Do not
  invent an email address; obtain the appropriate identity if it is unknown.
- Do not automatically credit Codex for another agent's work. Credit multiple
  agents only when they actually contributed to the committed changes.
- Do not rewrite existing commits solely to add attribution unless requested.

## Next.js and FSD boundaries

- Name entity directories in the singular (`product`, `order`, `category`,
  `folder`, `promocode`, `customer`, `page`); collection slugs may be plural.

- Keep `apps/www/app/` route files (`page`, `layout`, and `route`) as thin
  entry points, normally only re-exporting implementations from `src/`.
- Store layout implementations in `apps/www/src/app/layouts/`. Keep page
  implementations in their FSD `views` slices.
- Keep entity-specific API logic in `src/entities/<entity>/api`. Place generic
  API infrastructure unrelated to an entity in `src/shared/api`. Higher-level
  business use cases still follow FSD layer ownership.
- Leave Payload's existing admin page and REST route adapters unchanged unless
  a task explicitly requires changes to those adapters.
- Never manually edit Payload's generated `app/(payload)/admin/importMap.js`;
  use `generate:importmap` to regenerate it when required.

## Documentation

Keep README files focused on project purpose, structure, and architecture. Do not
include installation, startup, or launch instructions in README files.
