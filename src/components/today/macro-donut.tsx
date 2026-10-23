"use client"

import { DonutChart } from "@/components/ui/donut-chart"

/** Today's calories split by macro (EasyUI donut). Client-side because it takes a formatter function. */
export function MacroDonut({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  return (
    <DonutChart
      size={150}
      thickness={16}
      centerLabel="kcal from macros"
      showLegend={false}
      ariaLabel="Today's calories by macro"
      formatValue={(n) => Math.round(n).toLocaleString("en-GB")}
      data={[
        { label: "Protein", value: protein * 4, color: "var(--protein)" },
        { label: "Carbs", value: carbs * 4, color: "var(--carbs)" },
        { label: "Fat", value: fat * 9, color: "var(--fat)" },
      ]}
    />
  )
}
