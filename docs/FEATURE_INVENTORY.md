# GymFuel — feature inventory of the old app

Source: `wegoagain-dev/ECS-GymFuel` @ `e0be1cc` (main, 2 Aug 2026), local clone
`~/Desktop/projects/ecs-gymfuel` (identical to GitHub), cross-checked against
https://gymfuel.xyz (the live landing page — "See Your Meal. Shape Your Next One." — is the
post-"Lens revamp" version on `main`).

Stack: Next.js 16 single page (`src/app/page.tsx`, client-side tabs, Zustand store, JWT in
`localStorage`) + FastAPI/SQLAlchemy + Postgres. AI via OpenAI (Lens) and Gemini (older
recipe endpoints). Unsplash for recipe images.

## Pages / screens (all on one URL, `/`)

| Screen | Who | What it does |
| --- | --- | --- |
| Landing | signed out | Hero ("See Your Meal…"), mock Lens/Today/Groceries preview cards, "Open GymFuel" CTA → auth dialog |
| Auth dialog | signed out | Tabs: **Sign in** (email + password) / **Create account** (email, username, full name, password + confirm, role = client or coach). Auto-login after sign-up |
| Today | all | Date header, refresh button; **Daily progress** — calories & protein vs your targets (progress bars, "Set your targets" CTA if unset); **Log with Lens** (optional portion text + photo → AI draft → confirm dialog); **Generate with AI / "Pick a meal for me"** (meal type, available time 15–60 min → one recipe; Try another; Save recipe; Log when eaten); **Today's meals** list (kcal, protein, time, favourite heart) |
| My Meals | all | Search history (title + foods), History / Favourites toggle, each meal shows kcal/protein/carbs/fat, actions: favourite toggle, **Edit**, **Log again** (copy with now as time), **Delete** (confirm) |
| Groceries → Ingredients & AI | all | Pantry chips: add (Enter key, dedup case-insensitively → "already in your groceries"), remove. **Generate gym meals**: goal Cut/Maintain/Bulk + meal type → 3 recipes, each with macros, missing ingredients (≤3), expandable ingredients (in pantry = green dot) + method, **Save recipe for later**. Link to Preferences |
| Groceries → Shopping list | all | Items with name, quantity, unit (piece/kg/g/lb/oz/L/mL/cup/tbsp/tsp), category (Dairy, Meat, Vegetables, Fruits, Grains, Spices, Condiments, Beverages, Other), optional expiry date. Summary tiles Urgent (≤3 days or expired) / Soon (4–6) / Fresh / No expiry, alert banner for urgent items, add / edit / delete (confirm) |
| Recipes | all | Search (title, description, tags), cards (image, difficulty badge, protein, calories), **Add recipe** (name, protein g, description, ingredients one per line, tags comma-separated), delete (confirm). No recipe detail view |
| Clients | coach only | Overview tiles, **Link client** (client email + their 16-char client code), client list, **Unlink** (confirm), select client → weekly snapshot (planned meals, active days, % coverage, protein recipes) + tabs Meal plan / Recipes |
| Account menu | all | Username, role badge, email, client code (share with your coach), **Profile & targets**, **Sign out** (confirm) |
| Profile & targets dialog | all | Daily calorie target (500–10000), protein target (10–1000), default goal, dietary requirements, preferred cuisines, ingredients to avoid, max total time (5–240 min). Note that AI doesn't prescribe targets; photos aren't stored |
| Mobile | all | Bottom dock navigation (4 tabs, 5 for coaches) |

## API endpoints (FastAPI, all under `/api`, bearer JWT unless noted)

- **Auth** `POST /auth/register/` (public; password ≥8 with upper/lower/digit; email lower-cased; generates client code) · `POST /auth/login/` (public, OAuth2 form, returns JWT, 24 h) · `GET /auth/me/` · `PATCH /auth/me/nutrition-targets` · `PATCH /auth/me/meal-preferences`
- **Meal logs (Lens)** `GET /meal-logs/` (date range, favourite, paging) · `POST /meal-logs/` · `PATCH /meal-logs/{id}` · `DELETE /meal-logs/{id}` · `POST /meal-logs/analyze` (JPEG ≤5 MB, resized to 1600px, sent to OpenAI vision, **not stored**) · `POST /meal-logs/suggest`
- **Pantry** `GET /pantry/` · `POST /pantry/` (409 on duplicate) · `DELETE /pantry/{id}` · `POST /pantry/generate` (3 recipes)
- **Groceries** `GET /groceries/` (category, expiring_soon) · `GET /groceries/expiring-soon` · `GET/PUT/DELETE /groceries/{id}` · `POST /groceries/` · `POST /groceries/bulk`
- **Recipes** `GET /recipes/` (search, tags, difficulty) · `GET/PUT/DELETE /recipes/{id}` · `POST /recipes/` (auto Unsplash image) · `POST /recipes/ai/generate` and `POST /recipes/ai/suggest` (Gemini — **no UI uses them**)
- **Meals (planner)** `GET /meals/`, `GET /meals/week`, `GET/PUT/DELETE /meals/{id}`, `POST /meals/`, `POST /meals/generate-week` — **no UI uses them any more** (the planner modals exist but are never mounted)
- **Coach** `POST /coach/link/` · `DELETE /coach/unlink/{client_id}` · `GET /coach/clients/` · `GET /coach/clients/{id}/meals` · `GET /coach/clients/{id}/recipes` · `GET /coach/my-coach/` (no UI)
- **Other** `GET /health`, `GET /` and a WebSocket `/ws/family/{id}` "family sync" (**no UI**)

## Data model (Postgres)

`users` (email unique, username unique, hashed_password, full_name, role client|coach,
client_code unique, dietary_restrictions JSON, preferences JSON — targets, goal, cuisines,
dislikes, max prep time — family_id) · `families` (unused) · `recipes` (title, description,
instructions, prep/cook time, servings, difficulty, image_url, source_url, tags JSON,
ingredients JSON, nutritional_info JSON, user_id) · `meals` (planner: date, meal_type,
recipe_id, notes, planned) · `grocery_items` (name, quantity, unit, category,
expiration_date) · `coach_clients` (coach_id, client_id unique → a client has one coach) ·
`meal_logs` (title, foods JSON [{name, portion}], calories, protein, carbs, fat, eaten_at tz,
notes, favorite, source_recipe_id) · `pantry_ingredients` (name, normalized_name, unique per
user).

## Auth behaviour

- JWT (HS256, 24 h) stored in `localStorage`, sent as `Authorization: Bearer`.
- Any 401 clears the token. Sign-out clears state and hard-reloads `/`.
- Every resource is scoped to the signed-in user; coach endpoints check `role == coach`
  and the coach↔client link.
- Login error is generic ("Incorrect email or password"); register says an account "may
  already exist".

## Quirks / dead code worth knowing

- Coach "Meal plan" tab reads the **planner** table, which clients can no longer write to
  from the UI — so coaches always see "No meals planned yet".
- Guest/localStorage mode and the cloud-sync code are still in the store but disabled.
- Recipe "difficulty" is set to "Easy" for every manually added recipe; recipes have no
  detail view, so saved AI recipes' method/ingredients can't be read again in the UI.
- AI endpoints return 503 when `OPENAI_API_KEY` isn't set — Lens, suggestions and pantry
  generation are unusable locally without a key.
