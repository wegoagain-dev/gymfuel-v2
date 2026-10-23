import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/app/page-header"
import { RecipeForm } from "@/components/recipes/recipe-form"
import { requireUser } from "@/lib/auth/dal"
import { getRecipe } from "@/lib/data"

export const metadata: Metadata = { title: "Edit recipe" }
// Per-user page: renders on each request behind the loading skeleton (see (app)/layout.tsx).
export const instant = false

export default async function EditRecipePage({ params }: PageProps<"/recipes/[id]/edit">) {
  const [user, { id }] = await Promise.all([requireUser(), params])
  const recipe = await getRecipe(user, Number(id))
  if (!recipe) notFound()
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title="Edit recipe" />
      <RecipeForm recipe={recipe} />
    </div>
  )
}
