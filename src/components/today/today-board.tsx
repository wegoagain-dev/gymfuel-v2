"use client"

import { useRef, useState, useTransition } from "react"
import { Camera, Heart, ImagePlus, Pencil, RefreshCw, Utensils, WandSparkles } from "lucide-react"
import { suggestMealAction } from "@/app/actions/meals"
import { MacroLine } from "@/components/meals/macros"
import { MealEditorDialog, type MealDraft, type MealEditorState } from "@/components/meals/meal-editor-dialog"
import { GeneratedRecipeCard } from "@/components/recipes/generated-recipe-card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import type { MealType } from "@/db/schema"
import type { GeneratedRecipe, MealAnalysis } from "@/lib/validation"
import { prepareMealPhoto } from "./prepare-photo"

type TodayMeal = MealDraft & { id: number; time: string }
const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"]
const capitalise = (value: string) => value[0].toUpperCase() + value.slice(1)

export function TodayBoard({ meals, defaultMealType, aiMode }: { meals: TodayMeal[]; defaultMealType: MealType; aiMode: "openai" | "demo" }) {
  const [editor, setEditor] = useState<MealEditorState>(null)
  const totalProtein = meals.reduce((sum, meal) => sum + meal.nutrition.protein, 0)

  return (
    <>
      <div className="cells grid-cols-1 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <LensCard aiMode={aiMode} onDraft={(analysis) =>
          setEditor({
            draft: { title: analysis.title, foods: analysis.foods, nutrition: analysis.nutrition, eatenAt: new Date().toISOString(), favorite: false },
            mode: { kind: "create" },
            assumptions: analysis.assumptions,
            estimate: true,
          })
        } />
        <SuggestCard defaultMealType={defaultMealType} aiMode={aiMode} onLog={(draft) => setEditor({ draft, mode: { kind: "create" }, estimate: true })} />
      </div>

      <section aria-labelledby="todays-meals" className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <h2 id="todays-meals" className="display text-3xl md:text-4xl">Today&apos;s meals</h2>
          <p className="tabular text-sm font-bold">{Math.round(totalProtein)} g protein logged</p>
        </div>
        {meals.length ? (
          <ul className="box flex flex-col divide-y divide-foreground bg-card">
            {meals.map((meal) => (
              <li key={meal.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted md:px-5">
                <span className="figure-xl w-16 shrink-0 text-xl">{meal.time}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-bold">
                    {meal.title}
                    {meal.favorite && <Heart className="size-4 shrink-0 fill-foreground" aria-label="Favourite" />}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{meal.foods.map((food) => food.name).join(", ")}</p>
                </div>
                <MacroLine calories={meal.nutrition.calories} protein={meal.nutrition.protein} className="hidden sm:inline-flex" />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${meal.title}`}
                  onClick={() => setEditor({ draft: meal, mode: { kind: "update", id: meal.id }, heading: "Edit meal", saveLabel: "Save changes" })}
                >
                  <Pencil />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty className="box bg-muted">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Utensils /></EmptyMedia>
              <EmptyTitle>Nothing logged yet today</EmptyTitle>
              <EmptyDescription>Snap a photo with Lens or let AI pick your next meal.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>

      <MealEditorDialog state={editor} onClose={() => setEditor(null)} />
    </>
  )
}

function LensCard({ onDraft, aiMode }: { onDraft: (analysis: MealAnalysis) => void; aiMode: "openai" | "demo" }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [context, setContext] = useState("")
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  const analyse = async (file?: File) => {
    setPending(true)
    setError(undefined)
    try {
      const form = new FormData()
      if (file) form.set("photo", await prepareMealPhoto(file), "meal.jpg")
      form.set("portionContext", context)
      const response = await fetch("/api/lens/analyze", { method: "POST", body: form })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? "The meal couldn't be analysed")
      onDraft(body as MealAnalysis)
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "The meal couldn't be analysed")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 bg-card p-5 md:p-6">
      <div className="flex flex-col gap-2">
        <h2 className="display flex items-center gap-3 text-3xl md:text-4xl">
          <Camera className="size-7 shrink-0" strokeWidth={2.5} aria-hidden="true" /> Log with Lens
        </h2>
        <p className="text-muted-foreground">Photograph your plate. You review the estimate before it counts.</p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="mt-auto flex flex-col gap-3">
        <Field>
          <FieldLabel htmlFor="portion-context" className="sr-only">Portion notes</FieldLabel>
          <Input id="portion-context" placeholder="Optional portion notes, e.g. 250g chicken, 150g rice" maxLength={500} value={context} onChange={(event) => setContext(event.target.value)} />
        </Field>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (file) void analyse(file)
          }}
        />
        <Button size="lg" onClick={() => fileInput.current?.click()} disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : <ImagePlus data-icon="inline-start" />}
          {pending ? "Analysing your meal…" : "Take or choose a photo"}
        </Button>
        {aiMode === "demo" ? (
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>Demo AI: estimates come from your notes.</span>
            <Button variant="link" size="xs" className="h-auto border-0 p-0 text-sm" disabled={pending || !context.trim()} onClick={() => analyse()}>
              Use notes only
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Photos are analysed once and never stored.</p>
        )}
      </div>
    </div>
  )
}

function SuggestCard({ defaultMealType, aiMode, onLog }: { defaultMealType: MealType; aiMode: "openai" | "demo"; onLog: (draft: MealDraft) => void }) {
  const [open, setOpen] = useState(false)
  const [mealType, setMealType] = useState<MealType>(defaultMealType)
  const [minutes, setMinutes] = useState("30")
  const [attempt, setAttempt] = useState(0)
  const [recipe, setRecipe] = useState<GeneratedRecipe>()
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  const generate = (nextAttempt = attempt) =>
    startTransition(async () => {
      setError(undefined)
      const result = await suggestMealAction({ mealType, availableMinutes: Number(minutes), attempt: nextAttempt })
      if (result.ok) setRecipe(result.data)
      else setError(result.error)
    })

  return (
    <div className="flex flex-col gap-5 bg-muted p-5 md:p-6">
      <div className="flex flex-col gap-2">
        <h2 className="display flex items-center gap-3 text-3xl md:text-4xl">
          <WandSparkles className="size-7 shrink-0" strokeWidth={2.5} aria-hidden="true" /> Pick a meal for me
        </h2>
        <p className="text-muted-foreground">One practical idea from your preferences and what&apos;s left of today&apos;s targets.</p>
      </div>
      <Button
        size="lg"
        variant="outline"
        className="mt-auto"
        onClick={() => {
          setOpen(true)
          if (!recipe) generate()
        }}
      >
        <WandSparkles data-icon="inline-start" /> Suggest a meal
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Pick a meal for me</DialogTitle>
            <DialogDescription>
              Based on your profile and remaining targets{aiMode === "demo" ? " (demo AI)" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>Meal</FieldLabel>
              <Select value={mealType} onValueChange={(value) => setMealType(value as MealType)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((type) => <SelectItem key={type} value={type}>{capitalise(type)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Time available</FieldLabel>
              <Select value={minutes} onValueChange={setMinutes}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60].map((value) => <SelectItem key={value} value={String(value)}>{value} minutes</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {pending ? (
            <div className="box flex flex-col gap-3 p-5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : recipe ? (
            <GeneratedRecipeCard
              key={`${recipe.title}-${attempt}`}
              recipe={recipe}
              showPantry={false}
              onLog={(draft) => {
                setOpen(false)
                onLog(draft)
              }}
            />
          ) : null}
          <Button
            variant="ghost"
            onClick={() => {
              const next = attempt + 1
              setAttempt(next)
              generate(next)
            }}
            disabled={pending}
          >
            <RefreshCw data-icon="inline-start" /> Try another
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
