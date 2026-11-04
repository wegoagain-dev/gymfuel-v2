import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ChefHat, Clock, Users } from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { RecipeActions } from "@/components/recipes/recipe-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth/dal"
import { getRecipe } from "@/lib/data"

export const metadata: Metadata = { title: "Recipe" }
// Per-user page: renders on each request behind the loading skeleton (see (app)/layout.tsx).
export const instant = false

/** Spaced dashes read as commas on screen; ranges such as 10-12 keep their hyphen. */
const readable = (text: string) =>
  text
    .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1-$2")
    .replace(/\s*[\u2014\u2013]\s*/g, ", ")
    .replace(/\s+\u00b7\s+/g, ", ")

/**
 * Numbered steps: line breaks the author wrote win; a single paragraph is split on sentence ends.
 * Any "1." the author typed is dropped so we never number twice.
 */
function toSteps(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean)
  const steps = lines.length > 1 ? lines : lines.flatMap((line) => line.split(/(?<=[.!?])\s+/))
  return steps.map((step) => step.trim()).filter(Boolean)
}

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  const [user, { id }] = await Promise.all([requireUser(), params])
  const recipe = await getRecipe(user, Number(id))
  if (!recipe) notFound()
  const nutrition = { calories: recipe.calories ?? 0, protein: recipe.protein ?? 0, carbs: recipe.carbs ?? 0, fat: recipe.fat ?? 0 }
  const minutes = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)
  const steps = recipe.instructions ? toSteps(readable(recipe.instructions)) : []

  return (
    <article className="flex flex-col gap-6 md:gap-8">
      <Button variant="ghost" size="sm" className="min-h-10 self-start focus-visible:outline-offset-2" asChild>
        <Link href="/recipes"><ArrowLeft data-icon="inline-start" /> Recipes</Link>
      </Button>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
        {recipe.imageUrl ? (
          <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] bg-paper-2 lg:aspect-[4/3]">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote recipe photos of unknown size */}
            <img src={recipe.imageUrl} alt={recipe.title} fetchPriority="high" className="size-full object-cover" />
          </div>
        ) : (
          <div className="flex h-28 items-center justify-center rounded-[14px] bg-paper-2 lg:aspect-[4/3] lg:h-auto">
            <ChefHat className="size-9 text-muted-foreground" aria-hidden="true" />
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-5">
          <PageHeader title={recipe.title} description={recipe.description ? readable(recipe.description) : undefined} />
          <RecipeActions recipe={{ id: recipe.id, title: recipe.title, nutrition, ingredients: recipe.ingredients }} />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {minutes > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden="true" />
                <span className="rx">{minutes} min</span>
              </span>
            )}
            {recipe.servings && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-4" aria-hidden="true" />
                <span className="rx">{recipe.servings} serving{recipe.servings === 1 ? "" : "s"}</span>
              </span>
            )}
            {recipe.difficulty && <span className="capitalize">{recipe.difficulty}</span>}
            {recipe.tags.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {recipe.tags.map((tag) => <li key={tag}><Badge variant="outline">{tag}</Badge></li>)}
              </ul>
            )}
          </div>

          <section aria-labelledby="per-serving-title" className="flex flex-col gap-2.5">
            <h2 id="per-serving-title" className="display text-xl">Per serving</h2>
            <dl className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2">
              <div className="plastic plastic--thu col-span-3 flex flex-col-reverse gap-1 p-4">
                <dt className="text-sm text-ink-2">protein</dt>
                <dd className="flex items-baseline gap-1.5 text-ink">
                  <span className="figure text-[3rem]">{Math.round(nutrition.protein)}</span>
                  <span className="rx text-sm text-ink-2">g</span>
                </dd>
              </div>
              {([
                ["kcal", nutrition.calories, "", "plastic--tue"],
                ["carbs", nutrition.carbs, "\u00a0g", "plastic--fri"],
                ["fat", nutrition.fat, "\u00a0g", "plastic--sun"],
              ] as const).map(([label, value, unit, tint]) => (
                <div key={label} className={`plastic ${tint} flex flex-col-reverse gap-0.5 rounded-[10px] px-3 py-2.5`}>
                  <dt className="text-xs text-ink-2">{label}</dt>
                  <dd className="rx text-base font-medium text-ink">{Math.round(value).toLocaleString("en-GB")}{unit}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
        <section aria-labelledby="ingredients-title" className="tray p-4 md:p-5">
          <h2 id="ingredients-title" className="display text-xl">Ingredients</h2>
          {recipe.ingredients.length ? (
            <ul className="mt-3 flex flex-col divide-y divide-rule">
              {recipe.ingredients.map((item, index) => (
                <li key={`${item.name}-${index}`} className="flex items-baseline gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                  <span className="rx min-w-16 shrink-0 whitespace-nowrap text-xs text-ink-2">{[item.quantity, item.unit].filter(Boolean).join(" ")}</span>
                  <span className="min-w-0 text-ink">{item.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No ingredients listed.</p>
          )}
        </section>

        <section aria-labelledby="method-title" className="tray p-4 md:p-5">
          <h2 id="method-title" className="display text-xl">Method</h2>
          {steps.length ? (
            <ol className="mt-3 flex flex-col divide-y divide-rule">
              {steps.map((step, index) => (
                <li key={`${index}-${step.slice(0, 12)}`} className="flex gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                  <span className="rx shrink-0 pt-0.5 text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 leading-relaxed text-ink-2">{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No method written yet.</p>
          )}
        </section>
      </div>
    </article>
  )
}
