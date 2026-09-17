'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { StampIcon, PRINT } from '@/components/stamp-icon'
import { formatVnd } from '@/lib/money'
import type { PaymentView } from '@/server/payments/service'

const POLL_MS = 3000

/** Seconds since epoch, ticking. Null on the server, so the countdown never mismatches hydration. */
function subscribeClock(onTick: () => void) {
  const timer = setInterval(onTick, 1000)
  return () => clearInterval(timer)
}
const clockNow = () => Math.floor(Date.now() / 1000) * 1000
const clockServer = () => null

function secured(status: PaymentView['paymentStatus']) {
  return status === 'deposit_paid' || status === 'paid'
}

/**
 * Shows the QR and flips to "đã nhận" by itself when SePay reports the money.
 * Polls while the tab is visible, and immediately when the customer comes back
 * from their banking app.
 */
export function PaymentLive({ token, initial, zaloUrl }: { token: string; initial: PaymentView; zaloUrl: string | null }) {
  const [view, setView] = useState(initial)
  const now = useSyncExternalStore(subscribeClock, clockNow, clockServer)
  const waiting = !view.cancelled && !secured(view.paymentStatus)

  useEffect(() => {
    if (!waiting) return
    let stopped = false
    const refresh = async () => {
      if (document.hidden) return
      try {
        const res = await fetch(`/api/don/${token}/payment`, { cache: 'no-store' })
        if (res.ok && !stopped) setView(await res.json())
      } catch {
        // Offline for a moment: the next tick tries again.
      }
    }
    const timer = setInterval(refresh, POLL_MS)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      stopped = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [token, waiting])

  const msLeft = view.paymentDueAt && now !== null ? new Date(view.paymentDueAt).getTime() - now : null
  const expired = msLeft !== null && msLeft <= 0 && view.paidVnd === 0

  return (
    <>
      <header className="flex items-center justify-center py-4">
        <h1 className="font-display text-lg font-bold">
          {secured(view.paymentStatus) ? 'Đã nhận tiền' : view.isDeposit ? 'Thanh toán cọc' : 'Thanh toán'}
        </h1>
      </header>

      {view.cancelled ? (
        <Notice icon="calendar" title="Đơn này đã huỷ" zaloUrl={zaloUrl}>
          Nếu bạn đã chuyển khoản, tiệm sẽ liên hệ để hoàn tiền.
        </Notice>
      ) : secured(view.paymentStatus) ? (
        <Paid view={view} />
      ) : expired ? (
        <Notice icon="calendar" title="Hết giờ giữ lịch nướng" zaloUrl={zaloUrl}>
          Đơn {view.code} chưa nhận được cọc trong 15 phút. Nhắn Zalo tiệm để giữ lại lịch nhé.
        </Notice>
      ) : (
        <Waiting view={view} msLeft={msLeft} zaloUrl={zaloUrl} />
      )}
    </>
  )
}

function Waiting({ view, msLeft, zaloUrl }: { view: PaymentView; msLeft: number | null; zaloUrl: string | null }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="text-center">
        <p className="text-[13px] text-muted">
          Đơn {view.code}
          {view.paymentDueAt && ' · giữ lịch nướng trong'}
        </p>
        {view.paymentDueAt && (
          <p className="font-display text-[34px] leading-tight font-bold text-berry tabular-nums" aria-live="off">
            {msLeft === null ? '--:--' : countdown(msLeft)}
          </p>
        )}
      </div>

      {view.paymentStatus === 'underpaid' && (
        <p className="rounded-2xl bg-lemon px-4 py-3 text-sm">
          Tiệm đã nhận {formatVnd(view.paidVnd)}, còn thiếu <b>{formatVnd(view.dueNowVnd)}</b>. Quét lại mã bên dưới để chuyển nốt.
        </p>
      )}

      <section className="flex flex-col items-center gap-3 rounded-3xl bg-surface p-4 shadow-[var(--shadow-soft)]">
        <p className="text-[13px] text-muted">Quét bằng app ngân hàng bất kỳ</p>
        {view.qrUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- generated per order by SePay
          <img
            src={view.qrUrl}
            alt={`Mã VietQR chuyển ${formatVnd(view.dueNowVnd)}, nội dung ${view.code}`}
            width={220}
            height={220}
            className="size-[220px] rounded-2xl bg-background object-contain p-2"
          />
        )}
        <p className="font-display text-[28px] font-bold tabular-nums">{formatVnd(view.dueNowVnd)}</p>
        <dl className="flex w-full flex-col gap-2 text-sm">
          <Row label="Ngân hàng" value={view.bank} />
          {view.accountName && <Row label="Chủ tài khoản" value={view.accountName} />}
          <Row label="Số tài khoản" value={view.accountNumber} copy />
          <Row label="Số tiền" value={String(view.dueNowVnd)} display={formatVnd(view.dueNowVnd)} copy />
          <Row label="Nội dung" value={view.code} copy highlight />
        </dl>
      </section>

      <section className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-3 rounded-[22px] bg-surface px-4 py-3.5 shadow-[var(--shadow-soft)]">
        <StampIcon name="phone" size={34} print={PRINT.sky} className="animate-pulse motion-reduce:animate-none" />
        <div>
          <p className="font-bold">Đang chờ tiền về…</p>
          <p className="text-[13px] text-muted">
            Chuyển xong, trang này tự đổi sang &quot;đã nhận&quot;. Không cần chụp màn hình gửi tiệm.
          </p>
        </div>
      </section>

      <p className="text-center text-[13px] text-muted">
        Chuyển thiếu hoặc lỡ ghi sai nội dung?{' '}
        {zaloUrl ? (
          <a href={zaloUrl} className="font-bold text-berry">
            Nhắn Zalo tiệm
          </a>
        ) : (
          <span className="font-bold text-berry">Nhắn Zalo tiệm</span>
        )}
      </p>
    </div>
  )
}

function Paid({ view }: { view: PaymentView }) {
  const full = view.paymentStatus === 'paid'
  return (
    <section className="flex flex-col items-center gap-3 rounded-3xl bg-surface px-5 py-8 text-center shadow-[var(--shadow-soft)]">
      <StampIcon name="check" size={64} print={PRINT.mint} />
      <p className="font-display text-2xl font-bold">Tiệm đã nhận {formatVnd(view.paidVnd)}</p>
      <p className="text-muted">
        {full
          ? `Đơn ${view.code} đã thanh toán đủ. Tiệm bắt đầu chuẩn bị bánh cho bạn.`
          : `Lịch nướng cho đơn ${view.code} đã được giữ.`}
      </p>
      {!full && (
        <p className="w-full rounded-2xl bg-blush px-4 py-3 text-sm">
          Còn <b>{formatVnd(view.remainingVnd)}</b> trả khi nhận bánh.
        </p>
      )}
    </section>
  )
}

function Notice({ icon, title, children, zaloUrl }: { icon: 'calendar'; title: string; children: React.ReactNode; zaloUrl: string | null }) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-3xl bg-surface px-5 py-8 text-center shadow-[var(--shadow-soft)]">
      <StampIcon name={icon} size={56} print={PRINT.lemon} />
      <p className="font-display text-xl font-bold">{title}</p>
      <p className="text-muted">{children}</p>
      {zaloUrl && (
        <a href={zaloUrl} className="mt-1 rounded-full bg-berry px-6 py-3 font-bold text-white">
          Nhắn Zalo tiệm
        </a>
      )}
    </section>
  )
}

function Row({ label, value, display, copy, highlight }: { label: string; value: string; display?: string; copy?: boolean; highlight?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className={`flex items-center justify-between gap-3 rounded-[14px] px-3.5 py-2.5 ${highlight ? 'bg-blush' : 'bg-background'}`}>
      <dt className="text-muted">{label}</dt>
      <dd className={`flex items-center gap-2 font-bold ${highlight ? 'text-berry' : ''}`}>
        <span className="tabular-nums">{display ?? value}</span>
        {copy && (
          <button
            type="button"
            className="-m-2 rounded-lg p-2 text-berry focus-visible:outline-2 focus-visible:outline-berry"
            aria-label={`Chép ${label.toLowerCase()}`}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(value)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              } catch {
                // Clipboard blocked: the value is on screen to type.
              }
            }}
          >
            {copied ? (
              <span className="text-xs">Đã chép</span>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="8" y="8" width="12" height="12" rx="2" />
                <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
              </svg>
            )}
          </button>
        )}
      </dd>
    </div>
  )
}

function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
