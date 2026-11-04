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
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-[calc(var(--dock-height)+env(safe-area-inset-bottom)+2rem)] md:px-6 md:pt-10 md:pb-20">{children}</main>
    </div>
  )
}
