"use server"

import { eq } from "drizzle-orm"
import { refresh } from "next/cache"
import { getDb } from "@/db"
import { users } from "@/db/schema"
import { requireUser } from "@/lib/auth/dal"
import { commaList, fieldErrors, firstError, profileSchema } from "@/lib/validation"
import { fail, ok, type ActionResult } from "./result"

export type ProfileFormState = ActionResult | null

export async function updateProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser()
  const parsed = profileSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return fail(firstError(parsed.error), fieldErrors(parsed.error))
  const { fullName, ...prefs } = parsed.data

  const db = await getDb()
  await db
    .update(users)
    .set({
      fullName,
      dietaryRestrictions: commaList(formData.get("dietaryRestrictions")),
      preferences: {
        ...prefs,
        preferredCuisines: commaList(formData.get("preferredCuisines"), 12),
        dislikedIngredients: commaList(formData.get("dislikedIngredients")),
      },
    })
    .where(eq(users.id, user.id))
  refresh()
  return ok(undefined, "Profile saved")
}
