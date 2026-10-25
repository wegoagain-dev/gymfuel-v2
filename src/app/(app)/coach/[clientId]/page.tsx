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
      <div className="flex flex-col gap-4 border-b-3 border-foreground pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="display max-w-none text-4xl md:text-6xl">{name}</h1>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex gap-1.5"><dt className="sr-only">Email</dt><dd>{client.email}</dd></div>
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Targets</dt>
              <dd className="tabular font-bold">
                {dailyCalorieTarget ? `${dailyCalorieTarget} kcal` : "no calorie target"},{" "}
                {dailyProteinTarget ? `${dailyProteinTarget} g protein` : "no protein target"}
              </dd>
            </div>
            {fitnessGoal && (
              <div className="flex gap-1.5"><dt className="text-muted-foreground">Goal</dt><dd className="font-bold capitalize">{fitnessGoal}</dd></div>
            )}
          </dl>
        </div>
        <UnlinkClientButton clientId={client.id} name={name} redirectTo="/coach" withLabel />
      </div>

      <dl className="cells grid-cols-2 md:grid-cols-4">
        {(
          [
            ["Days logged", `${stats.loggedDays}/7`],
            ["Avg calories", stats.avgCalories.toLocaleString("en-GB")],
            ["Avg protein", `${stats.avgProtein} g`],
            ["Protein target hit", stats.proteinHitDays == null ? "None set" : `${stats.proteinHitDays} days`],
          ] as const
        ).map(([label, value], index) => (
          <div key={label} className={cn("flex flex-col-reverse gap-2 p-4 md:p-5", index === 2 && "bg-primary text-primary-foreground")}>
            <dt className="text-sm">{label}</dt>
            <dd className="figure-xl text-4xl md:text-5xl">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="week-title" className="box bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="week-title" className="display text-2xl md:text-3xl">Protein, last 7 days</h2>
          {dailyProteinTarget && <span className="text-sm">Dashed line: {dailyProteinTarget} g target</span>}
        </div>
        {/* Bars and the target line share one coordinate box; labels sit above each bar. */}
        <div className="relative mt-8 grid h-40 grid-cols-7 gap-2 sm:gap-4">
          {dailyProteinTarget && (
            <div className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-foreground" style={{ bottom: `${(dailyProteinTarget / maxProtein) * 100}%` }} />
          )}
          {days.map((day) => {
            const height = day.meals ? Math.max((day.protein / maxProtein) * 100, 4) : 4
            return (
              <div key={day.key} className="relative h-full">
                <div
                  className={cn("absolute inset-x-0 bottom-0 mx-auto max-w-12", day.meals ? "bg-protein" : "border border-foreground bg-muted")}
                  style={{ height: `${height}%` }}
                  title={`${day.label}: ${Math.round(day.protein)} g protein, ${Math.round(day.calories)} kcal, ${day.meals} meals`}
                />
                {day.meals > 0 && (
                  <span className="tabular absolute inset-x-0 text-center text-xs font-bold" style={{ bottom: `calc(${height}% + 4px)` }}>
                    {Math.round(day.protein)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2 border-t-3 border-foreground pt-2 text-center text-sm sm:gap-4">
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
            <ul className="box divide-y divide-foreground bg-card">
              {logs.map((log) => (
                <li key={log.id} className="flex flex-col gap-1 px-4 py-3 hover:bg-muted sm:flex-row sm:items-center sm:gap-4">
                  <span className="tabular w-44 shrink-0 text-sm text-muted-foreground">{formatDateTime(tz, log.eatenAt)}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{log.title}</span>
                  <MacroLine calories={log.calories} protein={log.protein} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty className="box bg-muted">
              <EmptyHeader>
                <EmptyTitle>No meals in the last 7 days</EmptyTitle>
                <EmptyDescription>{name} hasn&apos;t logged anything this week.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </TabsContent>
        <TabsContent value="recipes">
          {recipes.length ? (
            <ul className="cells grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe) => (
                <li key={recipe.id} className="bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-black">{recipe.title}</p>
                    <Badge variant="default" className="tabular shrink-0">{Math.round(recipe.protein ?? 0)} g</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{recipe.description || "No description"}</p>
                  <p className="tabular mt-3 flex items-center gap-4 text-sm">
                    <span className="inline-flex items-center gap-1 capitalize"><ChefHat className="size-3.5" aria-hidden="true" /> {recipe.difficulty ?? "Any level"}</span>
                    <span>{(recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)} min</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty className="box bg-muted">
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
