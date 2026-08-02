"use client"

import {
  Camera,
  Check,
  ChevronDown,
  Dumbbell,
  Edit3,
  Flame,
  Heart,
  History,
  ImagePlus,
  Loader2,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  Utensils,
  WandSparkles,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useStore } from "@/lib/store"
import type {
  FitnessGoal,
  GeneratedGymRecipe,
  GymMealType,
  MealLog,
  MealLogInput,
  NutritionEstimate,
} from "@/lib/types"

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const MAX_PHOTO_DIMENSION = 1600
const GOALS: { value: FitnessGoal; label: string; note: string }[] = [
  { value: "cut", label: "Cut", note: "Lighter" },
  { value: "maintain", label: "Maintain", note: "Balanced" },
  { value: "bulk", label: "Bulk", note: "Denser" },
]
const MEAL_TYPES: GymMealType[] = ["breakfast", "lunch", "dinner", "snack"]

function numberPreference(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function todayBounds() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 1)
  return { start, end }
}

function isToday(timestamp: string) {
  const date = new Date(timestamp)
  const { start, end } = todayBounds()
  return date >= start && date < end
}

function editorInput(meal: MealLog, eatenAt = meal.eatenAt): MealLogInput {
  return {
    title: meal.title,
    foods: meal.foods.map((food) => ({ ...food })),
    nutritionalInfo: { ...meal.nutritionalInfo },
    eatenAt,
    notes: meal.notes,
    favorite: eatenAt === meal.eatenAt ? meal.favorite : false,
    sourceRecipeId: meal.sourceRecipeId,
  }
}

function toLocalDateTime(timestamp: string) {
  const date = new Date(timestamp)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

async function canvasJPEG(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("The photo could not be converted to JPEG.")),
      "image/jpeg",
      quality
    )
  })
}

async function prepareMealPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image of your meal.")
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext("2d", { alpha: false })
  if (!context) throw new Error("The photo could not be prepared.")
  context.fillStyle = "#000"
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  for (const quality of [0.84, 0.72, 0.58, 0.44]) {
    const jpeg = await canvasJPEG(canvas, quality)
    if (jpeg.size <= MAX_PHOTO_BYTES) return jpeg
  }
  throw new Error("That photo is still larger than 5 MB after compression.")
}

function MacroStat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-3">
      <p className="text-lg font-semibold tabular-nums text-white">{Math.round(value)}{unit}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-white/42">{label}</p>
    </div>
  )
}

function EstimateNotice() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-400/8 px-3 py-2 text-xs font-medium text-cyan-100">
      <Sparkles className="size-3.5" />
      AI estimate — review before saving
    </div>
  )
}

function ProgressMetric({
  label,
  value,
  target,
  unit,
  tone,
}: {
  label: string
  value: number
  target?: number
  unit: string
  tone: "blue" | "emerald"
}) {
  const percentage = target ? Math.min((value / target) * 100, 100) : 0
  const bar = tone === "blue" ? "bg-blue-400" : "bg-emerald-400"
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
            {Math.round(value)} <span className="text-sm font-normal text-white/40">{unit}</span>
          </p>
        </div>
        <p className="pb-1 text-xs text-white/45">
          {target ? `of ${Math.round(target)} ${unit}` : "Target not set"}
        </p>
      </div>
      {target ? (
        <div className="h-2 overflow-hidden rounded-full bg-white/8" role="progressbar" aria-label={`${label} progress`} aria-valuenow={value} aria-valuemax={target}>
          <div className={`h-full rounded-full ${bar} transition-[width] duration-500`} style={{ width: `${percentage}%` }} />
        </div>
      ) : null}
    </div>
  )
}

export function MealEditorDialog({
  open,
  onOpenChange,
  initial,
  assumptions = [],
  title = "Confirm meal",
  saveLabel = "Save meal",
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: MealLogInput | null
  assumptions?: string[]
  title?: string
  saveLabel?: string
  onSave: (input: MealLogInput) => Promise<void>
}) {
  const [draft, setDraft] = useState<MealLogInput | null>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (open && initial) {
      setDraft({
        ...initial,
        foods: initial.foods.map((food) => ({ ...food })),
        nutritionalInfo: { ...initial.nutritionalInfo },
      })
      setError(undefined)
    }
  }, [initial, open])

  const setNutrition = (key: keyof NutritionEstimate, value: string) => {
    if (!draft) return
    setDraft({
      ...draft,
      nutritionalInfo: { ...draft.nutritionalInfo, [key]: Math.max(0, Number(value) || 0) },
    })
  }

  const valid = Boolean(
    draft?.title.trim()
      && draft.foods.length
      && draft.foods.every((food) => food.name.trim())
  )

  const handleSave = async () => {
    if (!draft || !valid) return
    setSaving(true)
    setError(undefined)
    try {
      await onSave({
        ...draft,
        title: draft.title.trim(),
        foods: draft.foods.map((food) => ({
          name: food.name.trim(),
          portion: food.portion?.trim() || undefined,
        })),
      })
      onOpenChange(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The meal could not be saved.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Nothing affects your totals until you confirm this form.</DialogDescription>
        </DialogHeader>
        {draft ? (
          <div className="flex flex-col gap-5">
            <EstimateNotice />
            {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}

            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <label className="flex flex-col gap-1.5 text-xs text-white/55">
                Meal title
                <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-white/55">
                Eaten at
                <Input
                  type="datetime-local"
                  value={toLocalDateTime(draft.eatenAt)}
                  onChange={(event) => {
                    const date = new Date(event.target.value)
                    if (!Number.isNaN(date.getTime())) setDraft({ ...draft, eatenAt: date.toISOString() })
                  }}
                />
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/45">Food components</p>
                <Button variant="ghost" size="sm" onClick={() => setDraft({ ...draft, foods: [...draft.foods, { name: "", portion: "" }] })}>
                  <Plus className="size-3.5" /> Add food
                </Button>
              </div>
              {draft.foods.map((food, index) => (
                <div key={index} className="grid grid-cols-[minmax(0,1fr)_36px] gap-2 sm:grid-cols-[minmax(0,1fr)_140px_36px]">
                  <Input
                    aria-label={`Food ${index + 1}`}
                    placeholder="Food"
                    value={food.name}
                    onChange={(event) => setDraft({
                      ...draft,
                      foods: draft.foods.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item),
                    })}
                  />
                  <Input
                    aria-label={`Portion ${index + 1}`}
                    placeholder="Portion"
                    className="col-start-1 sm:col-start-auto"
                    value={food.portion || ""}
                    onChange={(event) => setDraft({
                      ...draft,
                      foods: draft.foods.map((item, itemIndex) => itemIndex === index ? { ...item, portion: event.target.value } : item),
                    })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={draft.foods.length === 1}
                    onClick={() => setDraft({ ...draft, foods: draft.foods.filter((_, itemIndex) => itemIndex !== index) })}
                    aria-label={`Remove food ${index + 1}`}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                ["calories", "Calories", "kcal"],
                ["protein", "Protein", "g"],
                ["carbs", "Carbs", "g"],
                ["fat", "Fat", "g"],
              ] as const).map(([key, label, unit]) => (
                <label key={key} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-xs text-white/45">
                  {label}
                  <div className="mt-1 flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      className="h-9 border-0 bg-transparent px-0 text-lg font-semibold ring-0 focus-visible:ring-0"
                      value={draft.nutritionalInfo[key]}
                      onChange={(event) => setNutrition(key, event.target.value)}
                    />
                    <span>{unit}</span>
                  </div>
                </label>
              ))}
            </div>

            {assumptions.length ? (
              <div className="rounded-2xl border border-amber-300/14 bg-amber-400/6 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-100/70">AI assumptions</p>
                <ul className="mt-2 grid gap-1.5 text-sm text-white/58">
                  {assumptions.map((assumption) => <li key={assumption}>• {assumption}</li>)}
                </ul>
              </div>
            ) : null}

            <Textarea
              aria-label="Meal notes"
              placeholder="Optional notes"
              value={draft.notes || ""}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value || undefined })}
            />
            <label className="flex items-center gap-3 text-sm text-white/75">
              <input
                type="checkbox"
                className="size-4 accent-blue-400"
                checked={draft.favorite}
                onChange={(event) => setDraft({ ...draft, favorite: event.target.checked })}
              />
              Add to favourites
            </label>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!valid || saving} className="glass-button">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TodayPanel({
  onEditTargets,
}: {
  onEditTargets: () => void
}) {
  const {
    user,
    mealLogs,
    analyzeMealPhoto,
    suggestMeal,
    saveGeneratedRecipe,
    createMealLog,
    refreshLensData,
  } = useStore()
  const fileInput = useRef<HTMLInputElement>(null)
  const [portionContext, setPortionContext] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string>()
  const [editor, setEditor] = useState<{ input: MealLogInput; assumptions: string[] } | null>(null)
  const [suggestionOpen, setSuggestionOpen] = useState(false)
  const [suggestion, setSuggestion] = useState<GeneratedGymRecipe>()
  const [suggesting, setSuggesting] = useState(false)
  const [suggestionError, setSuggestionError] = useState<string>()
  const [suggestionMealType, setSuggestionMealType] = useState<GymMealType>(() => {
    const hour = new Date().getHours()
    if (hour < 11) return "breakfast"
    if (hour < 15) return "lunch"
    if (hour < 21) return "dinner"
    return "snack"
  })
  const [availableTime, setAvailableTime] = useState("30")
  const todayMeals = useMemo(() => mealLogs.filter((meal) => isToday(meal.eatenAt)), [mealLogs])
  const totals = todayMeals.reduce(
    (sum, meal) => ({
      calories: sum.calories + meal.nutritionalInfo.calories,
      protein: sum.protein + meal.nutritionalInfo.protein,
    }),
    { calories: 0, protein: 0 }
  )
  const calorieTarget = numberPreference(user?.preferences?.daily_calorie_target)
  const proteinTarget = numberPreference(user?.preferences?.daily_protein_target)

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setAnalyzing(true)
    setError(undefined)
    try {
      const jpeg = await prepareMealPhoto(file)
      const draft = await analyzeMealPhoto(jpeg, portionContext)
      setEditor({
        input: {
          title: draft.title,
          foods: draft.foods,
          nutritionalInfo: draft.nutritionalInfo,
          eatenAt: new Date().toISOString(),
          notes: undefined,
          favorite: false,
        },
        assumptions: draft.assumptions,
      })
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "The meal could not be analyzed.")
    } finally {
      setAnalyzing(false)
    }
  }

  const refresh = async () => {
    setRefreshing(true)
    setError(undefined)
    try {
      await refreshLensData()
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Today could not be refreshed.")
    } finally {
      setRefreshing(false)
    }
  }

  const generateSuggestion = async () => {
    setSuggesting(true)
    setSuggestionError(undefined)
    try {
      const recipe = await suggestMeal({
        mealType: suggestionMealType,
        availableTimeMinutes: Number(availableTime),
        remainingCalories: calorieTarget === undefined ? undefined : Math.max(calorieTarget - totals.calories, 0),
        remainingProtein: proteinTarget === undefined ? undefined : Math.max(proteinTarget - totals.protein, 0),
      })
      setSuggestion(recipe)
    } catch (suggestError) {
      setSuggestionError(suggestError instanceof Error ? suggestError.message : "A meal could not be suggested.")
    } finally {
      setSuggesting(false)
    }
  }

  const suggestionLogInput = (recipe: GeneratedGymRecipe): MealLogInput => ({
    title: recipe.title,
    foods: recipe.ingredients.map((ingredient) => ({
      name: ingredient.name,
      portion: `${ingredient.quantity} ${ingredient.unit}`.trim(),
    })),
    nutritionalInfo: recipe.nutritionalInfo,
    eatenAt: new Date().toISOString(),
    favorite: false,
  })

  return (
    <section className="flex flex-col gap-6" aria-labelledby="today-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-100/62">
            {new Intl.DateTimeFormat("en-GB", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}
          </p>
          <h2 id="today-title" className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">Today</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={refreshing} aria-label="Refresh Today">
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}

      <div className="lens-surface p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Daily progress</p>
            <p className="mt-1 text-sm text-white/70">{todayMeals.length} confirmed meal{todayMeals.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-cyan-100">
            <Target className="size-5" />
          </div>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <ProgressMetric label="Calories" value={totals.calories} target={calorieTarget} unit="kcal" tone="blue" />
          <ProgressMetric label="Protein" value={totals.protein} target={proteinTarget} unit="g" tone="emerald" />
        </div>
        {!calorieTarget || !proteinTarget ? (
          <Button variant="outline" onClick={onEditTargets} className="mt-6 w-full sm:w-auto">Set your targets</Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="lens-surface lens-scan-card flex min-h-[310px] flex-col justify-between gap-6 overflow-hidden p-5 md:p-7">
          <div className="relative z-10">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-blue-300/16 bg-blue-400/12 text-blue-100">
              <Camera className="size-5" />
            </div>
            <h3 className="mt-5 text-2xl font-semibold text-white">Log with Lens</h3>
          </div>
          <div className="relative z-10 flex flex-col gap-3">
            <Input
              placeholder="Optional portion context, e.g. 250g chicken"
              value={portionContext}
              onChange={(event) => setPortionContext(event.target.value)}
              maxLength={500}
            />
            <input ref={fileInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
            <Button className="glass-button min-h-12 w-full" onClick={() => fileInput.current?.click()} disabled={analyzing}>
              {analyzing ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              {analyzing ? "Analyzing your meal…" : "Take or choose a meal photo"}
            </Button>
            <p className="text-[11px] text-white/35">Photo discarded after analysis</p>
          </div>
        </div>

        <div className="lens-surface relative flex min-h-[310px] flex-col justify-between gap-6 overflow-hidden p-5 md:p-7">
          <div className="flex items-center justify-between">
            <div className="relative z-10 flex size-12 items-center justify-center rounded-2xl border border-emerald-300/16 bg-emerald-400/10 text-emerald-100">
              <WandSparkles className="size-5" />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-semibold text-white">Generate with AI</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-white/48">Get one practical idea from your Profile preferences and today’s progress.</p>
          </div>
          <Button variant="outline" className="relative z-10 min-h-12 w-full border-emerald-300/18 bg-emerald-400/8 text-emerald-50 hover:bg-emerald-400/14" onClick={() => {
            setSuggestionOpen(true)
            if (!suggestion) void generateSuggestion()
          }}>
            <WandSparkles className="size-4" />Pick a meal for me
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Today’s meals</h3>
          <Badge variant="secondary">{Math.round(totals.protein)}g protein</Badge>
        </div>
        {todayMeals.length ? todayMeals.map((meal) => (
          <div key={meal.id} className="lens-row grid gap-4 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-blue-100">
                {meal.favorite ? <Heart className="size-4 fill-rose-300 text-rose-300" /> : <Utensils className="size-4" />}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{meal.title}</p>
                <p className="mt-1 truncate text-xs text-white/42">{meal.foods.map((food) => food.name).join(" · ")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 pl-[52px] text-xs text-white/52 sm:pl-0">
              <span className="inline-flex items-center gap-1"><Flame className="size-3.5" />{Math.round(meal.nutritionalInfo.calories)} kcal</span>
              <span className="inline-flex items-center gap-1 text-emerald-200"><Dumbbell className="size-3.5" />{Math.round(meal.nutritionalInfo.protein)}g</span>
              <span>{new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(meal.eatenAt))}</span>
            </div>
          </div>
        )) : (
          <div className="lens-empty py-12 text-center">
            <Utensils className="mx-auto size-7 text-white/24" />
            <p className="mt-3 text-sm font-medium text-white/65">Nothing confirmed yet</p>
          </div>
        )}
      </div>

      <MealEditorDialog
        open={Boolean(editor)}
        onOpenChange={(open) => !open && setEditor(null)}
        initial={editor?.input || null}
        assumptions={editor?.assumptions}
        onSave={async (input) => { await createMealLog(input) }}
      />

      <Dialog open={suggestionOpen} onOpenChange={setSuggestionOpen}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pick a meal for me</DialogTitle>
            <DialogDescription>One practical idea based on your Profile preferences and today’s remaining targets.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs text-white/50">
              Meal type
              <Select value={suggestionMealType} onValueChange={(value) => setSuggestionMealType(value as GymMealType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MEAL_TYPES.map((type) => <SelectItem key={type} value={type}>{type[0].toUpperCase()}{type.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-white/50">
              Available time
              <Select value={availableTime} onValueChange={setAvailableTime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[15, 30, 45, 60].map((minutes) => <SelectItem key={minutes} value={String(minutes)}>{minutes} minutes</SelectItem>)}</SelectContent>
              </Select>
            </label>
          </div>
          {suggestionError ? <Alert variant="destructive"><AlertDescription>{suggestionError}</AlertDescription></Alert> : null}
          {suggesting ? (
            <div className="lens-empty flex min-h-64 flex-col items-center justify-center text-center">
              <Loader2 className="size-6 animate-spin text-cyan-100" />
              <p className="mt-3 text-sm text-white/52">Choosing one meal…</p>
            </div>
          ) : suggestion ? (
            <RecipeCard
              key={suggestion.title}
              recipe={suggestion}
              onSave={async () => {
                try { await saveGeneratedRecipe(suggestion) }
                catch (saveError) {
                  setSuggestionError(saveError instanceof Error ? saveError.message : "The recipe could not be saved.")
                  throw saveError
                }
              }}
            />
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={generateSuggestion} disabled={suggesting}>
              <RefreshCw className="size-4" />Try another
            </Button>
            <Button
              className="glass-button"
              disabled={!suggestion || suggesting}
              onClick={() => {
                if (!suggestion) return
                setEditor({ input: suggestionLogInput(suggestion), assumptions: [] })
                setSuggestionOpen(false)
              }}
            >
              <Utensils className="size-4" />Log when eaten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export function MealHistoryPanel() {
  const { mealLogs, createMealLog, updateMealLog, deleteMealLog } = useStore()
  const [filter, setFilter] = useState<"all" | "favorites">("all")
  const [query, setQuery] = useState("")
  const [editor, setEditor] = useState<{ id?: string; input: MealLogInput; repeat: boolean } | null>(null)
  const [deleting, setDeleting] = useState<MealLog | null>(null)
  const [error, setError] = useState<string>()
  const visibleMeals = mealLogs.filter((meal) => {
    const matchesFilter = filter === "all" || meal.favorite
    const terms = `${meal.title} ${meal.foods.map((food) => food.name).join(" ")}`.toLowerCase()
    return matchesFilter && terms.includes(query.trim().toLowerCase())
  })

  const toggleFavorite = async (meal: MealLog) => {
    setError(undefined)
    try {
      await updateMealLog(meal.id, { favorite: !meal.favorite })
    } catch (favoriteError) {
      setError(favoriteError instanceof Error ? favoriteError.message : "Favourite could not be updated.")
    }
  }

  return (
    <section className="flex flex-col gap-6" aria-labelledby="meals-title">
      <div>
        <h2 id="meals-title" className="text-3xl font-semibold tracking-tight text-white md:text-4xl">My Meals</h2>
      </div>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}

      <div className="lens-toolbar flex flex-col gap-3 p-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/32" />
          <Input className="border-0 bg-transparent pl-10 focus-visible:ring-0" placeholder="Search meal history" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.035] p-1">
          <Button size="sm" variant={filter === "all" ? "secondary" : "ghost"} onClick={() => setFilter("all")}><History className="size-3.5" />History</Button>
          <Button size="sm" variant={filter === "favorites" ? "secondary" : "ghost"} onClick={() => setFilter("favorites")}><Heart className="size-3.5" />Favourites</Button>
        </div>
      </div>

      {visibleMeals.length ? (
        <div className="flex flex-col gap-2">
          {visibleMeals.map((meal) => (
            <article key={meal.id} className="lens-row grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.035] text-white/45 transition-colors hover:text-rose-200"
                  onClick={() => toggleFavorite(meal)}
                  aria-label={meal.favorite ? `Remove ${meal.title} from favourites` : `Add ${meal.title} to favourites`}
                >
                  <Heart className={`size-4 ${meal.favorite ? "fill-rose-300 text-rose-300" : ""}`} />
                </button>
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{meal.title}</p>
                  <p className="mt-1 truncate text-xs text-white/40">{meal.foods.map((food) => `${food.name}${food.portion ? ` (${food.portion})` : ""}`).join(" · ")}</p>
                  <p className="mt-2 text-[11px] text-white/32">
                    {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(meal.eatenAt))}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <MacroStat label="kcal" value={meal.nutritionalInfo.calories} unit="" />
                <MacroStat label="protein" value={meal.nutritionalInfo.protein} unit="g" />
                <MacroStat label="carbs" value={meal.nutritionalInfo.carbs} unit="g" />
                <MacroStat label="fat" value={meal.nutritionalInfo.fat} unit="g" />
              </div>
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEditor({ id: meal.id, input: editorInput(meal), repeat: false })} aria-label={`Edit ${meal.title}`}><Edit3 className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setEditor({ input: editorInput(meal, new Date().toISOString()), repeat: true })} aria-label={`Log ${meal.title} again`}><RefreshCw className="size-4" /></Button>
                <Button variant="ghost" size="icon" className="hover:text-rose-300" onClick={() => setDeleting(meal)} aria-label={`Delete ${meal.title}`}><Trash2 className="size-4" /></Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="lens-empty py-16 text-center">
          <History className="mx-auto size-8 text-white/22" />
          <p className="mt-3 text-sm font-medium text-white/65">No matching meals</p>
        </div>
      )}

      <MealEditorDialog
        open={Boolean(editor)}
        onOpenChange={(open) => !open && setEditor(null)}
        initial={editor?.input || null}
        title={editor?.repeat ? "Log this meal again" : "Edit meal"}
        saveLabel={editor?.repeat ? "Log meal" : "Save changes"}
        onSave={async (input) => {
          if (editor?.id) await updateMealLog(editor.id, input)
          else await createMealLog(input)
        }}
      />

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete meal?</DialogTitle>
            <DialogDescription>{deleting ? `“${deleting.title}” will be permanently removed from your history.` : "This meal will be removed."}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (!deleting) return
              try {
                await deleteMealLog(deleting.id)
                setDeleting(null)
              } catch (deleteError) {
                setError(deleteError instanceof Error ? deleteError.message : "The meal could not be deleted.")
              }
            }}>Delete meal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function RecipeCard({ recipe, onSave }: { recipe: GeneratedGymRecipe; onSave: () => Promise<void> }) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  return (
    <article className="lens-surface overflow-hidden p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-emerald-300/16 bg-emerald-400/8 text-emerald-100">High protein</Badge>
            <span className="text-[11px] text-white/35">{recipe.prepTime + recipe.cookTime} min · {recipe.servings} serving{recipe.servings === 1 ? "" : "s"}</span>
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">{recipe.title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/48">{recipe.description}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Collapse recipe" : "Expand recipe"}>
          <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </Button>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-1.5">
        <MacroStat label="kcal" value={recipe.nutritionalInfo.calories} unit="" />
        <MacroStat label="protein" value={recipe.nutritionalInfo.protein} unit="g" />
        <MacroStat label="carbs" value={recipe.nutritionalInfo.carbs} unit="g" />
        <MacroStat label="fat" value={recipe.nutritionalInfo.fat} unit="g" />
      </div>
      {recipe.missingIngredients.length ? (
        <div className="mt-4 rounded-xl border border-amber-300/14 bg-amber-400/6 px-3 py-2 text-xs text-amber-100/75">
          Missing: {recipe.missingIngredients.join(", ")}
        </div>
      ) : null}
      {expanded ? (
        <div className="mt-5 grid gap-5 border-t border-white/8 pt-5 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/38">Ingredients</p>
            <ul className="mt-3 grid gap-2 text-sm text-white/60">
              {recipe.ingredients.map((ingredient) => (
                <li key={`${ingredient.name}-${ingredient.quantity}`} className="flex items-center gap-2">
                  <span className={`size-1.5 rounded-full ${ingredient.availableInPantry ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span>{ingredient.quantity} {ingredient.unit} {ingredient.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/38">Method</p>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-white/58">{recipe.instructions}</p>
          </div>
        </div>
      ) : null}
      <Button
        variant="outline"
        className="mt-5 w-full"
        disabled={saving || saved}
        onClick={async () => {
          setSaving(true)
          try {
            await onSave()
            setSaved(true)
          } catch {
            // The parent surface already renders the actionable API error.
          } finally {
            setSaving(false)
          }
        }}
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : <PackageOpen className="size-4" />}
        {saved ? "Saved to Recipes" : "Save recipe for later"}
      </Button>
    </article>
  )
}

export function PantryPanel({
  showHeading = true,
  onEditPreferences,
}: {
  showHeading?: boolean
  onEditPreferences?: () => void
}) {
  const {
    pantryIngredients,
    generatedRecipes,
    addPantryIngredient,
    deletePantryIngredient,
    generatePantryRecipes,
    saveGeneratedRecipe,
  } = useStore()
  const [ingredientName, setIngredientName] = useState("")
  const [goal, setGoal] = useState<FitnessGoal>("maintain")
  const [mealType, setMealType] = useState<GymMealType>("dinner")
  const [adding, setAdding] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string>()

  const addIngredient = async () => {
    const name = ingredientName.trim()
    if (!name) return
    setAdding(true)
    setError(undefined)
    try {
      await addPantryIngredient(name)
      setIngredientName("")
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "The ingredient could not be added.")
    } finally {
      setAdding(false)
    }
  }

  const generate = async () => {
    setGenerating(true)
    setError(undefined)
    try {
      await generatePantryRecipes(goal, mealType)
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Recipes could not be generated.")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <section className="flex flex-col gap-6" aria-labelledby={showHeading ? "pantry-title" : undefined} aria-label={showHeading ? undefined : "Ingredients and AI meal generation"}>
      {showHeading ? <div>
        <h2 id="pantry-title" className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Groceries</h2>
      </div> : null}
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_0.92fr]">
        <div className="lens-surface p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Ingredients on hand</h3>
            </div>
            <Badge variant="secondary">{pantryIngredients.length}</Badge>
          </div>
          <div className="mt-5 flex gap-2">
            <Input
              placeholder="Chicken, rice, spinach…"
              value={ingredientName}
              onChange={(event) => setIngredientName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addIngredient()}
              maxLength={120}
            />
            <Button className="glass-button" onClick={addIngredient} disabled={!ingredientName.trim() || adding}>
              {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
          <div className="mt-5 flex min-h-24 flex-wrap content-start gap-2">
            {pantryIngredients.length ? pantryIngredients.map((ingredient) => (
              <div key={ingredient.id} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/9 bg-white/[0.04] pl-3 pr-2 text-sm text-white/70">
                {ingredient.name}
                <button
                  className="flex size-6 items-center justify-center rounded-full text-white/32 transition-colors hover:bg-white/8 hover:text-white"
                  onClick={async () => {
                    try { await deletePantryIngredient(ingredient.id) }
                    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Ingredient could not be removed.") }
                  }}
                  aria-label={`Remove ${ingredient.name}`}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )) : (
              <div className="flex w-full flex-col items-center justify-center py-6 text-center">
                <PackageOpen className="size-6 text-white/20" />
                <p className="mt-2 text-xs text-white/38">Add ingredients to make ideas more useful.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lens-surface relative overflow-hidden p-5 md:p-6">
          <WandSparkles className="absolute -right-8 -top-8 size-32 text-blue-300/[0.035]" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-cyan-100"><WandSparkles className="size-4" /><h3 className="font-semibold">Generate gym meals</h3></div>
              {onEditPreferences ? (
                <Button variant="ghost" size="sm" onClick={onEditPreferences} className="text-white/70 hover:text-white">
                  <SlidersHorizontal className="size-3.5" />Preferences
                </Button>
              ) : null}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl border border-white/8 bg-white/[0.025] p-1">
              {GOALS.map((item) => (
                <button
                  key={item.value}
                  className={`rounded-xl px-2 py-2 text-center transition-colors ${goal === item.value ? "bg-white text-slate-950" : "text-white/50 hover:bg-white/5 hover:text-white"}`}
                  onClick={() => setGoal(item.value)}
                >
                  <span className="block text-xs font-semibold">{item.label}</span>
                  <span className={`mt-0.5 block text-[9px] ${goal === item.value ? "text-slate-500" : "text-white/28"}`}>{item.note}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-white/42">Meal type</span>
              <Select value={mealType} onValueChange={(value) => setMealType(value as GymMealType)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{MEAL_TYPES.map((type) => <SelectItem key={type} value={type}>{type[0].toUpperCase()}{type.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="glass-button mt-5 min-h-11 w-full" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
              {generating ? "Building three recipes…" : "Generate three recipes"}
            </Button>
          </div>
        </div>
      </div>

      {generatedRecipes.length ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <div><h3 className="text-lg font-semibold text-white">Fresh ideas</h3><p className="mt-1 text-xs text-white/38">Nutrition is estimated per serving.</p></div>
            <Badge variant="secondary">3 recipes</Badge>
          </div>
          <div className="grid gap-3 xl:grid-cols-3">
            {generatedRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.title}
                recipe={recipe}
                onSave={async () => {
                  try { await saveGeneratedRecipe(recipe) }
                  catch (saveError) {
                    setError(saveError instanceof Error ? saveError.message : "The recipe could not be saved.")
                    throw saveError
                  }
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function NutritionTargetsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, updateNutritionTargets, updateMealPreferences } = useStore()
  const [calories, setCalories] = useState("")
  const [protein, setProtein] = useState("")
  const [dietaryRequirements, setDietaryRequirements] = useState("")
  const [preferredCuisines, setPreferredCuisines] = useState("")
  const [dislikedIngredients, setDislikedIngredients] = useState("")
  const [maxPrepTime, setMaxPrepTime] = useState("")
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>("maintain")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!open) return
    const calorieTarget = numberPreference(user?.preferences?.daily_calorie_target)
    const proteinTarget = numberPreference(user?.preferences?.daily_protein_target)
    setCalories(calorieTarget ? String(Math.round(calorieTarget)) : "")
    setProtein(proteinTarget ? String(Math.round(proteinTarget)) : "")
    setDietaryRequirements((user?.dietary_restrictions || []).join(", "))
    setPreferredCuisines(Array.isArray(user?.preferences?.preferred_cuisines) ? (user.preferences.preferred_cuisines as string[]).join(", ") : "")
    setDislikedIngredients(Array.isArray(user?.preferences?.disliked_ingredients) ? (user.preferences.disliked_ingredients as string[]).join(", ") : "")
    const prepTime = numberPreference(user?.preferences?.max_prep_time_minutes)
    setMaxPrepTime(prepTime ? String(Math.round(prepTime)) : "")
    const savedGoal = user?.preferences?.fitness_goal
    setFitnessGoal(savedGoal === "cut" || savedGoal === "bulk" ? savedGoal : "maintain")
    setError(undefined)
  }, [open, user])

  const calorieValue = Number(calories)
  const proteinValue = Number(protein)
  const maxPrepTimeValue = maxPrepTime ? Number(maxPrepTime) : undefined
  const validTargets = calorieValue >= 500 && calorieValue <= 10_000 && proteinValue >= 10 && proteinValue <= 1_000
  const validPrepTime = maxPrepTimeValue === undefined || (maxPrepTimeValue >= 5 && maxPrepTimeValue <= 240)
  const valid = validTargets && validPrepTime
  const commaList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Profile & targets</DialogTitle>
          <DialogDescription>Use targets you selected yourself or with a qualified professional.</DialogDescription>
        </DialogHeader>
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        <div className="grid gap-4">
          <div className="lens-row px-4 py-3">
            <p className="text-sm font-medium text-white">{user?.full_name || user?.username}</p>
            <p className="mt-1 text-xs text-white/38">{user?.email}</p>
          </div>
          <label className="flex flex-col gap-1.5 text-xs text-white/50">
            Daily calorie target
            <div className="relative"><Input type="number" min="500" max="10000" value={calories} onChange={(event) => setCalories(event.target.value)} className="pr-14" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/32">kcal</span></div>
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-white/50">
            Daily protein target
            <div className="relative"><Input type="number" min="10" max="1000" value={protein} onChange={(event) => setProtein(event.target.value)} className="pr-10" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/32">g</span></div>
          </label>
          <div className="border-t border-white/8 pt-4">
            <p className="text-sm font-medium text-white">AI meal preferences</p>
          </div>
          <label className="flex flex-col gap-1.5 text-xs text-white/50">
            Default fitness goal
            <Select value={fitnessGoal} onValueChange={(value) => setFitnessGoal(value as FitnessGoal)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{GOALS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-white/50">
            Dietary requirements
            <Input placeholder="Vegetarian, gluten-free…" value={dietaryRequirements} onChange={(event) => setDietaryRequirements(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-white/50">
            Preferred cuisines
            <Input placeholder="Mexican, Thai…" value={preferredCuisines} onChange={(event) => setPreferredCuisines(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-white/50">
            Ingredients to avoid
            <Input placeholder="Mushrooms, olives…" value={dislikedIngredients} onChange={(event) => setDislikedIngredients(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-white/50">
            Maximum total time
            <div className="relative"><Input type="number" min="5" max="240" placeholder="No limit" value={maxPrepTime} onChange={(event) => setMaxPrepTime(event.target.value)} className="pr-14" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/32">min</span></div>
          </label>
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-xs leading-5 text-white/40">
            GymFuel tracks the targets you provide; its AI does not prescribe calorie or protein goals. Meal photos are processed transiently and aren’t stored.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="glass-button" disabled={!valid || saving} onClick={async () => {
            setSaving(true)
            setError(undefined)
            try {
              await updateNutritionTargets(calorieValue, proteinValue)
              await updateMealPreferences({
                dietaryRestrictions: commaList(dietaryRequirements),
                preferredCuisines: commaList(preferredCuisines),
                dislikedIngredients: commaList(dislikedIngredients),
                maxPrepTimeMinutes: maxPrepTimeValue,
                fitnessGoal,
              })
              onOpenChange(false)
            } catch (targetError) {
              setError(targetError instanceof Error ? targetError.message : "Targets could not be saved.")
            } finally {
              setSaving(false)
            }
          }}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Target className="size-4" />}Save profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
