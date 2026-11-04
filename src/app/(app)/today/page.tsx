import type { Metadata } from "next"
import Link from "next/link"
import { PartyPopper } from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { MacroOrganiser } from "@/components/today/macro-organiser"
import { TodayBoard } from "@/components/today/today-board"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
    <div className="flex flex-col gap-6 md:gap-8">
      <PageHeader eyebrow={formatDay(tz, new Date())} title={`Hi, ${firstName}`} />

      {params.welcome && (
        <Alert className="border-transparent bg-signal-soft/50">
          <PartyPopper />
          <AlertTitle>Welcome to GymFuel</AlertTitle>
          <AlertDescription className="text-ink-2">
            Start by setting your daily targets, then log your first meal with Lens.{" "}
            <Link href="/profile" className="font-medium text-foreground underline underline-offset-4">Set targets</Link>
          </AlertDescription>
        </Alert>
      )}

      <MacroOrganiser totals={totals} calorieTarget={dailyCalorieTarget} proteinTarget={dailyProteinTarget} />

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
