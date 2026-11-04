<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## This repo

- One Next.js app. Reads run in Server Components through `src/lib/data.ts`; writes are Server
  Actions in `src/app/actions/`. There is no separate API server.
- Postgres through Drizzle. `src/db/schema.ts` is the data model: edit it, then
  `npm run db:generate`. Migrations land in `./drizzle` and run on connect.
- `DATABASE_URL` picks the driver: `postgres://...` for a server, unset or `pglite:...` for the
  embedded database in `./.data/pglite`.
- Every read and action scopes to the signed-in user through `src/lib/auth/dal.ts`. Do not query
  `users` or any user-owned table without that scope.
- `src/components/ui/` is owned source (shadcn plus three EasyUI components: `animated-number`,
  `donut-chart`, `draw-checkbox`), not a dependency you upgrade.
- Checks: `npm run typecheck`, `npm run lint`, `npm run build`.
