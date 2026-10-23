"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Tells the server which time zone "today" is in, then re-renders if it changed. */
export function TimeZoneSync() {
  const router = useRouter()
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const current = document.cookie.match(/(?:^|; )gf_tz=([^;]*)/)?.[1]
    if (tz && decodeURIComponent(current ?? "") !== tz) {
      document.cookie = `gf_tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`
      router.refresh()
    }
  }, [router])
  return null
}
