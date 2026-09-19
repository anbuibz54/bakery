'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireOwner } from '@/lib/auth/owner'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/server/logger'
import { advanceStatus, addNote, type OrderStatus } from '@/server/admin/orders'
import { CostingError, addComponent, recordPrice, removeComponent, setProductTimes } from '@/server/costing/ingredients'
import { saveSettings } from '@/server/costing/service'
import { BrandError, removeLogo, saveBrand, uploadLogo } from '@/server/brand/service'
import { importReceiptLines } from '@/server/costing/receipts'
import { ProductError, createFromRecipe, createProduct, deleteProduct, removeProductPhoto, saveOptions, setProductPhoto, updateProduct, type ProductInput } from '@/server/catalog/admin'
import { CategoryError, deleteCategory, saveCategory } from '@/server/catalog/categories'
import { ImageError } from '@/server/storage/public-images'
import { db } from '@/server/db'
import { benchmarks, competitorPrices, products } from '@/server/db/schema'
import { eq } from 'drizzle-orm'

export type AdminState = { ok?: string; error?: string } | null

/** Every action re-checks the owner: the proxy redirect is not a boundary. */
async function guard() {
  await requireOwner()
}

function fail(error: unknown, fallback: string): AdminState {
  if (error instanceof CostingError) return { error: error.message }
  log.error('admin action failed', { error })
  return { error: fallback }
}

const num = (form: FormData, key: string, fallback = 0) => {
  const raw = String(form.get(key) ?? '').replace(/[^\d.-]/g, '')
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export async function moveOrderAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    const orderId = String(form.get('orderId'))
    const status = String(form.get('status')) as OrderStatus
    await advanceStatus(orderId, status, String(form.get('message') ?? ''))
    revalidatePath('/quan-ly')
    revalidatePath('/quan-ly/me-nuong')
    return { ok: 'Đã cập nhật đơn.' }
  } catch (error) {
    return fail(error, 'Chưa cập nhật được đơn.')
  }
}

export async function noteOrderAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    const message = String(form.get('message') ?? '').trim()
    if (!message) return { error: 'Nhập vài chữ cho khách đọc.' }
    await addNote(String(form.get('orderId')), message, form.get('hidden') !== 'on')
    revalidatePath('/quan-ly')
    return { ok: 'Đã gửi tin cho khách.' }
  } catch (error) {
    return fail(error, 'Chưa gửi được tin.')
  }
}

export async function recordPriceAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    await recordPrice({
      ingredientId: String(form.get('ingredientId') ?? '') || undefined,
      name: String(form.get('name') ?? '') || undefined,
      // Only a new ingredient chooses its unit; an existing one keeps its own.
      unit: form.get('ingredientId') ? undefined : ((String(form.get('unit') ?? 'g') as 'g' | 'ml' | 'cai') || 'g'),
      isPackaging: form.get('isPackaging') === 'on',
      packQuantity: num(form, 'packQuantity'),
      packLabel: String(form.get('packLabel') ?? '') || undefined,
      priceVnd: Math.round(num(form, 'priceVnd')),
      supplier: String(form.get('supplier') ?? '') || undefined,
      boughtOn: String(form.get('boughtOn') ?? ''),
      source: 'hand',
    })
    revalidatePath('/quan-ly/nguyen-lieu')
    revalidatePath('/quan-ly/gia-von')
    return { ok: 'Đã lưu giá.' }
  } catch (error) {
    return fail(error, 'Chưa lưu được giá. Kiểm tra số lượng và giá nhé.')
  }
}

export async function addComponentAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    const kind = String(form.get('kind'))
    await addComponent({
      productId: String(form.get('productId')),
      optionId: String(form.get('optionId') ?? '') || null,
      label: String(form.get('label') ?? '') || undefined,
      recipeId: kind === 'recipe' ? String(form.get('recipeId')) : undefined,
      multiplier: kind === 'recipe' ? num(form, 'multiplier', 1) || 1 : 1,
      ingredientId: kind === 'ingredient' ? String(form.get('ingredientId')) : undefined,
      quantity: kind === 'ingredient' ? num(form, 'quantity') : undefined,
    })
    revalidatePath('/quan-ly/gia-von')
    return { ok: 'Đã thêm thành phần.' }
  } catch (error) {
    return fail(error, 'Chưa thêm được thành phần.')
  }
}

export async function removeComponentAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    await removeComponent(String(form.get('componentId')))
    revalidatePath('/quan-ly/gia-von')
    return { ok: 'Đã xoá.' }
  } catch (error) {
    return fail(error, 'Chưa xoá được.')
  }
}

export async function productTimesAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    await setProductTimes(String(form.get('productId')), num(form, 'labourMinutes'), num(form, 'ovenMinutes'))
    revalidatePath('/quan-ly/gia-von')
    return { ok: 'Đã lưu thời gian.' }
  } catch (error) {
    return fail(error, 'Chưa lưu được.')
  }
}

export async function setPriceAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    const priceVnd = Math.round(num(form, 'priceVnd'))
    if (priceVnd <= 0) return { error: 'Giá bán phải lớn hơn 0.' }
    await db.update(products).set({ basePriceVnd: priceVnd, updatedAt: new Date() }).where(eq(products.id, String(form.get('productId'))))
    revalidatePath('/quan-ly/gia-von')
    revalidatePath('/menu')
    return { ok: `Đã đổi giá bán thành ${priceVnd.toLocaleString('vi-VN')}đ.` }
  } catch (error) {
    return fail(error, 'Chưa đổi được giá.')
  }
}

export async function saveSettingsAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    await saveSettings({
      labourPerHourVnd: Math.round(num(form, 'labourPerHourVnd')),
      electricityPerKwhVnd: Math.round(num(form, 'electricityPerKwhVnd')),
      ovenKw: num(form, 'ovenKw'),
      paymentPlanMonthlyVnd: Math.round(num(form, 'paymentPlanMonthlyVnd')),
      deliverySubsidyVnd: Math.round(num(form, 'deliverySubsidyVnd')),
      targetIngredientPct: num(form, 'targetIngredientPct') / 100,
      targetMarginPct: num(form, 'targetMarginPct') / 100,
    })
    revalidatePath('/quan-ly', 'layout')
    return { ok: 'Đã lưu cách tính.' }
  } catch (error) {
    return fail(error, 'Chưa lưu được.')
  }
}

export async function saveBenchmarkAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    const metric = String(form.get('metric'))
    const values = {
      metric,
      label: String(form.get('label') ?? metric),
      lowValue: num(form, 'lowValue'),
      highValue: num(form, 'highValue'),
      source: String(form.get('source') ?? '') || null,
      checkedOn: String(form.get('checkedOn') ?? '') || null,
    }
    await db.insert(benchmarks).values(values).onConflictDoUpdate({ target: benchmarks.metric, set: values })
    revalidatePath('/quan-ly/so-lieu')
    return { ok: 'Đã lưu mốc so sánh.' }
  } catch (error) {
    return fail(error, 'Chưa lưu được mốc so sánh.')
  }
}

export async function addCompetitorPriceAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    await db.insert(competitorPrices).values({
      shopName: String(form.get('shopName') ?? '').trim(),
      category: String(form.get('category') ?? '').trim(),
      productLabel: String(form.get('productLabel') ?? '').trim(),
      sizeLabel: String(form.get('sizeLabel') ?? '') || null,
      priceVnd: Math.round(num(form, 'priceVnd')),
      url: String(form.get('url') ?? '') || null,
      checkedOn: String(form.get('checkedOn') ?? ''),
    })
    revalidatePath('/quan-ly/so-lieu')
    return { ok: 'Đã lưu giá tiệm khác.' }
  } catch (error) {
    return fail(error, 'Chưa lưu được. Cần tên tiệm, loại bánh, giá và ngày xem.')
  }
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/quan-ly', 'layout')
  redirect('/quan-ly/dang-nhap')
}

/* -------------------------------------------------------------------------- */
/* Brand                                                                       */
/* -------------------------------------------------------------------------- */

export async function saveBrandAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    const palette: Record<string, string> = {}
    for (const [key, value] of form.entries()) {
      if (key.startsWith('color_')) palette[key.slice(6)] = String(value)
    }
    await saveBrand({
      name: String(form.get('name') ?? ''),
      wordmark: String(form.get('wordmark') ?? '') || String(form.get('name') ?? '').toLowerCase(),
      tagline: String(form.get('tagline') ?? ''),
      palette,
      instagramUrl: String(form.get('instagramUrl') ?? ''),
      facebookUrl: String(form.get('facebookUrl') ?? ''),
      tiktokUrl: String(form.get('tiktokUrl') ?? ''),
    })
    revalidatePath('/', 'layout')
    return { ok: 'Đã lưu thương hiệu. Tải lại trang cửa hàng để xem.' }
  } catch (error) {
    if (error instanceof BrandError) return { error: error.message }
    return fail(error, 'Chưa lưu được thương hiệu.')
  }
}

export async function uploadLogoAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    const file = form.get('logo')
    if (!(file instanceof Blob) || file.size === 0) return { error: 'Chọn một file ảnh logo.' }
    await uploadLogo(file)
    revalidatePath('/', 'layout')
    return { ok: 'Đã đổi logo.' }
  } catch (error) {
    if (error instanceof BrandError) return { error: error.message }
    return fail(error, 'Chưa tải logo lên được.')
  }
}

export async function removeLogoAction(): Promise<AdminState> {
  await guard()
  try {
    await removeLogo()
    revalidatePath('/', 'layout')
    return { ok: 'Đã bỏ logo, cửa hàng dùng chữ.' }
  } catch (error) {
    return fail(error, 'Chưa bỏ được logo.')
  }
}

/* -------------------------------------------------------------------------- */
/* Receipt prices from the cookbook                                            */
/* -------------------------------------------------------------------------- */

export async function importReceiptPricesAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    const ids = form.getAll('lineId').map(String).filter(Boolean)
    if (ids.length === 0) return { error: 'Chọn ít nhất một dòng.' }
    const { imported, skipped } = await importReceiptLines(ids)
    revalidatePath('/quan-ly/nguyen-lieu')
    revalidatePath('/quan-ly/gia-von')
    return { ok: `Đã nhập ${imported} giá.${skipped.length ? ` Bỏ qua: ${skipped.join(', ')}.` : ''}` }
  } catch (error) {
    return fail(error, 'Chưa nhập được giá từ hóa đơn.')
  }
}

/* -------------------------------------------------------------------------- */
/* Products and categories                                                     */
/* -------------------------------------------------------------------------- */

function productFromForm(form: FormData): ProductInput {
  return {
    name: String(form.get('name') ?? ''),
    category: String(form.get('category') ?? ''),
    summary: String(form.get('summary') ?? ''),
    description: String(form.get('description') ?? ''),
    basePriceVnd: Math.round(num(form, 'basePriceVnd')),
    leadTimeHours: Math.round(num(form, 'leadTimeHours', 24)),
    takesDeposit: form.get('takesDeposit') === 'on',
    featured: form.get('featured') === 'on',
    soldOutNote: form.get('soldOut') === 'on' ? String(form.get('soldOutNote') ?? '').trim() || 'Tạm hết' : '',
    tone: String(form.get('tone') ?? '#fde3ec'),
    isActive: form.get('isActive') === 'on',
    position: Math.round(num(form, 'position', 0)),
    recipeId: String(form.get('recipeId') ?? '') || null,
  }
}

function productFail(error: unknown, fallback: string): AdminState {
  if (error instanceof ProductError || error instanceof CategoryError || error instanceof ImageError) return { error: error.message }
  return fail(error, fallback)
}

export async function createProductAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  let id: string
  try {
    id = await createProduct(productFromForm(form))
  } catch (error) {
    return productFail(error, 'Chưa tạo được bánh.')
  }
  revalidatePath('/', 'layout')
  redirect(`/quan-ly/san-pham/${id}?moi=1`)
}

export async function createFromRecipeAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  let id: string
  try {
    id = await createFromRecipe({
      recipeId: String(form.get('recipeId') ?? ''),
      category: String(form.get('category') ?? ''),
      basePriceVnd: Math.round(num(form, 'basePriceVnd')),
      takesDeposit: form.get('takesDeposit') === 'on',
    })
  } catch (error) {
    return productFail(error, 'Chưa tạo được bánh từ công thức.')
  }
  revalidatePath('/', 'layout')
  redirect(`/quan-ly/san-pham/${id}?moi=1`)
}

export async function updateProductAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    await updateProduct(String(form.get('productId')), productFromForm(form))
    revalidatePath('/', 'layout')
    return { ok: 'Đã lưu.' }
  } catch (error) {
    return productFail(error, 'Chưa lưu được.')
  }
}

export async function saveOptionsAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    await saveOptions(String(form.get('productId')), JSON.parse(String(form.get('options') ?? '[]')))
    revalidatePath('/', 'layout')
    return { ok: 'Đã lưu các lựa chọn.' }
  } catch (error) {
    return productFail(error, 'Chưa lưu được các lựa chọn.')
  }
}

export async function productPhotoAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    const file = form.get('photo')
    if (!(file instanceof Blob) || file.size === 0) return { error: 'Chọn một ảnh.' }
    await setProductPhoto(String(form.get('productId')), file)
    revalidatePath('/', 'layout')
    return { ok: 'Đã đổi ảnh.' }
  } catch (error) {
    return productFail(error, 'Chưa tải ảnh lên được.')
  }
}

export async function removeProductPhotoAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    await removeProductPhoto(String(form.get('productId')))
    revalidatePath('/', 'layout')
    return { ok: 'Đã bỏ ảnh.' }
  } catch (error) {
    return productFail(error, 'Chưa bỏ được ảnh.')
  }
}

export async function deleteProductAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    await deleteProduct(String(form.get('productId')))
  } catch (error) {
    return productFail(error, 'Chưa xoá được.')
  }
  revalidatePath('/', 'layout')
  redirect('/quan-ly/san-pham')
}

export async function saveCategoryAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    await saveCategory({
      slug: String(form.get('slug') ?? '') || undefined,
      title: String(form.get('title') ?? ''),
      chip: String(form.get('chip') ?? ''),
      note: String(form.get('note') ?? ''),
      icon: String(form.get('icon') ?? 'cake'),
      position: Math.round(num(form, 'position', 0)),
      isActive: form.get('isActive') === 'on',
    })
    revalidatePath('/', 'layout')
    return { ok: 'Đã lưu loại bánh.' }
  } catch (error) {
    return productFail(error, 'Chưa lưu được loại bánh.')
  }
}

export async function deleteCategoryAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  await guard()
  try {
    await deleteCategory(String(form.get('slug')))
    revalidatePath('/', 'layout')
    return { ok: 'Đã xoá loại bánh.' }
  } catch (error) {
    return productFail(error, 'Chưa xoá được.')
  }
}
