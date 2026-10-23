import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ChefHat, Clock, Users } from "lucide-react"
import { MacroGrid } from "@/components/meals/macros"
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
    <article className="mx-auto flex max-w-3xl flex-col gap-6">
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link href="/recipes"><ArrowLeft data-icon="inline-start" /> Recipes</Link>
      </Button>
      {recipe.imageUrl ? (
        <div className="relative aspect-[21/9] overflow-hidden rounded-3xl bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote recipe photos of unknown size */}
          <img src={recipe.imageUrl} alt={recipe.title} className="size-full object-cover" />
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-3xl bg-gradient-to-br from-accent to-muted">
          <ChefHat className="size-9 text-accent-foreground/50" />
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-1.5">
            {recipe.difficulty && <Badge variant="secondary" className="capitalize">{recipe.difficulty}</Badge>}
            {recipe.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{recipe.title}</h1>
          {recipe.description && <p className="mt-2 text-muted-foreground">{recipe.description}</p>}
          <p className="mt-3 flex gap-4 text-sm text-muted-foreground">
            {minutes > 0 && <span className="inline-flex items-center gap-1.5"><Clock className="size-4" />{minutes} min</span>}
            {recipe.servings && <span className="inline-flex items-center gap-1.5"><Users className="size-4" />{recipe.servings} serving{recipe.servings === 1 ? "" : "s"}</span>}
          </p>
        </div>
        <RecipeActions recipe={{ id: recipe.id, title: recipe.title, nutrition, ingredients: recipe.ingredients }} />
      </div>

      <section aria-label="Nutrition per serving">
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Per serving</p>
        <MacroGrid macros={nutrition} />
      </section>

      <div className="grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
        <section aria-labelledby="ingredients-title" className="rounded-2xl border bg-card p-5">
          <h2 id="ingredients-title" className="font-semibold">Ingredients</h2>
          {recipe.ingredients.length ? (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {recipe.ingredients.map((item, index) => (
                <li key={`${item.name}-${index}`} className="flex gap-2">
                  <span className="tabular min-w-14 text-muted-foreground">{[item.quantity, item.unit].filter(Boolean).join(" ")}</span>
                  <span>{item.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No ingredients listed.</p>
          )}
        </section>
        <section aria-labelledby="method-title" className="rounded-2xl border bg-card p-5">
          <h2 id="method-title" className="font-semibold">Method</h2>
          <p className="mt-3 text-sm leading-7 whitespace-pre-line text-muted-foreground">{recipe.instructions || "No method written yet."}</p>
        </section>
      </div>
    </article>
  )
}
