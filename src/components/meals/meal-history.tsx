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
import { MacroLine } from "./macros"
import { MealEditorDialog, type MealDraft, type MealEditorState } from "./meal-editor-dialog"

type HistoryMeal = MealDraft & { id: number; time: string; day: string; dayLabel: string }

const sum = (meals: HistoryMeal[], key: "calories" | "protein") => Math.round(meals.reduce((total, meal) => total + meal.nutrition[key], 0)).toLocaleString("en-GB")

/** Past days as a register of pharmacy labels: one dated group per day, one label per meal. */
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
      <div className="tray flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <InputGroup className="h-10 flex-1">
          <InputGroupAddon><Search /></InputGroupAddon>
          <InputGroupInput
            placeholder="Search meals or foods"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search meal history"
            className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus)"
          />
        </InputGroup>
        <ToggleGroup type="single" variant="outline" value={filter} onValueChange={(value) => value && setFilter(value as typeof filter)} className="w-full sm:w-auto">
          <ToggleGroupItem value="all" className="h-10 flex-1 px-3 sm:flex-none"><History /> All meals</ToggleGroupItem>
          <ToggleGroupItem value="favorites" className="h-10 flex-1 px-3 sm:flex-none"><Heart /> Favourites</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {groups.length ? (
        <div className="flex flex-col gap-7">
          {groups.map((group) => (
            <section key={group.label} aria-label={group.label} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule pb-2.5">
                <h2 className="display text-xl">{group.label}</h2>
                <p className="flex items-baseline gap-3 text-xs text-ink-2 sm:text-sm">
                  <span className="rx">{sum(group.meals, "calories")}&nbsp;kcal</span>
                  <span className="rx">{sum(group.meals, "protein")}&nbsp;g protein</span>
                </p>
              </div>
              <ol className="flex flex-col gap-2.5">
                {group.meals.map((meal) => (
                  <li key={meal.id} className="rx-label flex min-w-0">
                    <div className="rx-stub flex w-[4.5rem] shrink-0 flex-col justify-center gap-1.5 border-t-0 border-r border-dashed px-3 py-3 sm:w-20 sm:px-3.5">
                      <time dateTime={meal.eatenAt} className="rx text-base font-medium text-ink">{meal.time}</time>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="-ml-2 text-ink-2"
                        onClick={() => toggleFavorite(meal)}
                        aria-pressed={meal.favorite}
                        aria-label={meal.favorite ? `Remove ${meal.title} from favourites` : `Add ${meal.title} to favourites`}
                      >
                        <Heart className={cn(meal.favorite && "fill-current text-signal-deep dark:text-signal")} />
                      </Button>
                    </div>
                    <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-3 pr-2 pl-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:gap-4 sm:py-3.5 sm:pr-2.5 sm:pl-4">
                      <div className="col-start-1 row-start-1 min-w-0">
                        <p className="truncate font-medium text-ink">{meal.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {meal.foods.map((food) => (food.portion ? `${food.name} (${food.portion})` : food.name)).join(", ")}
                        </p>
                      </div>
                      <MacroLine calories={meal.nutrition.calories} protein={meal.nutrition.protein} className="col-start-1 row-start-2 text-ink-2 sm:col-start-2 sm:row-start-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="col-start-2 row-start-2 -mr-1 size-8 p-0 text-ink-2 sm:col-start-3 sm:row-start-1 sm:mr-0 sm:h-8 sm:w-auto sm:px-3"
                        aria-label={`Log ${meal.title} again`}
                        title="Log again"
                        onClick={() =>
                          setEditor({
                            draft: { ...meal, eatenAt: new Date().toISOString(), favorite: false },
                            mode: { kind: "create" },
                            heading: "Log this meal again",
                            saveLabel: "Log meal",
                          })
                        }
                      >
                        <RotateCcw />
                        <span className="hidden sm:inline">Log again</span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="col-start-2 row-start-1 -mr-1.5 self-center sm:col-start-4 sm:row-start-1" aria-label={`More actions for ${meal.title}`}><MoreHorizontal /></Button>
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
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <Empty className="tray p-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">{filter === "favorites" ? <Heart /> : <History />}</EmptyMedia>
            <EmptyTitle>{meals.length ? "No matching meals" : "No meals yet"}</EmptyTitle>
            <EmptyDescription>
              {meals.length ? "Try another search or switch back to all meals." : "Meals you confirm on the Today screen show up here."}
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