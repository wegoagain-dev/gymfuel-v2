"use client"

import { useMemo, useOptimistic, useState, useTransition } from "react"
import { Heart, History, MoreHorizontal, Pencil, RotateCcw, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { deleteMealLog, setMealFavorite } from "@/app/actions/meals"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { MacroGrid } from "./macros"
import { MealEditorDialog, type MealDraft, type MealEditorState } from "./meal-editor-dialog"

type HistoryMeal = MealDraft & { id: number; time: string; day: string; dayLabel: string }

export function MealHistory({ meals }: { meals: HistoryMeal[] }) {
  const [filter, setFilter] = useState<"all" | "favorites">("all")
  const [query, setQuery] = useState("")
  const [editor, setEditor] = useState<MealEditorState>(null)
  const [deleting, setDeleting] = useState<HistoryMeal | null>(null)
  const [, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useOptimistic(meals, (current, update: { id: number; favorite: boolean }) =>
    current.map((meal) => (meal.id === update.id ? { ...meal, favorite: update.favorite } : meal))
  )

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase()
    const visible = optimistic.filter(
      (meal) =>
        (filter === "all" || meal.favorite) &&
        `${meal.title} ${meal.foods.map((food) => food.name).join(" ")}`.toLowerCase().includes(term)
    )
    const byDay = new Map<string, { label: string; meals: HistoryMeal[] }>()
    for (const meal of visible) {
      const group = byDay.get(meal.day) ?? { label: meal.dayLabel, meals: [] }
      group.meals.push(meal)
      byDay.set(meal.day, group)
    }
    return [...byDay.values()]
  }, [optimistic, filter, query])

  const toggleFavorite = (meal: HistoryMeal) =>
    startTransition(async () => {
      setOptimistic({ id: meal.id, favorite: !meal.favorite })
      const result = await setMealFavorite(meal.id, !meal.favorite)
      if (!result.ok) toast.error(result.error)
    })

  const confirmDelete = () => {
    if (!deleting) return
    const meal = deleting
    startTransition(async () => {
      const result = await deleteMealLog(meal.id)
      if (result.ok) toast.success("Meal deleted")
      else toast.error(result.error)
    })
    setDeleting(null)
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <InputGroup className="h-10 flex-1">
          <InputGroupInput placeholder="Search meals or foods" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search meal history" />
          <InputGroupAddon><Search /></InputGroupAddon>
        </InputGroup>
        <ToggleGroup type="single" variant="outline" value={filter} onValueChange={(value) => value && setFilter(value as typeof filter)}>
          <ToggleGroupItem value="all" className="h-10 px-3"><History /> History</ToggleGroupItem>
          <ToggleGroupItem value="favorites" className="h-10 px-3"><Heart /> Favourites</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {groups.length ? (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.label} aria-label={group.label} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold">{group.label}</h2>
                <span className="tabular text-xs text-muted-foreground">
                  {Math.round(group.meals.reduce((sum, meal) => sum + meal.nutrition.calories, 0)).toLocaleString("en-GB")} kcal ·{" "}
                  {Math.round(group.meals.reduce((sum, meal) => sum + meal.nutrition.protein, 0))} g protein
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {group.meals.map((meal) => (
                  <li key={meal.id} className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[minmax(0,1fr)_320px_auto] md:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => toggleFavorite(meal)}
                        aria-pressed={meal.favorite}
                        aria-label={meal.favorite ? `Remove ${meal.title} from favourites` : `Add ${meal.title} to favourites`}
                      >
                        <Heart className={cn(meal.favorite && "fill-fat text-fat")} />
                      </Button>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{meal.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {meal.foods.map((food) => `${food.name}${food.portion ? ` (${food.portion})` : ""}`).join(" · ")}
                        </p>
                        <p className="tabular mt-1 text-xs text-muted-foreground">{meal.time}</p>
                      </div>
                    </div>
                    <MacroGrid macros={meal.nutrition} />
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditor({
                            draft: { ...meal, eatenAt: new Date().toISOString(), favorite: false },
                            mode: { kind: "create" },
                            heading: "Log this meal again",
                            saveLabel: "Log meal",
                          })
                        }
                      >
                        <RotateCcw data-icon="inline-start" /> Log again
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${meal.title}`}><MoreHorizontal /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditor({ draft: meal, mode: { kind: "update", id: meal.id }, heading: "Edit meal", saveLabel: "Save changes" })}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(meal)}>
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">{filter === "favorites" ? <Heart /> : <History />}</EmptyMedia>
            <EmptyTitle>{meals.length ? "No matching meals" : "No meals yet"}</EmptyTitle>
            <EmptyDescription>
              {meals.length ? "Try another search or switch back to all history." : "Meals you confirm on Today show up here."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <MealEditorDialog state={editor} onClose={() => setEditor(null)} />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this meal?</AlertDialogTitle>
            <AlertDialogDescription>“{deleting?.title}” will be permanently removed from your history and today&apos;s totals.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>Delete meal</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
