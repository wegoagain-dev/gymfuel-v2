import type { Metadata } from "next"
import { PageHeader } from "@/components/app/page-header"
import { MealHistory } from "@/components/meals/meal-history"
import { requireUser } from "@/lib/auth/dal"
import { getMealHistory } from "@/lib/data"
import { dayKey, dayRange, formatDay, formatTime, getTimeZone } from "@/lib/time"

export const metadata: Metadata = { title: "My Meals" }
// Per-user page: renders on each request behind the loading skeleton (see (app)/layout.tsx).
export const instant = false

export default async function MealsPage() {
  const [user, tz] = await Promise.all([requireUser(), getTimeZone()])
  const logs = await getMealHistory(user)
  const today = dayKey(tz, dayRange(tz).start)
  const yesterday = dayKey(tz, dayRange(tz, new Date(), -1).start)
  const dayCount = new Set(logs.map((log) => dayKey(tz, log.eatenAt))).size

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Meals" description="Every meal you've confirmed, grouped by day. Favourite the ones you eat often and log them again in one tap.">
        {logs.length > 0 && (
          <p className="rx text-sm text-muted-foreground">
            {logs.length} meal{logs.length === 1 ? "" : "s"} over {dayCount} day{dayCount === 1 ? "" : "s"}
          </p>
        )}
      </PageHeader>
      <MealHistory
        meals={logs.map((log) => {
          const key = dayKey(tz, log.eatenAt)
          return {
            id: log.id,
            title: log.title,
            foods: log.foods,
            nutrition: { calories: log.calories, protein: log.protein, carbs: log.carbs, fat: log.fat },
            eatenAt: log.eatenAt.toISOString(),
            notes: log.notes,
            favorite: log.favorite,
            sourceRecipeId: log.sourceRecipeId,
            time: formatTime(tz, log.eatenAt),
            day: key,
            dayLabel: key === today ? "Today" : key === yesterday ? "Yesterday" : formatDay(tz, log.eatenAt, { weekday: "long", day: "numeric", month: "short" }),
          }
        })}
      />
    </div>
  )
}
