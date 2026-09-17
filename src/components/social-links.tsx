import { cn } from '@/lib/utils'
import { SOCIALS } from '@/lib/shop'
import { PRINT, StampIcon } from './stamp-icon'

const PRINTS = { instagram: PRINT.pink, facebook: PRINT.sky, tiktok: PRINT.lemon } as const

/**
 * How to reach the shop: Instagram, Facebook, TikTok (only those with a link). Replaces "Nhắn Zalo tiệm"
 * everywhere. Pills wrap, so three fit a phone width.
 */
export function SocialLinks({ className, withAction = false }: { className?: string; withAction?: boolean }) {
  return (
    <ul className={cn('flex flex-wrap justify-center gap-2', className)} aria-label="Nhắn tiệm qua">
      {SOCIALS.filter((s) => s.url).map((s) => {
        const body = (
          <>
            <StampIcon name={s.id} size={22} print={PRINTS[s.id]} />
            <span className="font-bold">{s.label}</span>
            {withAction && <span className="text-xs text-muted">{s.action}</span>}
          </>
        )
        const pill = 'flex h-10 items-center gap-1.5 rounded-full bg-surface pr-4 pl-2.5 text-sm shadow-[var(--shadow-soft)]'
        return (
          <li key={s.id}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className={`${pill} focus-visible:outline-2 focus-visible:outline-berry`}>
              {body}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
