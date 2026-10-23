"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { MoreHorizontal, Pencil, Trash2, Utensils } from "lucide-react"
import { toast } from "sonner"
import { deleteRecipe } from "@/app/actions/recipes"
import type { Macros } from "@/components/meals/macros"
import { MealEditorDialog, type MealEditorState } from "@/components/meals/meal-editor-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { RecipeIngredient } from "@/db/schema"

export function RecipeActions({ recipe }: { recipe: { id: number; title: string; nutrition: Macros; ingredients: RecipeIngredient[] } }) {
  const router = useRouter()
  const [editor, setEditor] = useState<MealEditorState>(null)
  const [confirm, setConfirm] = useState(false)
  const [pending, startTransition] = useTransition()

  const logIt = () =>
    setEditor({
      draft: {
        title: recipe.title,
        foods: recipe.ingredients.length
          ? recipe.ingredients.map((item) => ({ name: item.name, portion: [item.quantity, item.unit].filter(Boolean).join(" ") || null }))
          : [{ name: recipe.title }],
        nutrition: recipe.nutrition,
        eatenAt: new Date().toISOString(),
        favorite: false,
        sourceRecipeId: recipe.id,
      },
      mode: { kind: "create" },
      heading: "Log this recipe",
      saveLabel: "Log meal",
    })

  const remove = () =>
    startTransition(async () => {
      const result = await deleteRecipe(recipe.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Recipe deleted")
      router.push("/recipes")
    })

  return (
    <div className="flex shrink-0 gap-2">
      <Button onClick={logIt}><Utensils data-icon="inline-start" /> Log this meal</Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="More recipe actions"><MoreHorizontal /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild><Link href={`/recipes/${recipe.id}/edit`}><Pencil /> Edit</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}><Trash2 /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MealEditorDialog state={editor} onClose={() => setEditor(null)} />
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{recipe.title}”?</AlertDialogTitle>
            <AlertDialogDescription>Meals you logged from it stay in your history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove} disabled={pending}>Delete recipe</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
