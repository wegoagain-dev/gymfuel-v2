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
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="Profile & targets" description="Targets are yours to set, on your own or with a qualified professional. GymFuel's AI never prescribes them." />

      <section aria-label="Account" className="cells grid-cols-1 sm:grid-cols-2">
        <div className="p-5">
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="mt-1 text-xl font-black">{user.fullName || user.username}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
          <Badge variant="default" className="mt-3 capitalize">{user.role}</Badge>
        </div>
        <div className="flex flex-col justify-between gap-4 p-5">
          {user.role === "client" && (
            <div>
              <p className="text-sm text-muted-foreground">Client code</p>
              <p className="mt-1 font-mono text-lg font-bold break-all">{user.clientCode}</p>
            </div>
          )}
          <ThemeToggle />
        </div>
        {user.role === "client" && (
          <div className="flex items-center gap-3 bg-muted px-5 py-4 text-sm sm:col-span-2">
            <UserRoundCheck className="size-5 shrink-0" aria-hidden="true" />
            {coach ? (
              <span>
                Coached by <span className="font-bold">{coach.fullName || coach.username}</span> ({coach.email}). They can see your meals, targets and recipes.
              </span>
            ) : (
              <span className="text-muted-foreground">No coach linked. Share your email and client code with a coach to let them follow your progress.</span>
            )}
          </div>
        )}
      </section>

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
    </div>
  )
}
