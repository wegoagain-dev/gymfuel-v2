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

// Desktop: each destination is a cell in the slab, ruled on both sides; the current one fills yellow under its ink.
export function NavLinks({ role }: { role: Role }) {
  const isActive = useActive()
  return (
    <nav className="hidden items-stretch md:flex" aria-label="Main">
      {items(role).map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "-ml-[3px] inline-flex items-center border-x-3 border-foreground px-5 text-sm font-bold whitespace-nowrap text-foreground hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-primary-foreground",
            isActive(href) && "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
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
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t-3 border-foreground bg-background md:hidden"
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
        {links.map(({ href, short, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 border-l border-foreground text-xs font-bold text-foreground first:border-l-0 active:bg-primary active:text-primary-foreground",
              isActive(href) && "bg-accent text-accent-foreground"
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {short}
          </Link>
        ))}
      </div>
    </nav>
  )
}
