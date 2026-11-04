"use client"

import Link from "next/link"
import { useDeferredValue, useState } from "react"
import { ChefHat, Clock, Plus, Search } from "lucide-react"
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

const sentence = (value: string) => value[0].toUpperCase() + value.slice(1)

/** Spaced dashes read as commas on screen; ranges such as 10-12 keep their hyphen. */
const readable = (text: string) =>
  text
    .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1-$2")
    .replace(/\s*[\u2014\u2013]\s*/g, ", ")
    .replace(/\s+\u00b7\s+/g, ", ")

export function RecipeGrid({ recipes }: { recipes: RecipeSummary[] }) {
  const [query, setQuery] = useState("")
  const term = useDeferredValue(query).trim().toLowerCase()
  const visible = recipes.filter((recipe) =>
    [recipe.title, recipe.description ?? "", ...recipe.tags].some((text) => text.toLowerCase().includes(term))
  )

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <InputGroup className="h-10 sm:max-w-md">
          <InputGroupInput placeholder="Search by name, description or tag" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search recipes" />
          <InputGroupAddon><Search /></InputGroupAddon>
        </InputGroup>
        {recipes.length > 0 && (
          <p className="rx hidden shrink-0 text-xs text-muted-foreground sm:block">{visible.length} recipes</p>
        )}
      </div>

      {visible.length ? (
        <ul className="grid grid-cols-[repeat(1,minmax(0,1fr))] gap-4 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(3,minmax(0,1fr))]">
          {visible.map((recipe, index) => (
            <li key={recipe.id}>
              <Link
                href={`/recipes/${recipe.id}`}
                className="surface group flex h-full flex-col overflow-hidden transition-transform duration-(--dur-micro) ease-(--ease-out) hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-offset-2"
              >
                <div className="relative aspect-[4/3] overflow-hidden border-b border-rule bg-paper-2">
                  {recipe.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote recipe photos of unknown size
                    <img
                      src={recipe.imageUrl}
                      alt=""
                      {...(index === 0 ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
                      className="size-full object-cover"
                    />
                  ) : (
                    <ChefHat className="absolute inset-0 m-auto size-10 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  <h2 className="display line-clamp-2 text-lg leading-snug">{recipe.title}</h2>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{readable(recipe.description || "No description yet.")}</p>
                  <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                    <p className="flex items-baseline gap-1.5">
                      <span className="figure text-[2.25rem] leading-none text-ink">{Math.round(recipe.protein ?? 0)}</span>
                      <span className="rx text-xs text-ink-2">g protein</span>
                    </p>
                    {recipe.calories ? <span className="rx text-xs text-ink-2">{Math.round(recipe.calories)} kcal</span> : null}
                  </div>
                  {(recipe.difficulty || recipe.minutes > 0) && (
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{recipe.difficulty ? sentence(recipe.difficulty) : ""}</span>
                      {recipe.minutes > 0 && (
                        <span className="rx inline-flex items-center gap-1">
                          <Clock className="size-3.5" aria-hidden="true" />
                          {recipe.minutes} min
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty className="tray">
          <EmptyHeader>
            <EmptyMedia variant="icon"><ChefHat /></EmptyMedia>
            <EmptyTitle>{recipes.length ? "No recipes match" : "No recipes yet"}</EmptyTitle>
            <EmptyDescription>
              {recipes.length ? "Try a different search." : "Add a meal you make often, or save one from the AI ideas on Groceries."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {recipes.length ? (
              <Button variant="outline" onClick={() => setQuery("")}>Clear search</Button>
            ) : (
              <Button asChild><Link href="/recipes/new"><Plus data-icon="inline-start" /> Create recipe</Link></Button>
            )}
          </EmptyContent>
        </Empty>
      )}
    </>
  )
}
