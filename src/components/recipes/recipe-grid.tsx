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
        <ul className="cells grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((recipe) => (
            <li key={recipe.id} className="flex">
              <Link
                href={`/recipes/${recipe.id}`}
                className="group flex w-full flex-col bg-card focus-visible:outline-offset-[-5px]"
              >
                <div className="relative aspect-[16/9] overflow-hidden border-b-3 border-foreground bg-muted">
                  {recipe.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote recipe photos of unknown size
                    <img src={recipe.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
                  ) : (
                    <ChefHat className="absolute inset-0 m-auto size-10" aria-hidden="true" />
                  )}
                  {recipe.difficulty && (
                    <Badge variant="secondary" className="absolute top-0 left-0 h-7 border-0 border-r border-b border-foreground px-2.5 capitalize">{recipe.difficulty}</Badge>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-4 group-hover:bg-accent group-hover:text-accent-foreground group-active:bg-primary group-active:text-primary-foreground">
                  <h2 className="line-clamp-1 text-lg font-black">{recipe.title}</h2>
                  <p className="line-clamp-2 text-sm">{recipe.description || "No description yet."}</p>
                  <div className="mt-auto flex items-end gap-4 pt-4 text-sm">
                    <p className="flex items-baseline gap-1.5">
                      <span className="figure-xl text-4xl">{Math.round(recipe.protein ?? 0)}g</span>
                      <span className="font-bold">protein</span>
                    </p>
                    {recipe.calories ? <span className="tabular">{Math.round(recipe.calories)} kcal</span> : null}
                    {recipe.minutes ? (
                      <span className="tabular ml-auto inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{recipe.minutes} min</span>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty className="box bg-muted">
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
