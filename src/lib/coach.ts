import "server-only"

import type { MealLog, UserPreferences } from "@/db/schema"
import { dayKey, dayRange, formatDay } from "@/lib/time"

export type DaySummary = { key: string; label: string; calories: number; protein: number; meals: number }

/** Last 7 calendar days (oldest first) of totals for one client, in the coach's time zone. */
export function weekSummary(tz: string, logs: MealLog[]): DaySummary[] {
  const days: DaySummary[] = []
  for (let offset = -6; offset <= 0; offset++) {
    const { start } = dayRange(tz, new Date(), offset)
    days.push({ key: dayKey(tz, start), label: formatDay(tz, start, { weekday: "short" }), calories: 0, protein: 0, meals: 0 })
  }
  const byKey = new Map(days.map((day) => [day.key, day]))
  for (const log of logs) {
    const day = byKey.get(dayKey(tz, log.eatenAt))
    if (!day) continue
    day.calories += log.calories
    day.protein += log.protein
    day.meals += 1
  }
  return days
}

export function weekStats(days: DaySummary[], prefs: UserPreferences) {
  const logged = days.filter((day) => day.meals > 0)
  const avg = (key: "calories" | "protein") => (logged.length ? logged.reduce((sum, day) => sum + day[key], 0) / logged.length : 0)
  const proteinTarget = prefs.dailyProteinTarget
  return {
    loggedDays: logged.length,
    avgCalories: Math.round(avg("calories")),
    avgProtein: Math.round(avg("protein")),
    proteinHitDays: proteinTarget ? logged.filter((day) => day.protein >= proteinTarget * 0.9).length : null,
  }
}
