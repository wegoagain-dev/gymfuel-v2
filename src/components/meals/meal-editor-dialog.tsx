"use client"

import { useState, useTransition } from "react"
import { Plus, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
import { createMealLog, updateMealLog } from "@/app/actions/meals"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { MacroGrid, type Macros } from "./macros"

export type MealDraft = {
  title: string
  foods: { name: string; portion?: string | null }[]
  nutrition: Macros
  eatenAt: string // ISO
  notes?: string | null
  favorite: boolean
  sourceRecipeId?: number | null
}

export type MealEditorState = {
  draft: MealDraft
  mode: { kind: "create" } | { kind: "update"; id: number }
  heading?: string
  saveLabel?: string
  assumptions?: string[]
  estimate?: boolean
} | null

/** ISO → value for <input type="datetime-local"> in the browser's zone. */
function toLocalInput(iso: string) {
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

const MACRO_FIELDS = [
  ["calories", "Calories", "kcal"],
  ["protein", "Protein", "g"],
  ["carbs", "Carbs", "g"],
  ["fat", "Fat", "g"],
] as const

/** Review/edit a meal before it's saved. Nothing counts towards totals until "Save". */
export function MealEditorDialog({ state, onClose }: { state: MealEditorState; onClose: () => void }) {
  const [draft, setDraft] = useState<MealDraft | null>(state?.draft ?? null)
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  // Start from a fresh copy whenever a different meal is opened.
  const [openedState, setOpenedState] = useState(state)
  if (state !== openedState) {
    setOpenedState(state)
    if (state) {
      setDraft({ ...state.draft, foods: state.draft.foods.map((food) => ({ ...food })), nutrition: { ...state.draft.nutrition } })
      setError(undefined)
    }
  }

  const valid = Boolean(draft?.title.trim() && draft.foods.length && draft.foods.every((food) => food.name.trim()))

  const save = () => {
    if (!draft || !state || !valid) return
    setError(undefined)
    startTransition(async () => {
      const input = { ...draft, notes: draft.notes || null }
      const result = state.mode.kind === "update" ? await updateMealLog(state.mode.id, input) : await createMealLog(input)
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast.success(result.message ?? "Saved")
      onClose()
    })
  }

  const setFood = (index: number, patch: Partial<MealDraft["foods"][number]>) =>
    draft && setDraft({ ...draft, foods: draft.foods.map((food, i) => (i === index ? { ...food, ...patch } : food)) })

  return (
    <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="display text-xl">{state?.heading ?? "Confirm meal"}</DialogTitle>
          <DialogDescription>Nothing affects your totals until you save.</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {draft && (
          <FieldGroup className="gap-0 divide-y divide-rule">
            <section aria-label="Estimate" className="flex flex-col gap-3 pb-5">
              <MacroGrid macros={draft.nutrition} />
              {state?.estimate && (
                <div className="flex flex-col gap-2">
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>AI estimate. Check the foods and amounts before you save.</span>
                  </p>
                  {state.assumptions?.length ? (
                    <ul className="flex list-disc flex-col gap-1 pl-6 text-sm text-muted-foreground">
                      {state.assumptions.map((assumption) => (
                        <li key={assumption}>{assumption}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </section>

            <section aria-label="Meal details" className="grid gap-4 pt-5 pb-5 sm:grid-cols-[minmax(0,1fr)_220px]">
              <Field>
                <FieldLabel htmlFor="meal-title">Meal</FieldLabel>
                <Input id="meal-title" placeholder="What did you eat?" value={draft.title} maxLength={200} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="meal-time">Eaten at</FieldLabel>
                <Input
                  id="meal-time"
                  type="datetime-local"
                  className="rx"
                  value={toLocalInput(draft.eatenAt)}
                  onChange={(event) => {
                    const date = new Date(event.target.value)
                    if (!Number.isNaN(date.getTime())) setDraft({ ...draft, eatenAt: date.toISOString() })
                  }}
                />
              </Field>
            </section>

            <section aria-label="Foods" className="flex flex-col gap-3 pt-5 pb-5">
              <div className="flex items-center justify-between gap-2">
                <FieldLabel>Foods</FieldLabel>
                <Button type="button" variant="ghost" size="sm" className="-mr-2" onClick={() => setDraft({ ...draft, foods: [...draft.foods, { name: "", portion: "" }] })}>
                  <Plus data-icon="inline-start" /> Add food
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {draft.foods.map((food, index) => (
                  <div key={index} className="grid grid-cols-[minmax(0,1fr)_5.5rem_2.5rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_2.5rem]">
                    <Input aria-label={`Food ${index + 1}`} placeholder="Food" value={food.name} onChange={(event) => setFood(index, { name: event.target.value })} />
                    <Input aria-label={`Portion ${index + 1}`} placeholder="Portion" className="rx" value={food.portion ?? ""} onChange={(event) => setFood(index, { portion: event.target.value })} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-ink-2"
                      disabled={draft.foods.length === 1}
                      onClick={() => setDraft({ ...draft, foods: draft.foods.filter((_, i) => i !== index) })}
                      aria-label={`Remove food ${index + 1}`}
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <section aria-label="Macros" className="flex flex-col gap-3 pt-5 pb-5">
              <div className="flex flex-col gap-1">
                <FieldLabel>Macros</FieldLabel>
                <p className="text-xs text-muted-foreground">Adjust the numbers and the estimate above follows.</p>
              </div>
              <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 sm:grid-cols-[repeat(4,minmax(0,1fr))]">
                {MACRO_FIELDS.map(([key, label, unit]) => (
                  <Field key={key}>
                    <FieldLabel htmlFor={`macro-${key}`} className="text-xs text-muted-foreground">{label}</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id={`macro-${key}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="1"
                        className="rx"
                        value={draft.nutrition[key]}
                        onChange={(event) =>
                          setDraft({ ...draft, nutrition: { ...draft.nutrition, [key]: Math.max(0, Number(event.target.value) || 0) } })
                        }
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText className="rx">{unit}</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>
                ))}
              </div>
            </section>

            <section aria-label="Notes" className="flex flex-col gap-4 pt-5">
              <Field>
                <FieldLabel htmlFor="meal-notes">Notes</FieldLabel>
                <Textarea id="meal-notes" placeholder="Optional" maxLength={2000} value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
              </Field>
              <Field orientation="horizontal">
                <Checkbox id="meal-favorite" checked={draft.favorite} onCheckedChange={(checked) => setDraft({ ...draft, favorite: checked === true })} />
                <FieldLabel htmlFor="meal-favorite" className="font-normal">Add to favourites</FieldLabel>
              </Field>
            </section>
          </FieldGroup>
        )}

        <DialogFooter className="sticky bottom-0 z-10">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!valid || pending} className="sm:min-w-36">
            {pending && <Spinner data-icon="inline-start" />}
            {state?.saveLabel ?? "Save meal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
