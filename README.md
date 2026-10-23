# GymFuel v2

A from-scratch rebuild of [GymFuel](https://gymfuel.xyz): photograph meals and confirm
AI-estimated macros, track calories and protein against your own targets, turn the food in your
kitchen into high-protein recipes, keep a shopping list with expiry warnings, and let a coach
follow linked clients.

Built with **Next.js 16** (App Router, Server Components, Server Actions), **TypeScript**,
**Tailwind CSS v4**, **shadcn/ui** (Radix), a few **EasyUI** components, **Drizzle ORM** and
**Postgres**.

> Status: local only. Nothing here is deployed, and the live site, cluster and Cloudflare
> setup are untouched.

## Run it locally

Requirements: Node.js 20.9+ (tested with Node 26) and npm. You don't need Docker or a
Postgres install.

```bash
npm install
npm run dev
```

Open http://localhost:3000. On first start the app creates an embedded Postgres database
(PGlite) in `./.data/pglite`, applies the migrations, and loads demo data.

### Demo accounts

All demo accounts use the password `GymFuel123`.

| Email | Role | What it has |
| --- | --- | --- |
| `alex@gymfuel.test` | client | Targets, 7 days of meals, recipes, kitchen items, a shopping list. Coached by Jo. |
| `coach@gymfuel.test` | coach | Linked to Alex, so you can try the Clients area |
| `sam@gymfuel.test` | client | Not linked. Link Sam as the coach with client code `5A3D9C1E7B2F4A60` |

You can also register a new account at `/register`.

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run db:seed` | **Deletes all data** and reloads the demo data. With PGlite, stop `npm run dev` first, because only one process can open the database |
| `npm run db:migrate` | Applies pending migrations (the app also does this on start) |
| `npm run db:generate` | Creates a new SQL migration in `./drizzle` after you edit `src/db/schema.ts` |
| `npm run db:studio` | Drizzle Studio, a database browser (needs `DATABASE_URL` set to a Postgres server) |
| `npm run typecheck` / `npm run lint` / `npm run build` | Checks |

### Using real Postgres instead of PGlite

```bash
docker compose up -d
echo 'DATABASE_URL=postgres://gymfuel:gymfuel@localhost:5432/gymfuel' >> .env.local
npm run dev
```

Any Postgres 14+ works, including the `gymfuel-postgres` pattern used in the homelab.

### Turning on real AI

Without an API key, the AI features run in **demo mode**:
- **Lens** can't see the photo. It builds a draft from the portion notes you type (for
  example "250g chicken, 150g rice") using a small nutrition table. You can also use
  "Use notes only" without a photo.
- **Pick a meal for me** and **Generate three recipes** come from templates that use your
  kitchen items, goal, meal type, dietary needs and dislikes.

To use OpenAI, as the old app did, copy `.env.example` to `.env.local` and set
`OPENAI_API_KEY`. You can also set `OPENAI_MEAL_ANALYSIS_MODEL` and `OPENAI_RECIPE_MODEL`;
their defaults are the model names the old backend used. Set `UNSPLASH_ACCESS_KEY` to give
new recipes a stock photo.

## How it's put together

```
src/
  app/
    page.tsx                 landing page (static)
    (auth)/login, register   sign-in / sign-up
    (app)/                   signed-in area: today, meals, groceries, recipes, profile, coach
    actions/                 Server Actions (all writes), one file per area
    api/lens/analyze         photo upload → AI draft (multipart, so a Route Handler)
    api/health               liveness + DB check (for k8s probes later)
    api/auth/clear           clears a stale session cookie
  db/
    schema.ts                Drizzle schema (the data model)
    connect.ts               PGlite or Postgres, chosen from DATABASE_URL, plus migrations
    seed.ts                  demo data
  lib/
    auth/session.ts          signed JWT in an httpOnly cookie
    auth/dal.ts              getCurrentUser / requireUser / requireCoach
    data.ts                  read queries (always scoped to the signed-in user)
    ai/                      OpenAI calls + offline demo generator
    validation.ts            zod schemas shared by actions and AI output
  components/
    ui/                      shadcn/ui + EasyUI components (owned source)
    today, meals, groceries, recipes, coach, profile, app/
drizzle/                     SQL migrations
```

### Why one Next.js app instead of Next.js + FastAPI

The old app had three moving parts: Next.js, FastAPI and Postgres. A thin client called a
REST API, and the JWT lived in `localStorage`. v2 folds the API into Next.js:

- **Reads** run in Server Components, which query Postgres directly through Drizzle.
- **Writes** are Server Actions, so there's no hand-written fetch/axios layer or API client.
- **Auth** is an httpOnly, signed session cookie, so page JavaScript can't read the token.
  Every action and query re-checks the session through `lib/auth/dal.ts`.
- **Postgres** stays. The schema is plain Postgres (`serial`, `jsonb`, `timestamptz`), so it
  runs against the existing kind of Postgres deployment. PGlite is the same Postgres compiled
  to WASM, used only so local setup is `npm install && npm run dev`.

The cost: one deployment instead of two, and the Cloudflare route `^/api(/|$)` → backend
would no longer be needed. Under v2, `/api/*` is served by Next.js itself.

## Old app → v2

The full inventory of the old app is in [docs/FEATURE_INVENTORY.md](docs/FEATURE_INVENTORY.md).

| Area | Old app | v2 |
| --- | --- | --- |
| Landing | Hero + preview cards | Same idea, plus a features section; light **and** dark theme |
| Auth | Modal; register (client/coach) → auto-login; JWT in localStorage | Dedicated `/login` + `/register` pages; same password rules; httpOnly cookie session; deep-link `?next=` |
| Today | Calories/protein vs targets, Lens photo → confirm, "Pick a meal for me", today's meals | All of that, plus a macro donut, an "over target" state, and editing meals from Today |
| My Meals | Search, favourites, edit, log again, delete | Same, grouped by day with daily totals |
| Groceries | Kitchen list + AI recipes; shopping list with expiry status | Same. Shopping list items can also be ticked off |
| Recipes | Search, add (name/protein/description/ingredients/tags), delete | Same, plus a **recipe detail page**, **edit**, full macros/times/difficulty/method, and **"Log this meal"** |
| Profile | Dialog: targets + AI preferences | `/profile` page with the same fields, plus your coach and the theme |
| Coach | Link/unlink by email + client code; client's *planned meals* + recipes | Link/unlink the same way; client view shows **meals actually logged** in the last 7 days, a protein-vs-target chart, and recipes |
| Mobile | Bottom dock | Bottom dock |

**Changed on purpose**
- The coach view uses logged meals instead of the old meal-planner table. Clients could no
  longer add planned meals, so coaches always saw "No meals planned yet".
- Clients' recipes, and saved AI recipes, can now be opened and read. Before, there was no
  detail view.

**Not carried over** (none of these had any UI in the old app)
- The meal planner (`/api/meals`, "generate week").
- The Gemini recipe endpoints.
- The WebSocket "family sync" and the `families` table.
- Guest/localStorage mode.
- Bulk grocery import.

Any of them can come back if you want them.

## EasyUI

[EasyUI](https://easyui.site) is an MIT-licensed registry of animated React components, built
on Tailwind and Framer Motion, that installs through the shadcn CLI, for example
`npx shadcn@latest add Surajmaurya1/easyui/donut-chart`. This app uses three of them:

- `animated-number`: the rolling calorie and protein totals on Today
- `donut-chart`: today's macro split
- `draw-checkbox`: ticking items off the shopping list

Notes for when you add more:
- EasyUI ships its own `utils.ts`, `badge.tsx`, `alert.tsx` and `sheet.tsx`. Answer **No**
  when the CLI asks to overwrite shadcn's files.
- Its components expect a few CSS variables (`--accent`, `--surface-raised`, …). These are
  mapped onto the shadcn theme by the `.easyui` class in `globals.css`.
- `animated-number.tsx` has two small, commented edits (`GymFuel tweak`): theme colour
  instead of hard-coded white, and screen-reader text.

## Notes for later (deploying)

- Set `SESSION_SECRET` (32+ chars) and `DATABASE_URL`, and set `SEED_DEMO_DATA=false`.
- The `./drizzle` folder must ship next to the server, because migrations run on start.
- There's no login rate limiting yet. Cloudflare's WAF or an app-level limiter should cover
  that before going live.
