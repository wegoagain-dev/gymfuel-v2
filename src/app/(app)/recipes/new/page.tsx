import type { Metadata } from "next"
import { PageHeader } from "@/components/app/page-header"
import { RecipeForm } from "@/components/recipes/recipe-form"
import { requireUser } from "@/lib/auth/dal"

export const metadata: Metadata = { title: "New recipe" }
// Per-user page: renders on each request behind the loading skeleton (see (app)/layout.tsx).
export const instant = false

export default async function NewRecipePage() {
  await requireUser()
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title="New recipe" description="Add protein and tags now so search and logging work better later." />
      <RecipeForm />
    </div>
  )
}
