'use client'

import { cn } from '@/lib/utils'
import { useBrand } from './brand-context'
import { PRINT, StampIcon } from './stamp-icon'

const PRINTS = { instagram: PRINT.pink, facebook: PRINT.sky, tiktok: PRINT.lemon } as const

/**
 * How to reach the shop: whichever of Instagram, Facebook, TikTok the owner
 * filled in at /quan-ly/thuong-hieu. Replaces "Nhắn Zalo tiệm" everywhere.
 */
export function SocialLinks({ className, withAction = false }: { className?: string; withAction?: boolean }) {
  const { socials } = useBrand()
  if (socials.length === 0) return null
  return (
    <ul className={cn('flex flex-wrap justify-center gap-2', className)} aria-label="Nhắn tiệm qua">
      {socials.map((s) => (
        <li key={s.id}>
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 items-center gap-1.5 rounded-full bg-surface pr-4 pl-2.5 text-sm shadow-[var(--shadow-soft)] focus-visible:outline-2 focus-visible:outline-berry"
          >
            <StampIcon name={s.id} size={22} print={PRINTS[s.id]} />
            <span className="font-bold">{s.label}</span>
            {withAction && <span className="text-xs text-muted">{s.action}</span>}
          </a>
        </li>
      ))}
    </ul>
  )
}
