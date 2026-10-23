"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChefHat, History, PackageOpen, ScanLine, Users, type LucideIcon } from "lucide-react"
import type { Role } from "@/db/schema"
import { cn } from "@/lib/utils"

type NavItem = { href: string; label: string; short: string; icon: LucideIcon }

function items(role: Role): NavItem[] {
  const base: NavItem[] = [
    { href: "/today", label: "Today", short: "Today", icon: ScanLine },
    { href: "/meals", label: "My Meals", short: "Meals", icon: History },
    { href: "/groceries", label: "Groceries", short: "Groceries", icon: PackageOpen },
    { href: "/recipes", label: "Recipes", short: "Recipes", icon: ChefHat },
  ]
  return role === "coach" ? [...base, { href: "/coach", label: "Clients", short: "Clients", icon: Users }] : base
}

function useActive() {
  const pathname = usePathname()
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`)
}

export function NavLinks({ role }: { role: Role }) {
  const isActive = useActive()
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
      {items(role).map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            isActive(href) && "bg-muted text-foreground"
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  )
}

export function MobileDock({ role }: { role: Role }) {
  const isActive = useActive()
  const links = items(role)
  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 px-2 pt-1.5 backdrop-blur-xl md:hidden"
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
        {links.map(({ href, short, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium text-muted-foreground",
              isActive(href) && "text-primary"
            )}
          >
            <Icon className="size-5" />
            {short}
          </Link>
        ))}
      </div>
    </nav>
  )
}
