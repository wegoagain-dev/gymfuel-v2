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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Meals" description="Everything you've confirmed. Favourite the ones you eat often and log them again in one tap." />
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
