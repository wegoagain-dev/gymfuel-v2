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
    <nav className="tray hidden items-center gap-1 p-1 md:flex" aria-label="Main">
      {items(role).map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-[10px] px-3.5 text-sm font-medium whitespace-nowrap text-ink-2 transition-colors duration-(--dur-micro) hover:bg-paper-3 hover:text-foreground",
            isActive(href) && "bg-card text-foreground shadow-(--shadow-card) hover:bg-card"
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
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
    <nav aria-label="Main" className="dock pb-safe fixed inset-x-0 bottom-0 z-40 px-2 pt-2 md:hidden">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
        {links.map(({ href, short, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn("group flex flex-col items-center gap-1 rounded-xl py-1 text-xs font-medium text-ink-2", active && "text-foreground")}
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-(--dur-micro) group-hover:bg-paper-3",
                  active && "bg-signal-soft text-ink group-hover:bg-signal-soft"
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              {short}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
