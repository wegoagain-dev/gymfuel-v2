import Link from "next/link"
import { Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Totals = { calories: number; protein: number; carbs: number; fat: number }
const grouped = (value: number) => Math.round(value).toLocaleString("en-GB")

/**
 * The day as a pill organiser: one translucent compartment per macro, filled from the bottom
 * to the share of its target (calories, protein) or of the day's calories (carbs, fat).
 */
export function MacroOrganiser({ totals, calorieTarget, proteinTarget }: { totals: Totals; calorieTarget?: number; proteinTarget?: number }) {
  const macroKcal = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9
  const share = (kcal: number) => (macroKcal > 0 ? kcal / macroKcal : 0)

  return (
    <section aria-label="Daily progress" className="flex flex-col gap-3">
      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))]">
        <Compartment tint="plastic--thu" label="Protein" value={totals.protein} unit="g" target={proteinTarget} big />
        <Compartment tint="plastic--tue" label="Calories" value={totals.calories} unit="kcal" target={calorieTarget} big />
        <Compartment tint="plastic--fri" label="Carbs" value={totals.carbs} unit="g" share={share(totals.carbs * 4)} />
        <Compartment tint="plastic--sun" label="Fat" value={totals.fat} unit="g" share={share(totals.fat * 9)} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="rx text-xs text-muted-foreground">
          {macroKcal > 0 ? `${grouped(macroKcal)} kcal from macros` : "Your macro split appears after the first meal."}
        </p>
        {(!calorieTarget || !proteinTarget) && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/profile">
              <Target data-icon="inline-start" /> Set your targets
            </Link>
          </Button>
        )}
      </div>
    </section>
  )
}

function Compartment({
  tint,
  label,
  value,
  unit,
  target,
  share,
  big = false,
}: {
  tint: string
  label: string
  value: number
  unit: string
  target?: number
  share?: number
  big?: boolean
}) {
  const fill = target ? Math.min(value / target, 1) : share !== undefined ? Math.min(share, 1) : 0
  const note =
    share !== undefined
      ? `${Math.round(share * 100)}% of kcal`
      : !target
        ? "No target set"
        : value <= target
          ? `${grouped(target - value)} ${unit} left`
          : `${grouped(value - target)} ${unit} over`

  return (
    <div className={cn("plastic isolate flex flex-col justify-between gap-6 overflow-hidden p-4", big ? "min-h-44 md:min-h-52 md:p-5" : "min-h-32 md:min-h-52 md:p-5", tint)}>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-full origin-bottom bg-[color-mix(in_oklab,var(--t)_84%,var(--color-ink))] shadow-[inset_0_1.5px_0_var(--glint)] transition-transform duration-(--dur-long) ease-(--ease-out)"
        style={{ transform: `scaleY(${fill})` }}
      />
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="rx hidden text-xs text-ink-2 sm:block">{note}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className={cn("figure text-ink", big ? "text-[2.75rem] md:text-[3.5rem]" : "text-[2rem] md:text-[3.5rem]")}>{grouped(value)}</p>
        <p className="rx text-sm text-ink-2">{target ? `of ${grouped(target)}\u00a0${unit}` : unit}</p>
        <p className="rx text-xs text-ink-2 sm:hidden">{note}</p>
      </div>
    </div>
  )
}
