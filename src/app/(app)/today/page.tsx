import type { Metadata } from "next"
import Link from "next/link"
import { PartyPopper, Target } from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { MacroDonut } from "@/components/today/macro-donut"
import { TodayBoard } from "@/components/today/today-board"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AnimatedNumber } from "@/components/ui/animated-number"
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
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={formatDay(tz, new Date())} title={`Hi, ${firstName}`} />

      {params.welcome && (
        <Alert>
          <PartyPopper />
          <AlertTitle>Welcome to GymFuel</AlertTitle>
          <AlertDescription>
            Start by setting your daily targets, then log your first meal with Lens.{" "}
            <Link href="/profile" className="font-medium text-foreground underline underline-offset-4">Set targets</Link>
          </AlertDescription>
        </Alert>
      )}

      <section aria-label="Daily progress" className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-[1fr_1fr_auto] md:p-6">
        <ProgressStat label="Calories" value={totals.calories} target={dailyCalorieTarget} unit="kcal" indicator="bg-kcal" />
        <ProgressStat label="Protein" value={totals.protein} target={dailyProteinTarget} unit="g" indicator="bg-protein" />
        <div className="flex items-center justify-center md:border-l md:pl-6">
          {totals.calories > 0 ? (
            <MacroDonut protein={totals.protein} carbs={totals.carbs} fat={totals.fat} />
          ) : (
            <p className="max-w-40 text-center text-sm text-muted-foreground">Your macro split appears after the first meal.</p>
          )}
        </div>
        {(!dailyCalorieTarget || !dailyProteinTarget) && (
          <Button variant="outline" className="md:col-span-3 md:justify-self-start" asChild>
            <Link href="/profile">
              <Target data-icon="inline-start" /> Set your targets
            </Link>
          </Button>
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

function ProgressStat({ label, value, target, unit, indicator }: { label: string; value: number; target?: number; unit: string; indicator: string }) {
  const percent = target ? Math.min((value / target) * 100, 100) : 0
  return (
    <div className="flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          {!target ? "No target set" : value <= target ? `${Math.round(target - value).toLocaleString("en-GB")} ${unit} left` : `${Math.round(value - target).toLocaleString("en-GB")} ${unit} over`}
        </p>
      </div>
      <div className="flex items-baseline gap-1.5">
        <AnimatedNumber value={Math.round(value)} useGrouping className="text-4xl font-semibold tracking-tight" />
        <span className="text-sm text-muted-foreground">{target ? `/ ${Math.round(target).toLocaleString("en-GB")} ${unit}` : unit}</span>
      </div>
      <Progress value={percent} aria-label={`${label} progress`} className="h-2" indicatorClassName={indicator} />
    </div>
  )
}
