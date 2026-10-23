import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { RecipeGrid } from "@/components/recipes/recipe-grid"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth/dal"
import { getRecipes } from "@/lib/data"

export const metadata: Metadata = { title: "Recipes" }
// Per-user page: renders on each request behind the loading skeleton (see (app)/layout.tsx).
export const instant = false

export default async function RecipesPage() {
  const user = await requireUser()
  const recipes = await getRecipes(user)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Recipes" description="Your go-to meals and the AI ideas you saved.">
        <Button asChild>
          <Link href="/recipes/new"><Plus data-icon="inline-start" /> Add recipe</Link>
        </Button>
      </PageHeader>
      <RecipeGrid
        recipes={recipes.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          imageUrl: r.imageUrl,
          difficulty: r.difficulty,
          tags: r.tags,
          protein: r.protein,
          calories: r.calories,
          minutes: (r.prepTime ?? 0) + (r.cookTime ?? 0),
        }))}
      />
    </div>
  )
}
