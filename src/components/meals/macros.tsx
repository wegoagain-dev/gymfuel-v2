import { cn } from "@/lib/utils"

export type Macros = { calories: number; protein: number; carbs: number; fat: number }

const ITEMS = [
  { key: "calories", label: "kcal", unit: "" },
  { key: "protein", label: "protein", unit: "g" },
  { key: "carbs", label: "carbs", unit: "g" },
  { key: "fat", label: "fat", unit: "g" },
] as const

/** Four macro figures (kcal, protein, carbs, fat) as cells that share their rules; protein, the one that matters, prints in ink. */
export function MacroGrid({ macros, className }: { macros: Macros; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-4 border border-foreground", className)}>
      {ITEMS.map(({ key, label, unit }) => (
        <div
          key={key}
          className={cn(
            "flex flex-col-reverse border-l border-foreground px-2.5 py-2 first:border-l-0",
            key === "protein" && "bg-primary text-primary-foreground"
          )}
        >
          <dt className={cn("text-xs", key !== "protein" && "text-muted-foreground")}>{label}</dt>
          <dd className="tabular text-base font-black">
            {Math.round(macros[key])}
            {unit}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Inline calories and protein, set as two plain figures. */
export function MacroLine({ calories, protein, className }: { calories: number; protein: number; className?: string }) {
  return (
    <span className={cn("tabular inline-flex items-baseline gap-4 text-sm text-muted-foreground", className)}>
      <span>{Math.round(calories)} kcal</span>
      <span className="font-bold text-foreground">{Math.round(protein)} g protein</span>
    </span>
  )
}
