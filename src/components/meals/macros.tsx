import { cn } from "@/lib/utils"

export type Macros = { calories: number; protein: number; carbs: number; fat: number }

const ITEMS = [
  { key: "calories", label: "kcal", unit: "", dot: "bg-kcal" },
  { key: "protein", label: "protein", unit: "g", dot: "bg-protein" },
  { key: "carbs", label: "carbs", unit: "g", dot: "bg-carbs" },
  { key: "fat", label: "fat", unit: "g", dot: "bg-fat" },
] as const

/** Four compact macro tiles (kcal, protein, carbs, fat). */
export function MacroGrid({ macros, className }: { macros: Macros; className?: string }) {
  return (
    <div className={cn("grid grid-cols-4 gap-1.5", className)}>
      {ITEMS.map(({ key, label, unit, dot }) => (
        <div key={key} className="rounded-lg bg-muted/70 px-2.5 py-2">
          <p className="tabular text-sm font-semibold">
            {Math.round(macros[key])}
            {unit}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", dot)} />
            {label}
          </p>
        </div>
      ))}
    </div>
  )
}

/** Inline "640 kcal · 46 g protein" text. */
export function MacroLine({ calories, protein, className }: { calories: number; protein: number; className?: string }) {
  return (
    <span className={cn("tabular inline-flex items-center gap-3 text-xs text-muted-foreground", className)}>
      <span className="inline-flex items-center gap-1">
        <span className="size-1.5 rounded-full bg-kcal" />
        {Math.round(calories)} kcal
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="size-1.5 rounded-full bg-protein" />
        {Math.round(protein)} g protein
      </span>
    </span>
  )
}
