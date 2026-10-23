import { Logo } from "@/components/app/logo"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser, toPublicUser } from "@/lib/auth/dal"
import { MobileDock, NavLinks } from "./nav-links"
import { UserMenu } from "./user-menu"

export async function AppNav() {
  const user = toPublicUser(await requireUser())
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-6">
          <Logo href="/today" />
          <NavLinks role={user.role} />
          <div className="ml-auto">
            <UserMenu user={user} />
          </div>
        </div>
      </header>
      <MobileDock role={user.role} />
    </>
  )
}

export function AppNavSkeleton() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-6">
        <Logo href="/today" />
        <Skeleton className="ml-auto size-9 rounded-full" />
      </div>
    </header>
  )
}
