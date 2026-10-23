"use client"

import Link from "next/link"
import { useDeferredValue, useState } from "react"
import { ChefHat, Clock, Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"

type RecipeSummary = {
  id: number
  title: string
  description: string | null
  imageUrl: string | null
  difficulty: string | null
  tags: string[]
  protein: number | null
  calories: number | null
  minutes: number
}

export function RecipeGrid({ recipes }: { recipes: RecipeSummary[] }) {
  const [query, setQuery] = useState("")
  const term = useDeferredValue(query).trim().toLowerCase()
  const visible = recipes.filter((recipe) =>
    [recipe.title, recipe.description ?? "", ...recipe.tags].some((text) => text.toLowerCase().includes(term))
  )

  return (
    <>
      <InputGroup className="h-10 sm:max-w-md">
        <InputGroupInput placeholder="Search by name, description or tag" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search recipes" />
        <InputGroupAddon><Search /></InputGroupAddon>
      </InputGroup>

      {visible.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/recipes/${recipe.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-accent to-muted">
                  {recipe.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote recipe photos of unknown size
                    <img src={recipe.imageUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <ChefHat className="absolute inset-0 m-auto size-10 text-accent-foreground/40" />
                  )}
                  {recipe.difficulty && (
                    <Badge className="absolute top-3 left-3 bg-background/85 text-foreground capitalize backdrop-blur">{recipe.difficulty}</Badge>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="line-clamp-1 font-semibold">{recipe.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{recipe.description || "No description yet."}</p>
                  <div className="tabular mt-auto flex items-center gap-3 pt-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 font-semibold text-accent-foreground">
                      {Math.round(recipe.protein ?? 0)} g protein
                    </span>
                    {recipe.calories ? <span>{Math.round(recipe.calories)} kcal</span> : null}
                    {recipe.minutes ? (
                      <span className="ml-auto inline-flex items-center gap-1"><Clock className="size-3.5" />{recipe.minutes} min</span>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon"><ChefHat /></EmptyMedia>
            <EmptyTitle>{recipes.length ? "No recipes match" : "No recipes yet"}</EmptyTitle>
            <EmptyDescription>
              {recipes.length ? "Try a different search." : "Add a meal you make often, or save one from the AI ideas on Groceries."}
            </EmptyDescription>
          </EmptyHeader>
          {!recipes.length && (
            <EmptyContent>
              <Button asChild><Link href="/recipes/new"><Plus data-icon="inline-start" /> Create recipe</Link></Button>
            </EmptyContent>
          )}
        </Empty>
      )}
    </>
  )
}
