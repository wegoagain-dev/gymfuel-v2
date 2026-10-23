import { aiMode, AIError, analyzeMealPhoto } from "@/lib/ai"
import { getCurrentUser } from "@/lib/auth/dal"

const MAX_BYTES = 5 * 1024 * 1024

/**
 * POST multipart: photo (JPEG, ≤5 MB, already resized in the browser) + optional
 * portionContext. Returns an editable draft; nothing is saved and the photo is discarded.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Please sign in again" }, { status: 401 })

  const form = await request.formData().catch(() => null)
  const photo = form?.get("photo")
  const context = form?.get("portionContext")
  const portionContext = typeof context === "string" ? context.slice(0, 500) : null

  if (!(photo instanceof File)) {
    // Demo mode can work from the portion notes alone.
    if (aiMode() === "demo" && portionContext) return Response.json(await analyzeMealPhoto(Buffer.alloc(0), portionContext))
    return Response.json({ error: "Choose a meal photo" }, { status: 400 })
  }
  if (photo.size > MAX_BYTES) return Response.json({ error: "Meal photos must be 5 MB or smaller" }, { status: 413 })

  const bytes = Buffer.from(await photo.arrayBuffer())
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (!isJpeg) return Response.json({ error: "Only JPEG photos are supported" }, { status: 415 })

  try {
    return Response.json(await analyzeMealPhoto(bytes, portionContext))
  } catch (error) {
    const message = error instanceof AIError ? error.message : "The meal couldn't be analysed. Please try again."
    return Response.json({ error: message }, { status: 502 })
  }
}
