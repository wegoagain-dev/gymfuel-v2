import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ChefHat } from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { UnlinkClientButton } from "@/components/coach/unlink-client-button"
import { MacroLine } from "@/components/meals/macros"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { requireCoach } from "@/lib/auth/dal"
import { weekStats, weekSummary } from "@/lib/coach"
import { getClientActivity, getClientForCoach } from "@/lib/data"
import { dayKey, dayRange, formatDay, formatTime, getTimeZone } from "@/lib/time"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Client" }
// Per-user page: renders on each request behind the loading skeleton (see (app)/layout.tsx).
export const instant = false

const grouped = (value: number) => Math.round(value).toLocaleString("en-GB")

export default async function ClientPage({ params }: PageProps<"/coach/[clientId]">) {
  const [coach, tz, { clientId }] = await Promise.all([requireCoach(), getTimeZone(), params])
  const client = await getClientForCoach(coach, Number(clientId))
  if (!client) notFound()

  const { logs, recipes } = await getClientActivity(client.id, dayRange(tz, new Date(), -6).start)
  const days = weekSummary(tz, logs)
  const stats = weekStats(days, client.preferences)
  const { dailyCalorieTarget, dailyProteinTarget, fitnessGoal } = client.preferences
  const name = client.fullName || client.username
  const today = days[days.length - 1]
  const todayLogs = logs.filter((log) => dayKey(tz, log.eatenAt) === today.key)
  const totals = todayLogs.reduce(
    (sum, log) => ({ calories: sum.calories + log.calories, protein: sum.protein + log.protein, carbs: sum.carbs + log.carbs, fat: sum.fat + log.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
  const macroKcal = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9
  const share = (kcal: number) => (macroKcal > 0 ? kcal / macroKcal : 0)

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Button variant="ghost" size="sm" className="-ml-2 self-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal" asChild>
        <Link href="/coach"><ArrowLeft data-icon="inline-start" /> Clients</Link>
      </Button>

      <div className="flex flex-col gap-3">
        <PageHeader title={name} description={client.email}>
          <UnlinkClientButton clientId={client.id} name={name} redirectTo="/coach" withLabel />
        </PageHeader>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
          <span>Goal: <span className="font-medium capitalize">{fitnessGoal ?? "not set"}</span></span>
          {dailyCalorieTarget ? (
            <span className="text-xs text-muted-foreground"><span className="rx text-ink">{dailyCalorieTarget}</span> kcal target</span>
          ) : (
            <span className="text-xs text-muted-foreground">No calorie target</span>
          )}
          {dailyProteinTarget ? (
            <span className="text-xs text-muted-foreground"><span className="rx text-ink">{dailyProteinTarget}</span> g protein target</span>
          ) : (
            <span className="text-xs text-muted-foreground">No protein target</span>
          )}
        </p>
      </div>

      <section aria-labelledby="today-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="today-title" className="display text-xl">Today</h2>
          <time className="text-sm text-muted-foreground" dateTime={new Date().toISOString()}>{formatDay(tz, new Date())}</time>
        </div>
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 md:grid-cols-[repeat(4,minmax(0,1fr))] md:gap-3">
          <DayCompartment tint="plastic--thu" label="Protein" value={totals.protein} unit="g" target={dailyProteinTarget} />
          <DayCompartment tint="plastic--tue" label="Calories" value={totals.calories} unit="kcal" target={dailyCalorieTarget} />
          <DayCompartment tint="plastic--fri" label="Carbs" value={totals.carbs} unit="g" share={share(totals.carbs * 4)} />
          <DayCompartment tint="plastic--sun" label="Fat" value={totals.fat} unit="g" share={share(totals.fat * 9)} />
        </div>
        {!today.meals && <p className="text-sm text-muted-foreground">No meals logged today.</p>}
      </section>

      <dl className="tray grid grid-cols-[repeat(2,minmax(0,1fr))] gap-px overflow-hidden bg-rule md:grid-cols-[repeat(4,minmax(0,1fr))]">
        <Stat label="Days logged"><span className="figure text-2xl">{stats.loggedDays}/7</span></Stat>
        <Stat label="Avg calories"><span className="figure text-2xl">{grouped(stats.avgCalories)}</span></Stat>
        <Stat label="Avg protein"><span className="figure text-2xl">{grouped(stats.avgProtein)}<span className="rx ml-1 text-sm font-normal text-ink-2">g</span></span></Stat>
        <Stat label="Protein target hit">
          {stats.proteinHitDays == null ? (
            <span className="text-sm text-muted-foreground">No target</span>
          ) : (
            <span className="figure text-2xl">{stats.proteinHitDays}<span className="rx ml-1 text-sm font-normal text-ink-2">days</span></span>
          )}
        </Stat>
      </dl>

      <Tabs defaultValue="meals" className="gap-4">
        <TabsList>
          <TabsTrigger value="meals">Meals ({logs.length})</TabsTrigger>
          <TabsTrigger value="recipes">Recipes ({recipes.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="meals">
          {logs.length ? (
            <div className="flex flex-col gap-6">
              {groupByDay(logs, (log) => dayKey(tz, log.eatenAt)).map((group) => (
                <section key={group.key} aria-label={formatDay(tz, group.items[0].eatenAt)} className="flex flex-col gap-2.5">
                  <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                    <h3 className="display text-lg">{formatDay(tz, group.items[0].eatenAt, { weekday: "long", day: "numeric", month: "short" })}</h3>
                    <MacroLine
                      calories={group.items.reduce((sum, log) => sum + log.calories, 0)}
                      protein={group.items.reduce((sum, log) => sum + log.protein, 0)}
                    />
                  </div>
                  <ol className="flex flex-col gap-2">
                    {group.items.map((log) => (
                      <li key={log.id} className="rx-label flex min-w-0 overflow-hidden">
                        <div className="flex w-[4.75rem] shrink-0 items-start border-r border-dashed p-3.5 sm:w-24 sm:p-4">
                          <time dateTime={log.eatenAt.toISOString()} className="rx text-lg font-medium text-ink">{formatTime(tz, log.eatenAt)}</time>
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-1 p-3.5 sm:p-4">
                          <p className="truncate font-medium">{log.title}</p>
                          <p className="truncate text-sm text-muted-foreground">{log.foods.map((food) => food.name).join(", ")}</p>
                          <MacroLine calories={log.calories} protein={log.protein} className="mt-0.5 text-ink-2" />
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          ) : (
            <Empty className="tray p-8">
              <EmptyHeader>
                <EmptyTitle>No meals in the last 7 days</EmptyTitle>
                <EmptyDescription>{name} hasn&apos;t logged anything this week.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </TabsContent>
        <TabsContent value="recipes">
          {recipes.length ? (
            <ul className="grid grid-cols-[repeat(1,minmax(0,1fr))] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(3,minmax(0,1fr))]">
              {recipes.map((recipe) => (
                <li key={recipe.id} className="surface flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-medium">{recipe.title}</p>
                    <span className="rx shrink-0 text-sm text-ink">{Math.round(recipe.protein ?? 0)} g</span>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{recipe.description || "No description"}</p>
                  <p className="mt-auto flex flex-wrap items-center gap-x-3 pt-1 text-xs text-muted-foreground">
                    <ChefHat className="size-3.5" aria-hidden="true" />
                    <span className="capitalize">{recipe.difficulty ?? "Unrated"}</span>
                    <span className="rx">{(recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)} min</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty className="tray p-8">
              <EmptyHeader>
                <EmptyTitle>No saved recipes</EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col-reverse gap-1 bg-paper-2 px-3 py-4 sm:px-5">
      <dt className="text-xs text-muted-foreground sm:text-sm">{label}</dt>
      <dd className="flex min-w-0 items-baseline gap-1 text-ink">{children}</dd>
    </div>
  )
}

function DayCompartment({
  tint,
  label,
  value,
  unit,
  target,
  share,
}: {
  tint: string
  label: string
  value: number
  unit: string
  target?: number
  share?: number
}) {
  const fill = target ? Math.min(value / target, 1) : share !== undefined ? Math.min(share, 1) : 0
  const note = share !== undefined
    ? `${Math.round(share * 100)}% of kcal`
    : target
      ? value <= target
        ? `${grouped(target - value)} ${unit} left`
        : `${grouped(value - target)} ${unit} over`
      : null

  return (
    <div className={cn("plastic isolate flex min-h-32 flex-col justify-between gap-4 overflow-hidden p-4 md:min-h-36", tint)}>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-full origin-bottom bg-[color-mix(in_oklab,var(--t)_84%,var(--color-ink))] shadow-[inset_0_1.5px_0_var(--glint)]"
        style={{ transform: `scaleY(${fill})` }}
      />
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-ink">{label}</p>
        {note && <p className="rx hidden text-xs text-ink-2 sm:block">{note}</p>}
      </div>
      <div className="flex items-baseline gap-1">
        <p className="figure text-[2rem] text-ink md:text-[2.5rem]">{grouped(value)}</p>
        <span className="rx text-sm text-ink-2">{unit}</span>
      </div>
    </div>
  )
}

/** Consecutive items sharing a key, in their original order (logs arrive newest first). */
function groupByDay<T>(items: T[], keyOf: (item: T) => string) {
  const groups: { key: string; items: T[] }[] = []
  for (const item of items) {
    const key = keyOf(item)
    const last = groups.at(-1)
    if (last && last.key === key) last.items.push(item)
    else groups.push({ key, items: [item] })
  }
  return groups
}
