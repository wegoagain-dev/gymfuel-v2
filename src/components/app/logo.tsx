import Link from "next/link"
import { cn } from "@/lib/utils"

/** The wordmark: GYMFUEL in Libre Franklin 900 capitals, ink on paper. */
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label="GymFuel home"
      className={cn("display inline-flex items-center text-2xl leading-none hover:bg-accent hover:text-accent-foreground", className)}
    >
      GymFuel
    </Link>
  )
}
