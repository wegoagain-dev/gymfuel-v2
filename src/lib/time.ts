import "server-only"

import { cookies } from "next/headers"
import { TZDate } from "@date-fns/tz"
import { addDays, startOfDay } from "date-fns"

export const DEFAULT_TZ = "Europe/London"
export const TZ_COOKIE = "gf_tz"

/**
 * The browser stores its IANA time zone in a cookie (see TimeZoneSync), so the server can
 * work out "today" and format times exactly as the user sees them.
 */
export async function getTimeZone(): Promise<string> {
  const value = (await cookies()).get(TZ_COOKIE)?.value
  if (value) {
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone: value })
      return value
    } catch {
      // fall through to the default
    }
  }
  return DEFAULT_TZ
}

/** [start, end) of the calendar day containing `at`, in the user's zone. */
export function dayRange(tz: string, at: Date = new Date(), offsetDays = 0) {
  const start = addDays(startOfDay(new TZDate(at, tz)), offsetDays)
  return { start: new Date(start.getTime()), end: new Date(addDays(start, 1).getTime()) }
}

export function dayKey(tz: string, at: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at)
}

export function formatTime(tz: string, at: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(at)
}

export function formatDateTime(tz: string, at: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, dateStyle: "medium", timeStyle: "short" }).format(at)
}

export function formatDay(tz: string, at: Date, options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...options }).format(at)
}

export function currentHour(tz: string) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(new Date()))
}
