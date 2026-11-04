"use client"

import { useFormAction } from "@/hooks/use-form-action"
import { toast } from "sonner"
import { updateProfile, type ProfileFormState } from "@/app/actions/profile"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type Defaults = Record<
  "fullName" | "dailyCalorieTarget" | "dailyProteinTarget" | "fitnessGoal" | "dietaryRestrictions" | "preferredCuisines" | "dislikedIngredients" | "maxPrepTimeMinutes",
  string
>

const GOALS = [
  { value: "cut", label: "Cut", hint: "Lighter meals" },
  { value: "maintain", label: "Maintain", hint: "Balanced" },
  { value: "bulk", label: "Bulk", hint: "Denser meals" },
] as const

export function ProfileForm({ defaults }: { defaults: Defaults }) {
  // The page remounts this form after a save, so toast from the action rather than an effect.
  const [state, action, pending] = useFormAction<ProfileFormState>(async (prev, data) => {
    const result = await updateProfile(prev, data)
    if (result?.ok) toast.success(result.message ?? "Saved")
    return result
  }, null)
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  const invalid = (name: string) => Boolean(errors[name]) || undefined

  const unitInput = (name: keyof Defaults, unit: string, props: React.ComponentProps<"input">) => (
    <InputGroup>
      <InputGroupInput id={name} name={name} type="number" inputMode="numeric" defaultValue={defaults[name]} aria-invalid={invalid(name)} {...props} />
      <InputGroupAddon align="inline-end"><InputGroupText className="rx">{unit}</InputGroupText></InputGroupAddon>
    </InputGroup>
  )

  return (
    <form onSubmit={action} className="flex flex-col gap-6">
      <FieldGroup>
        {state && !state.ok && (
          <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
        )}

        <section aria-labelledby="targets-title" className="flex flex-col gap-3">
          <h2 id="targets-title" className="display text-xl">Daily targets</h2>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
            <TargetCompartment
              name="dailyProteinTarget"
              label="Protein"
              unit="g"
              tint="plastic--thu"
              min={10}
              max={1000}
              placeholder="160"
              defaultValue={defaults.dailyProteinTarget}
              invalid={invalid("dailyProteinTarget")}
              error={errors.dailyProteinTarget}
            />
            <TargetCompartment
              name="dailyCalorieTarget"
              label="Calories"
              unit="kcal"
              tint="plastic--tue"
              min={500}
              max={10000}
              placeholder="2400"
              defaultValue={defaults.dailyCalorieTarget}
              invalid={invalid("dailyCalorieTarget")}
              error={errors.dailyCalorieTarget}
            />
          </div>
        </section>

        <div className="tray flex flex-col gap-5 p-4 sm:p-5">
          <div className="flex flex-col gap-1">
            <h2 className="display text-xl">About you</h2>
            <p className="text-sm text-muted-foreground">Your name and the goal your meals are sized for.</p>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
            <Field>
              <FieldLabel htmlFor="fullName">Full name</FieldLabel>
              <Input id="fullName" name="fullName" maxLength={120} defaultValue={defaults.fullName} autoComplete="name" />
            </Field>
            <Field data-invalid={invalid("maxPrepTimeMinutes")}>
              <FieldLabel htmlFor="maxPrepTimeMinutes">Max total time</FieldLabel>
              {unitInput("maxPrepTimeMinutes", "min", { min: 5, max: 240, placeholder: "No limit" })}
              <FieldError>{errors.maxPrepTimeMinutes}</FieldError>
            </Field>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Goal</legend>
            <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2">
              {GOALS.map((goal) => (
                <label
                  key={goal.value}
                  className="group/key relative flex min-h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg moulded bg-card px-2 py-2 text-center transition-colors duration-(--dur-micro) ease-(--ease-out) hover:bg-paper-2 has-[:checked]:bg-signal-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                >
                  <input
                    type="radio"
                    name="fitnessGoal"
                    value={goal.value}
                    defaultChecked={defaults.fitnessGoal === goal.value}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">{goal.label}</span>
                  <span className="hidden text-xs text-muted-foreground sm:block">{goal.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="tray flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-1">
            <h2 className="display text-xl">Meal preferences</h2>
            <p className="text-sm text-muted-foreground">Used by “Pick a meal for me” and recipe generation.</p>
          </div>
          <Field>
            <FieldLabel htmlFor="dietaryRestrictions">Dietary requirements</FieldLabel>
            <Input id="dietaryRestrictions" name="dietaryRestrictions" placeholder="Vegetarian, gluten-free…" defaultValue={defaults.dietaryRestrictions} />
          </Field>
          <Field>
            <FieldLabel htmlFor="preferredCuisines">Preferred cuisines</FieldLabel>
            <Input id="preferredCuisines" name="preferredCuisines" placeholder="Mexican, Thai…" defaultValue={defaults.preferredCuisines} />
          </Field>
          <Field>
            <FieldLabel htmlFor="dislikedIngredients">Ingredients to avoid</FieldLabel>
            <Input id="dislikedIngredients" name="dislikedIngredients" placeholder="Mushrooms, olives…" defaultValue={defaults.dislikedIngredients} />
            <FieldDescription>Separate items with commas.</FieldDescription>
          </Field>
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />} Save profile
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

function TargetCompartment({
  name,
  label,
  unit,
  tint,
  min,
  max,
  placeholder,
  defaultValue,
  invalid,
  error,
}: {
  name: string
  label: string
  unit: string
  tint: string
  min: number
  max: number
  placeholder: string
  defaultValue: string
  invalid?: boolean
  error?: string
}) {
  return (
    <div className={cn("plastic flex min-w-0 flex-col gap-2.5 p-4 sm:p-5", tint)}>
      <label htmlFor={name} className="text-sm font-medium text-ink">{label}</label>
      <div className="flex items-baseline gap-2">
        <Input
          id={name}
          name={name}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          placeholder={placeholder}
          defaultValue={defaultValue}
          aria-invalid={invalid}
          className="rx h-14 min-w-0 rounded-[10px] border-input bg-surface px-3 text-2xl text-ink md:text-2xl placeholder:text-lg placeholder:text-muted-foreground [appearance:textfield] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-signal [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="rx shrink-0 pb-1 text-sm text-ink-2">{unit}</span>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      ) : (
        <p className="text-xs text-ink-2">Leave blank for no target.</p>
      )}
    </div>
  )
}
