/**
 * Shrink a photo in the browser before upload: a phone photo is 3–5 MB, a
 * menu card needs ~1600 px. `from-image` applies the EXIF rotation so portrait
 * shots do not arrive sideways. Browser only.
 */
export async function shrinkPhoto(file: Blob, maxEdge = 1600, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Không xử lý được ảnh này.')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Không xử lý được ảnh này.')
  return blob
}
