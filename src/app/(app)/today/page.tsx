import type { Metadata } from "next"
import Link from "next/link"
import { PartyPopper, Target } from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { TodayBoard } from "@/components/today/today-board"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { aiMode } from "@/lib/ai"
import { requireUser } from "@/lib/auth/dal"
import { getMealLogsBetween } from "@/lib/data"
import { currentHour, dayRange, formatDay, formatTime, getTimeZone } from "@/lib/time"
import type { MealType } from "@/db/schema"

export const metadata: Metadata = { title: "Today" }
// Per-user page: renders on each request behind the loading skeleton (see (app)/layout.tsx).
export const instant = false

function defaultMealType(hour: number): MealType {
  if (hour < 11) return "breakfast"
  if (hour < 15) return "lunch"
  if (hour < 21) return "dinner"
  return "snack"
}

export default async function TodayPage({ searchParams }: PageProps<"/today">) {
  const [user, tz, params] = await Promise.all([requireUser(), getTimeZone(), searchParams])
  const { start, end } = dayRange(tz)
  const logs = await getMealLogsBetween(user, start, end)
  const totals = logs.reduce(
    (sum, log) => ({ calories: sum.calories + log.calories, protein: sum.protein + log.protein, carbs: sum.carbs + log.carbs, fat: sum.fat + log.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
  const { dailyCalorieTarget, dailyProteinTarget } = user.preferences
  const firstName = (user.fullName || user.username).split(" ")[0]

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={formatDay(tz, new Date())} title={`Hi, ${firstName}`} />

      {params.welcome && (
        <Alert>
          <PartyPopper />
          <AlertTitle>Welcome to GymFuel</AlertTitle>
          <AlertDescription>
            Start by setting your daily targets, then log your first meal with Lens.{" "}
            <Link href="/profile" className="ink-link font-bold">Set targets</Link>
          </AlertDescription>
        </Alert>
      )}

      {/* The day's readout: two targets as the biggest type on the screen, the macro split beside them. */}
      <section aria-label="Daily progress" className="cells grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
        <ProgressStat label="Calories" value={totals.calories} target={dailyCalorieTarget} unit="kcal" />
        <ProgressStat label="Protein" value={totals.protein} target={dailyProteinTarget} unit="g" lead />
        <MacroSplit protein={totals.protein} carbs={totals.carbs} fat={totals.fat} />
        {(!dailyCalorieTarget || !dailyProteinTarget) && (
          <div className="p-4 md:col-span-3">
            <Button variant="outline" asChild>
              <Link href="/profile">
                <Target data-icon="inline-start" /> Set your targets
              </Link>
            </Button>
          </div>
        )}
      </section>

      <TodayBoard
        aiMode={aiMode()}
        defaultMealType={defaultMealType(currentHour(tz))}
        meals={logs.map((log) => ({
          id: log.id,
          title: log.title,
          foods: log.foods,
          nutrition: { calories: log.calories, protein: log.protein, carbs: log.carbs, fat: log.fat },
          eatenAt: log.eatenAt.toISOString(),
          time: formatTime(tz, log.eatenAt),
          notes: log.notes,
          favorite: log.favorite,
          sourceRecipeId: log.sourceRecipeId,
        }))}
      />
    </div>
  )
}

function ProgressStat({ label, value, target, unit, lead }: { label: string; value: number; target?: number; unit: string; lead?: boolean }) {
  const percent = target ? Math.min((value / target) * 100, 100) : 0
  const left = !target
    ? "No target set"
    : value <= target
      ? `${Math.round(target - value).toLocaleString("en-GB")} ${unit} left`
      : `${Math.round(value - target).toLocaleString("en-GB")} ${unit} over`
  return (
    <div className={lead ? "flex flex-col gap-5 bg-primary p-5 text-primary-foreground md:p-6" : "flex flex-col gap-5 p-5 md:p-6"}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold">{label}</h2>
        <p className="tabular text-sm font-bold">{left}</p>
      </div>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="figure-xl text-7xl lg:text-8xl">{Math.round(value).toLocaleString("en-GB")}</span>
        <span className={lead ? "tabular text-sm" : "tabular text-sm text-muted-foreground"}>
          {target ? `of ${Math.round(target).toLocaleString("en-GB")} ${unit}` : unit}
        </span>
      </p>
      <Progress
        value={percent}
        aria-label={`${label} progress`}
        className={lead ? "mt-auto h-4 border-primary-foreground bg-primary" : "mt-auto h-4"}
        indicatorClassName={lead ? "bg-accent" : "bg-primary"}
      />
    </div>
  )
}

// Today's calories split by macro (protein and carbs at 4 kcal a gram, fat at 9): one ruled bar, then the rows.
function MacroSplit({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const rows = [
    { label: "Protein", grams: protein, kcal: protein * 4, fill: "bg-protein" },
    { label: "Carbs", grams: carbs, kcal: carbs * 4, fill: "bg-carbs" },
    { label: "Fat", grams: fat, kcal: fat * 9, fill: "bg-fat" },
  ]
  const total = rows.reduce((sum, row) => sum + row.kcal, 0)
  if (!total) {
    return (
      <div className="flex flex-col justify-center gap-2 p-5 md:p-6">
        <h2 className="text-base font-bold">Macro split</h2>
        <p className="text-sm text-muted-foreground">Your macro split appears after the first meal.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4 p-5 md:p-6">
      <h2 className="text-base font-bold">Macro split</h2>
      <div className="flex h-6 border-3 border-foreground" role="img" aria-label="Today's calories by macro">
        {rows.map((row) => (
          <span key={row.label} className={`${row.fill} border-r border-foreground last:border-r-0`} style={{ width: `${(row.kcal / total) * 100}%` }} />
        ))}
      </div>
      <table className="tabular w-full text-sm">
        <caption className="sr-only">Calories from each macro today</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-foreground first:border-t-0">
              <th scope="row" className="py-1.5 text-left font-bold">
                <span className={`mr-2 inline-block size-3 border border-foreground align-[-1px] ${row.fill}`} aria-hidden="true" />
                {row.label}
              </th>
              <td className="py-1.5 text-right">{Math.round(row.grams)} g</td>
              <td className="py-1.5 text-right font-bold">{Math.round((row.kcal / total) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
