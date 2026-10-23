import { Suspense } from "react"
import { AppNav, AppNavSkeleton } from "@/components/app/app-nav"
import { TimeZoneSync } from "@/components/app/time-zone-sync"

// Everything below reads the signed-in user's session, so it renders per request (with
// loading.tsx skeletons) rather than being part of a prerendered static shell.
export const instant = false

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-svh">
      <TimeZoneSync />
      <Suspense fallback={<AppNavSkeleton />}>
        <AppNav />
      </Suspense>
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 md:px-6 md:pt-8 md:pb-16">{children}</main>
    </div>
  )
}
