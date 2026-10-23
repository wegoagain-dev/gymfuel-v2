const MAX_BYTES = 5 * 1024 * 1024
const MAX_DIMENSION = 1600

function toJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The photo couldn't be converted"))), "image/jpeg", quality)
  )
}

/** Downscale to ≤1600 px and re-encode as JPEG (also strips EXIF/location data). */
export async function prepareMealPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image of your meal")
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("This image format isn't supported here — try a JPEG or PNG")
  })
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext("2d", { alpha: false })
  if (!context) throw new Error("The photo couldn't be prepared")
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  for (const quality of [0.84, 0.72, 0.58, 0.44]) {
    const jpeg = await toJpeg(canvas, quality)
    if (jpeg.size <= MAX_BYTES) return jpeg
  }
  throw new Error("That photo is still over 5 MB after compression")
}
