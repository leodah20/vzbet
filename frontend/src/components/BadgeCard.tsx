import type { BadgeCategory, BadgeStatus } from '../lib/badges'

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  sequencia: 'Sequência de acertos',
  ranking: 'Ranking geral',
  participacao: 'Participação',
  multipla: 'Ousadia na múltipla',
}

const TIER_LABELS: Record<'bronze' | 'prata' | 'ouro', string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
}

const TIER_MEDAL_CLASSES: Record<'bronze' | 'prata' | 'ouro', string> = {
  bronze:
    'bg-gradient-to-br from-[#e8b989] via-[#c98a44] to-[#7a4a1f] border-[#5c3818] shadow-[0_3px_6px_rgba(90,54,20,0.55)]',
  prata:
    'bg-gradient-to-br from-[#f4f6f8] via-[#c7cdd4] to-[#7d8590] border-[#5c636b] shadow-[0_3px_6px_rgba(70,77,84,0.5)]',
  ouro:
    'bg-gradient-to-br from-[#fff6d6] via-[#f2c14e] to-[#a9791f] border-[#7a591a] shadow-[0_3px_8px_rgba(139,101,26,0.6)]',
}

const TIER_RIBBON_CLASSES: Record<'bronze' | 'prata' | 'ouro', string> = {
  bronze: 'bg-[#7a4a1f]',
  prata: 'bg-[#7d8590]',
  ouro: 'bg-[#a9791f]',
}

const RIBBON_CLIP_PATH = 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)'

function CategoryIcon({ category, className }: { category: BadgeCategory; className: string }) {
  const shared = {
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  }

  switch (category) {
    case 'ranking':
      return (
        <svg {...shared}>
          <path d="M8 21h8" />
          <path d="M12 17v4" />
          <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
          <path d="M17 5h3a2 2 0 0 1 0 4h-3" />
          <path d="M7 5H4a2 2 0 0 0 0 4h3" />
        </svg>
      )
    case 'sequencia':
      return (
        <svg {...shared}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      )
    case 'participacao':
      return (
        <svg {...shared}>
          <path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c2 0 4 1.5 6 1.5s3.5-1 5-1.5v11c-1.5.5-3 1.5-5 1.5-2 0-4-1.5-6-1.5a6 6 0 0 0-4 1.3" />
        </svg>
      )
    case 'multipla':
      return (
        <svg {...shared}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      )
  }
}

interface BadgeCardProps {
  status: BadgeStatus
  isNewlyUnlocked: boolean
}

export function BadgeCard({ status, isNewlyUnlocked }: BadgeCardProps) {
  const tier = status.tier as 'bronze' | 'prata' | 'ouro' | null
  const earned = tier !== null
  const medalClasses = earned ? TIER_MEDAL_CLASSES[tier] : 'bg-slate-200 border-slate-300'
  const ribbonClasses = earned ? TIER_RIBBON_CLASSES[tier] : 'bg-slate-300'
  const iconColor = earned ? 'text-white drop-shadow-sm' : 'text-slate-400'

  return (
    <div className="relative flex w-24 flex-col items-center gap-1 pt-1 text-center">
      {isNewlyUnlocked && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 12 }).map((_, index) => (
            <span
              key={index}
              className={`confetti-piece confetti-piece-${index % 3}`}
              style={{ left: `${(index * 37) % 100}%`, animationDelay: `${(index % 5) * 0.08}s` }}
            />
          ))}
        </div>
      )}

      <div className="relative flex h-16 w-16 items-center justify-center">
        <span
          aria-hidden="true"
          className={`absolute bottom-[-10px] left-1 h-6 w-3.5 -rotate-12 ${ribbonClasses}`}
          style={{ clipPath: RIBBON_CLIP_PATH }}
        />
        <span
          aria-hidden="true"
          className={`absolute bottom-[-10px] right-1 h-6 w-3.5 rotate-12 ${ribbonClasses}`}
          style={{ clipPath: RIBBON_CLIP_PATH }}
        />
        <div
          className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 ${medalClasses} ${
            isNewlyUnlocked ? 'animate-pulse' : ''
          }`}
        >
          <CategoryIcon category={status.category} className={`h-7 w-7 ${iconColor}`} />
        </div>
      </div>

      <p className="mt-2 text-xs font-medium text-brand-blue-dark">{CATEGORY_LABELS[status.category]}</p>
      <p className="text-[11px] text-slate-500">{earned ? TIER_LABELS[tier] : 'Não conquistado'}</p>
      {status.progressToNext && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-brand-blue"
            style={{
              width: `${Math.min(100, (status.progressToNext.current / status.progressToNext.target) * 100)}%`,
            }}
          />
        </div>
      )}
    </div>
  )
}
