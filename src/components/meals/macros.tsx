import { cn } from "@/lib/utils"

export type Macros = { calories: number; protein: number; carbs: number; fat: number }

const ITEMS = [
  { key: "calories", label: "kcal", unit: "", tint: "plastic--tue" },
  { key: "protein", label: "protein", unit: "\u00a0g", tint: "plastic--thu" },
  { key: "carbs", label: "carbs", unit: "\u00a0g", tint: "plastic--fri" },
  { key: "fat", label: "fat", unit: "\u00a0g", tint: "plastic--sun" },
] as const

/** Four small plastic compartments (kcal, protein, carbs, fat). */
export function MacroGrid({ macros, className }: { macros: Macros; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-4 gap-1.5", className)}>
      {ITEMS.map(({ key, label, unit, tint }) => (
        <div key={key} className={cn("plastic flex flex-col-reverse rounded-[10px] px-2.5 py-2", tint)}>
          <dt className="mt-0.5 text-xs text-ink-2">{label}</dt>
          <dd className="rx text-sm font-medium text-ink">
            {Math.round(macros[key])}
            {unit}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Inline "640 kcal   46 g protein" in the pharmacy-label voice. */
export function MacroLine({ calories, protein, className }: { calories: number; protein: number; className?: string }) {
  return (
    <span className={cn("rx inline-flex items-center gap-3 text-xs text-muted-foreground", className)}>
      <span>{Math.round(calories).toLocaleString("en-GB")}&nbsp;kcal</span>
      <span>{Math.round(protein).toLocaleString("en-GB")}&nbsp;g protein</span>
    </span>
  )
}
