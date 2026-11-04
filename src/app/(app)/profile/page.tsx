import type { Metadata } from "next"
import { UserRoundCheck } from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { ProfileForm } from "@/components/profile/profile-form"
import { Badge } from "@/components/ui/badge"
import { requireUser } from "@/lib/auth/dal"
import { getMyCoach } from "@/lib/data"

export const metadata: Metadata = { title: "Profile & targets" }
// Per-user page: renders on each request behind the loading skeleton (see (app)/layout.tsx).
export const instant = false

export default async function ProfilePage() {
  const user = await requireUser()
  const coach = user.role === "client" ? await getMyCoach(user) : null
  const prefs = user.preferences

  return (
    <div className="flex w-full flex-col gap-6 md:gap-8">
      <PageHeader
        title="Profile & targets"
        description="Targets are yours to set, on your own or with a qualified professional. GymFuel's AI never prescribes them."
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <ProfileForm
          // Remount after a save so the fields show the cleaned-up values from the server.
          key={user.updatedAt.toISOString()}
          defaults={{
            fullName: user.fullName ?? "",
            dailyCalorieTarget: prefs.dailyCalorieTarget?.toString() ?? "",
            dailyProteinTarget: prefs.dailyProteinTarget?.toString() ?? "",
            fitnessGoal: prefs.fitnessGoal ?? "maintain",
            dietaryRestrictions: user.dietaryRestrictions.join(", "),
            preferredCuisines: (prefs.preferredCuisines ?? []).join(", "),
            dislikedIngredients: (prefs.dislikedIngredients ?? []).join(", "),
            maxPrepTimeMinutes: prefs.maxPrepTimeMinutes?.toString() ?? "",
          }}
        />

        <aside aria-label="Account" className="tray flex flex-col gap-4 p-4 sm:p-5 lg:sticky lg:top-24">
          <h2 className="display text-lg">Account</h2>

          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="truncate font-medium">{user.fullName || user.username}</p>
            <p className="break-all text-sm text-muted-foreground">{user.email}</p>
            <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
            <Badge variant="secondary" className="mt-1 w-fit capitalize">{user.role}</Badge>
          </div>

          {user.role === "client" && (
            <div className="flex flex-col gap-0.5 border-t border-rule pt-4">
              <p className="text-sm text-muted-foreground">Client code</p>
              <p className="rx text-base text-ink">{user.clientCode}</p>
            </div>
          )}

          <div className="border-t border-rule pt-4">
            <ThemeToggle />
          </div>

          {user.role === "client" && (
            <div className="flex items-start gap-3 border-t border-rule pt-4 text-sm text-ink-2">
              <UserRoundCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              {coach ? (
                <p>
                  Coached by <span className="font-medium text-ink">{coach.fullName || coach.username}</span> ({coach.email}). They can see your meals, targets and recipes.
                </p>
              ) : (
                <p className="text-muted-foreground">No coach linked. Share your email and client code with a coach to let them follow your progress.</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
