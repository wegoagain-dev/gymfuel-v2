"use server"

import { and, eq } from "drizzle-orm"
import { refresh } from "next/cache"
import { getDb } from "@/db"
import { groceryItems } from "@/db/schema"
import { requireUser } from "@/lib/auth/dal"
import { fieldErrors, firstError, groceryItemSchema } from "@/lib/validation"
import { fail, ok, type ActionResult } from "./result"

export type GroceryFormState = ActionResult | null

export async function saveGroceryItem(itemId: number | null, _prev: GroceryFormState, formData: FormData): Promise<GroceryFormState> {
  const user = await requireUser()
  const parsed = groceryItemSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return fail(firstError(parsed.error), fieldErrors(parsed.error))
  const db = await getDb()
  if (itemId) {
    const updated = await db
      .update(groceryItems)
      .set(parsed.data)
      .where(and(eq(groceryItems.id, itemId), eq(groceryItems.userId, user.id)))
      .returning({ id: groceryItems.id })
    if (!updated.length) return fail("Item not found")
  } else {
    await db.insert(groceryItems).values({ ...parsed.data, userId: user.id })
  }
  refresh()
  return ok(undefined, itemId ? "Item updated" : "Added to your list")
}

export async function setGroceryChecked(id: number, checked: boolean): Promise<ActionResult> {
  const user = await requireUser()
  const db = await getDb()
  await db.update(groceryItems).set({ checked }).where(and(eq(groceryItems.id, id), eq(groceryItems.userId, user.id)))
  refresh()
  return ok(undefined)
}

export async function deleteGroceryItem(id: number): Promise<ActionResult> {
  const user = await requireUser()
  const db = await getDb()
  const deleted = await db
    .delete(groceryItems)
    .where(and(eq(groceryItems.id, id), eq(groceryItems.userId, user.id)))
    .returning({ id: groceryItems.id })
  if (!deleted.length) return fail("Item not found")
  refresh()
  return ok(undefined, "Item removed")
}
