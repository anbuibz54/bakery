'use client'

import { useActionState, useState } from 'react'
import { ActionResult, Field, SubmitButton, fieldClass } from '@/components/admin-ui'
import { PRINT, StampIcon } from '@/components/stamp-icon'
import { Card } from '@/components/ui'
import { BRAND_TOKENS, PRESETS, paletteStyle, readabilityChecks, type Palette } from '@/lib/brand'
import { removeLogoAction, saveBrandAction, uploadLogoAction, type AdminState } from '../../_actions'

type BrandValues = {
  name: string
  wordmark: string
  tagline: string
  palette: Palette
  logoUrl: string | null
  instagramUrl: string
  facebookUrl: string
  tiktokUrl: string
}

/**
 * Everything the owner can change about how the shop looks. The preview on the
 * right uses the same CSS variables the storefront does, so what you see is
 * what customers get. Colours that make buttons or text hard to read are
 * blocked on save (see readabilityChecks).
 */
export function BrandForm({ brand }: { brand: BrandValues }) {
  const [saveState, save] = useActionState<AdminState, FormData>(saveBrandAction, null)
  const [logoState, upload] = useActionState<AdminState, FormData>(uploadLogoAction, null)
  const [removeState, remove] = useActionState<AdminState, FormData>(removeLogoAction, null)

  const [v, setV] = useState({
    name: brand.name,
    wordmark: brand.wordmark,
    tagline: brand.tagline,
    instagramUrl: brand.instagramUrl,
    facebookUrl: brand.facebookUrl,
    tiktokUrl: brand.tiktokUrl,
  })
  const [palette, setPalette] = useState<Palette>(brand.palette)
  const checks = readabilityChecks(palette)
  const blocked = checks.some((c) => c.blocking && c.ratio < c.min)

  return (
    <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start">
      <div className="flex flex-col gap-4">
        {/* Name ------------------------------------------------------------ */}
        <form action={save} className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <b>Tên tiệm</b>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tên đầy đủ" hint="hiện ở tiêu đề trang, chân trang">
                <input name="name" required maxLength={60} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={fieldClass} />
              </Field>
              <Field label="Chữ trên logo" hint="cách tên hiện ở đầu trang, ví dụ viết thường">
                <input name="wordmark" maxLength={40} value={v.wordmark} onChange={(e) => setV({ ...v, wordmark: e.target.value })} className={fieldClass} />
              </Field>
            </div>
            <Field label="Một câu giới thiệu">
              <input name="tagline" maxLength={160} value={v.tagline} onChange={(e) => setV({ ...v, tagline: e.target.value })} className={fieldClass} />
            </Field>
          </Card>

          {/* Colours -------------------------------------------------------- */}
          <Card className="flex flex-col gap-3">
            <b>Bảng màu</b>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPalette(p.palette)}
                  className="flex items-center gap-2 rounded-full bg-background py-1.5 pr-3.5 pl-1.5 text-sm font-bold"
                >
                  <span className="flex">
                    {[p.palette.pink, p.palette.berry, p.palette.sky].map((c) => (
                      <span key={c} className="-mr-1.5 size-6 rounded-full border-2 border-white" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="ml-1.5">{p.name}</span>
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {BRAND_TOKENS.filter((t) => t.group === 'main').map((t) => (
                <ColorField key={t.key} token={t.key} label={t.label} value={palette[t.key]} onChange={(c) => setPalette({ ...palette, [t.key]: c })} />
              ))}
            </div>
            <details>
              <summary className="cursor-pointer text-sm font-bold">Màu phụ</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {BRAND_TOKENS.filter((t) => t.group === 'more').map((t) => (
                  <ColorField key={t.key} token={t.key} label={t.label} value={palette[t.key]} onChange={(c) => setPalette({ ...palette, [t.key]: c })} />
                ))}
              </div>
            </details>

            <ul className="flex flex-col gap-1 text-sm">
              {checks.map((c) => {
                const ok = c.ratio >= c.min
                return (
                  <li key={c.label} className="flex items-center justify-between gap-3">
                    <span>{c.label}</span>
                    <span className={`font-bold tabular-nums ${ok ? 'text-mint-ink' : c.blocking ? 'text-berry' : 'text-foreground/70'}`}>
                      {c.ratio.toFixed(1)} : 1 · {ok ? 'dễ đọc' : c.blocking ? 'khó đọc, chưa lưu được' : 'hơi nhạt'}
                    </span>
                  </li>
                )
              })}
            </ul>
          </Card>

          {/* Socials -------------------------------------------------------- */}
          <Card className="flex flex-col gap-3">
            <b>Mạng xã hội</b>
            <p className="-mt-2 text-[13px] text-muted">Để trống thì nút đó không hiện. Instagram DM: https://ig.me/m/tên · Messenger: https://m.me/tên</p>
            <Field label="Instagram">
              <input name="instagramUrl" maxLength={300} value={v.instagramUrl} onChange={(e) => setV({ ...v, instagramUrl: e.target.value })} className={fieldClass} placeholder="https://ig.me/m/…" />
            </Field>
            <Field label="Facebook / Messenger">
              <input name="facebookUrl" maxLength={300} value={v.facebookUrl} onChange={(e) => setV({ ...v, facebookUrl: e.target.value })} className={fieldClass} placeholder="https://m.me/…" />
            </Field>
            <Field label="TikTok">
              <input name="tiktokUrl" maxLength={300} value={v.tiktokUrl} onChange={(e) => setV({ ...v, tiktokUrl: e.target.value })} className={fieldClass} placeholder="https://www.tiktok.com/@…" />
            </Field>
          </Card>

          {BRAND_TOKENS.map((t) => (
            <input key={t.key} type="hidden" name={`color_${t.key}`} value={palette[t.key]} />
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton className={blocked ? 'pointer-events-none opacity-50' : ''}>Lưu thương hiệu</SubmitButton>
            <ActionResult state={saveState} />
          </div>
        </form>

        {/* Logo ------------------------------------------------------------ */}
        <Card className="flex flex-col gap-3">
          <b>Logo</b>
          <div className="flex items-center gap-4">
            <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl bg-background">
              {brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded logo from Storage
                <img src={brand.logoUrl} alt="Logo hiện tại" className="size-full object-contain" />
              ) : (
                <StampIcon name="cake" size={40} print={PRINT.pink} />
              )}
            </div>
            <p className="text-sm text-muted">
              {brand.logoUrl ? 'Logo đang dùng. Tải ảnh khác lên để thay.' : 'Chưa có logo — đầu trang đang dùng chữ.'} PNG, JPG hoặc WebP, tối đa 1 MB, nền trong suốt càng đẹp.
            </p>
          </div>
          <form action={upload} className="flex flex-wrap items-center gap-3">
            <input name="logo" type="file" accept="image/png,image/jpeg,image/webp" required className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-blush file:px-4 file:py-2 file:font-bold file:text-berry" />
            <SubmitButton pendingLabel="Đang tải lên…">Tải logo lên</SubmitButton>
          </form>
          <ActionResult state={logoState} />
          {brand.logoUrl && (
            <form action={remove}>
              <button type="submit" className="text-sm font-bold text-berry">
                Bỏ logo, dùng chữ
              </button>
              <ActionResult state={removeState} />
            </form>
          )}
        </Card>
      </div>

      {/* Preview ------------------------------------------------------------ */}
      <div className="lg:sticky lg:top-6">
        <p className="mb-2 text-[13px] font-bold text-muted">Xem trước</p>
        <div style={paletteStyle(palette) as React.CSSProperties} className="overflow-hidden rounded-3xl border border-line bg-background p-4 text-foreground">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-display text-xl font-bold text-berry">
              {brand.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- preview of the stored logo
                <img src={brand.logoUrl} alt="" className="size-8 rounded-lg object-contain" />
              )}
              {v.wordmark || v.name}
            </span>
            <span className="size-9 rounded-full bg-surface shadow-[var(--shadow-soft)]" />
          </div>
          <div className="mt-3 rounded-[26px] bg-pink p-5">
            <p className="font-display text-2xl leading-tight font-bold">Một chiếc bánh, một lời chúc đúng ngày.</p>
            <p className="mt-1 text-sm opacity-80">{v.tagline}</p>
            <span className="mt-3 inline-flex h-10 items-center rounded-full bg-berry px-5 text-sm font-bold text-white">Chọn bánh để tặng</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-soft)]">
              <StampIcon name="cake" size={32} print={PRINT.pink} />
              <p className="mt-1 text-sm font-bold">Kem dâu phô mai</p>
              <p className="text-xs text-muted">từ 320k</p>
            </div>
            <div className="rounded-2xl bg-sky p-3">
              <p className="text-sm font-bold">Đừng để lỡ ngày quan trọng</p>
              <p className="text-xs text-muted">Lưu sinh nhật, tiệm nhắn nhắc.</p>
            </div>
          </div>
          <p className="mt-3 rounded-2xl bg-blush px-3 py-2 text-sm font-bold text-berry">Cọc 350.000đ</p>
          <p className="mt-2 rounded-2xl bg-mint px-3 py-2 text-sm font-bold text-mint-ink">Tiệm đã nhận tiền</p>
        </div>
      </div>
    </div>
  )
}

function ColorField({ token, label, value, onChange }: { token: string; label: string; value: string; onChange: (hex: string) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-background p-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="size-10 flex-none cursor-pointer rounded-xl border-0 bg-transparent p-0"
        data-token={token}
      />
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-xs text-muted uppercase tabular-nums">{value}</span>
      </span>
    </label>
  )
}
