import Link from "next/link"
import { Dumbbell } from "lucide-react"
import { cn } from "@/lib/utils"

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} aria-label="GymFuel home" className={cn("inline-flex items-center gap-2.5 rounded-lg", className)}>
      <span className="moulded-primary flex size-8 items-center justify-center rounded-[9px] text-signal-ink" aria-hidden="true">
        <Dumbbell className="size-4" />
      </span>
      <span className="display text-xl">GymFuel</span>
    </Link>
  )
}
