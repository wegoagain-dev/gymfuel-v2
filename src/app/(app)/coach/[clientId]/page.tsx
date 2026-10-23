import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ChefHat } from "lucide-react"
import { UnlinkClientButton } from "@/components/coach/unlink-client-button"
import { MacroLine } from "@/components/meals/macros"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { requireCoach } from "@/lib/auth/dal"
import { weekStats, weekSummary } from "@/lib/coach"
import { getClientActivity, getClientForCoach } from "@/lib/data"
import { dayRange, formatDateTime, getTimeZone } from "@/lib/time"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Client" }
// Per-user page: renders on each request behind the loading skeleton (see (app)/layout.tsx).
export const instant = false

export default async function ClientPage({ params }: PageProps<"/coach/[clientId]">) {
  const [coach, tz, { clientId }] = await Promise.all([requireCoach(), getTimeZone(), params])
  const client = await getClientForCoach(coach, Number(clientId))
  if (!client) notFound()

  const { logs, recipes } = await getClientActivity(client.id, dayRange(tz, new Date(), -6).start)
  const days = weekSummary(tz, logs)
  const stats = weekStats(days, client.preferences)
  const { dailyCalorieTarget, dailyProteinTarget, fitnessGoal } = client.preferences
  const name = client.fullName || client.username
  const maxProtein = Math.max(dailyProteinTarget ?? 0, ...days.map((day) => day.protein), 1)

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link href="/coach"><ArrowLeft data-icon="inline-start" /> Clients</Link>
      </Button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {client.email} · Targets: {dailyCalorieTarget ? `${dailyCalorieTarget} kcal` : "no calorie target"},{" "}
            {dailyProteinTarget ? `${dailyProteinTarget} g protein` : "no protein target"}
            {fitnessGoal && <> · Goal: <span className="capitalize">{fitnessGoal}</span></>}
          </p>
        </div>
        <UnlinkClientButton clientId={client.id} name={name} redirectTo="/coach" withLabel />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(
          [
            ["Days logged", `${stats.loggedDays}/7`],
            ["Avg calories", stats.avgCalories.toLocaleString("en-GB")],
            ["Avg protein", `${stats.avgProtein} g`],
            ["Protein target hit", stats.proteinHitDays == null ? "—" : `${stats.proteinHitDays} days`],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-card p-4">
            <p className="tabular text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <section aria-labelledby="week-title" className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 id="week-title" className="font-semibold">Protein, last 7 days</h2>
          {dailyProteinTarget && <span className="text-xs text-muted-foreground">Dashed line = {dailyProteinTarget} g target</span>}
        </div>
        {/* Bars and the target line share one coordinate box; labels sit above each bar. */}
        <div className="relative mt-8 grid h-40 grid-cols-7 gap-2 sm:gap-4">
          {dailyProteinTarget && (
            <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/30" style={{ bottom: `${(dailyProteinTarget / maxProtein) * 100}%` }} />
          )}
          {days.map((day) => {
            const height = day.meals ? Math.max((day.protein / maxProtein) * 100, 4) : 4
            return (
              <div key={day.key} className="relative h-full">
                <div
                  className={cn("absolute inset-x-0 bottom-0 mx-auto max-w-12 rounded-t-md", day.meals ? "bg-protein" : "bg-muted")}
                  style={{ height: `${height}%` }}
                  title={`${day.label}: ${Math.round(day.protein)} g protein, ${Math.round(day.calories)} kcal, ${day.meals} meals`}
                />
                {day.meals > 0 && (
                  <span className="tabular absolute inset-x-0 text-center text-[11px] text-muted-foreground" style={{ bottom: `calc(${height}% + 4px)` }}>
                    {Math.round(day.protein)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground sm:gap-4">
          {days.map((day) => <span key={day.key}>{day.label}</span>)}
        </div>
      </section>

      <Tabs defaultValue="meals" className="gap-4">
        <TabsList>
          <TabsTrigger value="meals">Meals ({logs.length})</TabsTrigger>
          <TabsTrigger value="recipes">Recipes ({recipes.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="meals">
          {logs.length ? (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {logs.map((log) => (
                <li key={log.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <span className="tabular w-44 shrink-0 text-xs text-muted-foreground">{formatDateTime(tz, log.eatenAt)}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{log.title}</span>
                  <MacroLine calories={log.calories} protein={log.protein} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty className="rounded-2xl border border-dashed">
              <EmptyHeader>
                <EmptyTitle>No meals in the last 7 days</EmptyTitle>
                <EmptyDescription>{name} hasn&apos;t logged anything this week.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </TabsContent>
        <TabsContent value="recipes">
          {recipes.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe) => (
                <li key={recipe.id} className="rounded-2xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{recipe.title}</p>
                    <Badge variant="secondary" className="tabular shrink-0">{Math.round(recipe.protein ?? 0)} g</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{recipe.description || "No description"}</p>
                  <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground capitalize">
                    <ChefHat className="size-3.5" /> {recipe.difficulty ?? "—"} · {(recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)} min
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty className="rounded-2xl border border-dashed">
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
