"use client"

import { useFormAction } from "@/hooks/use-form-action"
import { toast } from "sonner"
import { updateProfile, type ProfileFormState } from "@/app/actions/profile"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

type Defaults = Record<
  "fullName" | "dailyCalorieTarget" | "dailyProteinTarget" | "fitnessGoal" | "dietaryRestrictions" | "preferredCuisines" | "dislikedIngredients" | "maxPrepTimeMinutes",
  string
>

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
      <InputGroupAddon align="inline-end"><InputGroupText>{unit}</InputGroupText></InputGroupAddon>
    </InputGroup>
  )

  return (
    <form onSubmit={action} className="rounded-2xl border bg-card p-5 md:p-6">
      <FieldGroup>
        {state && !state.ok && (
          <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
        )}
        <Field>
          <FieldLabel htmlFor="fullName">Full name</FieldLabel>
          <Input id="fullName" name="fullName" maxLength={120} defaultValue={defaults.fullName} autoComplete="name" />
        </Field>

        <FieldSet>
          <FieldLegend>Daily targets</FieldLegend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={invalid("dailyCalorieTarget")}>
              <FieldLabel htmlFor="dailyCalorieTarget">Calories</FieldLabel>
              {unitInput("dailyCalorieTarget", "kcal", { min: 500, max: 10000, placeholder: "e.g. 2400" })}
              <FieldError>{errors.dailyCalorieTarget}</FieldError>
            </Field>
            <Field data-invalid={invalid("dailyProteinTarget")}>
              <FieldLabel htmlFor="dailyProteinTarget">Protein</FieldLabel>
              {unitInput("dailyProteinTarget", "g", { min: 10, max: 1000, placeholder: "e.g. 160" })}
              <FieldError>{errors.dailyProteinTarget}</FieldError>
            </Field>
          </div>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>AI meal preferences</FieldLegend>
          <FieldDescription>Used by “Pick a meal for me” and recipe generation.</FieldDescription>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Default goal</FieldLabel>
              <Select name="fitnessGoal" defaultValue={defaults.fitnessGoal}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cut">Cut — lighter meals</SelectItem>
                  <SelectItem value="maintain">Maintain — balanced</SelectItem>
                  <SelectItem value="bulk">Bulk — denser meals</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={invalid("maxPrepTimeMinutes")}>
              <FieldLabel htmlFor="maxPrepTimeMinutes">Max total time</FieldLabel>
              {unitInput("maxPrepTimeMinutes", "min", { min: 5, max: 240, placeholder: "No limit" })}
              <FieldError>{errors.maxPrepTimeMinutes}</FieldError>
            </Field>
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
        </FieldSet>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />} Save profile
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
