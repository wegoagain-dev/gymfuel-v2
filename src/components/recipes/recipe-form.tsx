"use client"

import { useFormAction } from "@/hooks/use-form-action"
import Link from "next/link"
import { saveRecipe, type RecipeFormState } from "@/app/actions/recipes"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { Recipe } from "@/db/schema"

const num = (value: number | null | undefined) => (value == null ? "" : String(value))

export function RecipeForm({ recipe }: { recipe?: Recipe }) {
  const [state, action, pending] = useFormAction<RecipeFormState>(saveRecipe.bind(null, recipe?.id ?? null), null)
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  const invalid = (name: string) => Boolean(errors[name]) || undefined

  return (
    <form onSubmit={action} className="flex flex-col gap-4">
      <FieldGroup>
        {state && !state.ok && (
          <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
        )}

        <section className="tray flex flex-col gap-4 p-4 md:p-5">
          <h2 className="display text-xl">The basics</h2>
          <Field data-invalid={invalid("title")}>
            <FieldLabel htmlFor="title">Name</FieldLabel>
            <Input id="title" name="title" required maxLength={200} placeholder="e.g. Chicken & rice" defaultValue={recipe?.title} aria-invalid={invalid("title")} />
            <FieldError>{errors.title}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea id="description" name="description" rows={2} maxLength={1000} placeholder="Optional" defaultValue={recipe?.description ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor="tagsText">Tags</FieldLabel>
            <Input id="tagsText" name="tagsText" placeholder="lunch, bulk, quick" defaultValue={recipe?.tags.join(", ")} />
            <FieldDescription>Comma-separated. Tags help search and make logging easier later.</FieldDescription>
          </Field>
        </section>

        <section className="tray flex flex-col gap-4 p-4 md:p-5">
          <div className="flex flex-col gap-1">
            <h2 className="display text-xl">Nutrition per serving</h2>
            <p className="text-sm text-muted-foreground">Used for your daily targets and for search.</p>
          </div>
          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 sm:grid-cols-[repeat(4,minmax(0,1fr))]">
            {(
              [
                ["protein", "Protein", "g", recipe?.protein],
                ["calories", "Calories", "kcal", recipe?.calories],
                ["carbs", "Carbs", "g", recipe?.carbs],
                ["fat", "Fat", "g", recipe?.fat],
              ] as const
            ).map(([name, label, unit, value]) => (
              <Field key={name} data-invalid={invalid(name)}>
                <FieldLabel htmlFor={name}>{label}</FieldLabel>
                <InputGroup>
                  <InputGroupInput id={name} name={name} type="number" inputMode="decimal" min={0} step="any" defaultValue={num(value)} />
                  <InputGroupAddon align="inline-end"><InputGroupText className="rx">{unit}</InputGroupText></InputGroupAddon>
                </InputGroup>
              </Field>
            ))}
          </div>
        </section>

        <section className="tray flex flex-col gap-4 p-4 md:p-5">
          <h2 className="display text-xl">Time and servings</h2>
          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 sm:grid-cols-[repeat(4,minmax(0,1fr))]">
            <Field>
              <FieldLabel htmlFor="prepTime">Prep (min)</FieldLabel>
              <Input id="prepTime" name="prepTime" type="number" min={0} defaultValue={num(recipe?.prepTime)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="cookTime">Cook (min)</FieldLabel>
              <Input id="cookTime" name="cookTime" type="number" min={0} defaultValue={num(recipe?.cookTime)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="servings">Servings</FieldLabel>
              <Input id="servings" name="servings" type="number" min={1} defaultValue={num(recipe?.servings ?? 1)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="difficulty">Difficulty</FieldLabel>
              <Select name="difficulty" defaultValue={recipe?.difficulty ?? "easy"}>
                <SelectTrigger id="difficulty" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </section>

        <section className="tray flex flex-col gap-4 p-4 md:p-5">
          <h2 className="display text-xl">Ingredients and method</h2>
          <Field>
            <FieldLabel htmlFor="ingredientsText">Ingredients</FieldLabel>
            <Textarea
              id="ingredientsText"
              name="ingredientsText"
              rows={4}
              placeholder={"200 g chicken breast\n1 cup rice\n1 tbsp olive oil"}
              defaultValue={recipe?.ingredients.map((item) => [item.quantity, item.unit, item.name].filter(Boolean).join(" ")).join("\n")}
            />
            <FieldDescription>One per line. Start with an amount if you like.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="instructions">Method</FieldLabel>
            <Textarea id="instructions" name="instructions" rows={4} placeholder="Optional" defaultValue={recipe?.instructions ?? ""} />
            <FieldDescription>One step per line if you want them numbered on the recipe.</FieldDescription>
          </Field>
        </section>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" asChild>
            <Link href={recipe ? `/recipes/${recipe.id}` : "/recipes"}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />} {recipe ? "Save changes" : "Create recipe"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
