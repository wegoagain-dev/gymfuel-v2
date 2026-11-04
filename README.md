# GymFuel v2

Photograph a meal, confirm the AI's macro estimate, and track calories and protein against your
own targets. Turn the food in your kitchen into high-protein recipes, keep a shopping list with
expiry warnings, and let a coach follow linked clients.

Next.js 16 (App Router, Server Components, Server Actions), TypeScript, Tailwind v4, shadcn/ui,
Drizzle ORM, Postgres. Local dev runs on PGlite, so there is nothing to install.

> Deployed to the homelab K3s cluster by Argo CD. GitHub is the source of truth: `main` builds the
> image, `homelab-k8s` says which image runs.

## Run it

Node 20.9+. No Docker, no Postgres install.

```bash
npm install
npm run dev
```

http://localhost:3000. The first start creates `./.data/pglite`, applies the migrations and loads
demo data.

### Demo accounts

Password `GymFuel123` for all three.

| Email | Role |
| --- | --- |
| `alex@gymfuel.test` | client: targets, a week of meals, recipes, kitchen items, a shopping list |
| `coach@gymfuel.test` | coach, linked to Alex |
| `sam@gymfuel.test` | client, unlinked. Link with client code `5A3D9C1E7B2F4A60` |

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run db:seed` | Deletes all data and reloads the demo data. Stop `npm run dev` first: one process per PGlite database |
| `npm run db:migrate` | Applies pending migrations (the app also does this on start) |
| `npm run db:generate` | New SQL migration in `./drizzle` after editing `src/db/schema.ts` |
| `npm run db:studio` | Drizzle Studio, needs a real `DATABASE_URL` |
| `npm run typecheck` / `lint` / `build` | Checks |

### Real Postgres instead of PGlite

```bash
docker compose up -d
echo 'DATABASE_URL=postgres://gymfuel:***@localhost:5432/gymfuel' >> .env.local
npm run dev
```

Any Postgres 14+, including the in-cluster `gymfuel-postgres`.

### Real AI

Without `OPENAI_API_KEY` the AI runs in demo mode: Lens drafts from the portion notes you type,
and "Pick a meal for me" and "Generate three recipes" come from templates. Set `OPENAI_API_KEY` in
`.env.local`; `OPENAI_MEAL_ANALYSIS_MODEL`, `OPENAI_RECIPE_MODEL` and `UNSPLASH_ACCESS_KEY` are
optional.

## Structure

```
src/
  app/          routes: /, (auth), (app), actions/, api/
  db/           schema.ts, connect.ts (PGlite or Postgres), seed.ts
  lib/          auth/, data.ts (read queries), ai/, validation.ts
  components/   ui/ (shadcn and EasyUI, owned source) plus one folder per area
drizzle/        SQL migrations
```

Reads run in Server Components through `lib/data.ts`, always scoped to the signed-in user. Writes
are Server Actions in `src/app/actions/`. Auth is a signed JWT in an httpOnly cookie, and every
action and query re-checks the session in `lib/auth/dal.ts`.

## Deploying

1. Push to `main`. `.github/workflows/image.yml` type checks, lints and builds
   `ghcr.io/wegoagain-dev/gymfuel:<short sha>` and `:main`.
2. Set `apps/gymfuel/kustomization.yaml` `images[].newTag` in `homelab-k8s` to that sha. Argo CD
   syncs it; roll back by reverting the commit.
3. Runtime config comes from the `gymfuel-app-secret` SealedSecret: `DATABASE_URL`,
   `SESSION_SECRET`, `OPENAI_API_KEY`, `SEED_DEMO_DATA=false`.
4. Sign-in is rate limited in `src/lib/rate-limit.ts`: 20 tries per IP and 5 per email per 15
   minutes, 5 sign-ups per IP per hour. It is in memory, so it assumes one replica.
