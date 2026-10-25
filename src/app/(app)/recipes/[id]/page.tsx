import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ChefHat, Clock, Users } from "lucide-react"
import { RecipeActions } from "@/components/recipes/recipe-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth/dal"
import { getRecipe } from "@/lib/data"

export const metadata: Metadata = { title: "Recipe" }
// Per-user page: renders on each request behind the loading skeleton (see (app)/layout.tsx).
export const instant = false

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  const [user, { id }] = await Promise.all([requireUser(), params])
  const recipe = await getRecipe(user, Number(id))
  if (!recipe) notFound()
  const nutrition = { calories: recipe.calories ?? 0, protein: recipe.protein ?? 0, carbs: recipe.carbs ?? 0, fat: recipe.fat ?? 0 }
  const minutes = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)

  return (
    <article className="mx-auto flex max-w-4xl flex-col gap-8">
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link href="/recipes"><ArrowLeft data-icon="inline-start" /> Recipes</Link>
      </Button>
      <div className="flex flex-col gap-5 border-b-3 border-foreground pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="display max-w-none text-4xl md:text-6xl">{recipe.title}</h1>
          {recipe.description && <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{recipe.description}</p>}
        </div>
        <RecipeActions recipe={{ id: recipe.id, title: recipe.title, nutrition, ingredients: recipe.ingredients }} />
      </div>

      <div className="cells grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {recipe.imageUrl ? (
          <div className="relative min-h-64 overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote recipe photos of unknown size */}
            <img src={recipe.imageUrl} alt={recipe.title} className="absolute inset-0 size-full object-cover" />
          </div>
        ) : (
          <div className="flex min-h-40 items-center justify-center bg-muted">
            <ChefHat className="size-10" aria-hidden="true" />
          </div>
        )}
        <section aria-label="Nutrition per serving" className="flex flex-col">
          <div className="bg-primary p-5 text-primary-foreground">
            <p className="figure-xl text-7xl">{Math.round(nutrition.protein)}g</p>
            <p className="mt-2 text-sm font-bold">protein per serving</p>
          </div>
          <dl className="grid grid-cols-3 border-t-3 border-foreground text-sm">
            {(
              [
                ["kcal", Math.round(nutrition.calories)],
                ["carbs", `${Math.round(nutrition.carbs)}g`],
                ["fat", `${Math.round(nutrition.fat)}g`],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex flex-col-reverse border-l border-foreground px-4 py-3 first:border-l-0">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="tabular text-2xl font-black">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 border-t border-foreground px-4 py-3 text-sm">
            {minutes > 0 && <span className="tabular inline-flex items-center gap-1.5"><Clock className="size-4" aria-hidden="true" />{minutes} min</span>}
            {recipe.servings && <span className="tabular inline-flex items-center gap-1.5"><Users className="size-4" aria-hidden="true" />{recipe.servings} serving{recipe.servings === 1 ? "" : "s"}</span>}
            {recipe.difficulty && <span className="capitalize">{recipe.difficulty}</span>}
          </div>
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-foreground px-4 py-3">
              {recipe.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
            </div>
          )}
        </section>
      </div>

      <div className="cells grid-cols-1 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section aria-labelledby="ingredients-title" className="bg-card p-5 md:p-6">
          <h2 id="ingredients-title" className="display text-2xl">Ingredients</h2>
          {recipe.ingredients.length ? (
            <ul className="mt-4 flex flex-col divide-y divide-foreground border-y border-foreground text-sm">
              {recipe.ingredients.map((item, index) => (
                <li key={`${item.name}-${index}`} className="flex gap-3 py-2">
                  <span className="tabular min-w-16 font-bold">{[item.quantity, item.unit].filter(Boolean).join(" ")}</span>
                  <span>{item.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No ingredients listed.</p>
          )}
        </section>
        <section aria-labelledby="method-title" className="bg-card p-5 md:p-6">
          <h2 id="method-title" className="display text-2xl">Method</h2>
          <p className="mt-4 max-w-prose leading-7 whitespace-pre-line">{recipe.instructions || "No method written yet."}</p>
        </section>
      </div>
    </article>
  )
}
