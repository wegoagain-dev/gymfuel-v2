import { Logo } from "@/components/app/logo"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser, toPublicUser } from "@/lib/auth/dal"
import { MobileDock, NavLinks } from "./nav-links"
import { UserMenu } from "./user-menu"

export async function AppNav() {
  const user = toPublicUser(await requireUser())
  return (
    <>
      <header className="sticky top-0 z-40 border-b-3 border-foreground bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-stretch px-4 md:px-6">
          <Logo href="/today" className="pr-6" />
          <NavLinks role={user.role} />
          <div className="ml-auto flex items-center">
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
    <header className="sticky top-0 z-40 border-b-3 border-foreground bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-stretch px-4 md:px-6">
        <Logo href="/today" className="pr-6" />
        <Skeleton className="my-auto ml-auto size-9" />
      </div>
    </header>
  )
}
