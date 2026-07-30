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

const TIER_COLORS: Record<'bronze' | 'prata' | 'ouro', string> = {
  bronze: 'bg-brand-blue text-white',
  prata: 'bg-brand-blue-dark text-white',
  ouro: 'bg-amber-400 text-brand-blue-dark',
}

interface BadgeCardProps {
  status: BadgeStatus
  isNewlyUnlocked: boolean
}

export function BadgeCard({ status, isNewlyUnlocked }: BadgeCardProps) {
  const earned = status.tier !== null
  const circleClasses = earned
    ? `${TIER_COLORS[status.tier as 'bronze' | 'prata' | 'ouro']} ${isNewlyUnlocked ? 'animate-pulse' : ''}`
    : 'bg-slate-200 text-slate-400'

  return (
    <div className="relative flex w-24 flex-col items-center gap-1 text-center">
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
      <div className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold ${circleClasses}`}>
        {earned ? '★' : '?'}
      </div>
      <p className="text-xs font-medium text-brand-blue-dark">{CATEGORY_LABELS[status.category]}</p>
      <p className="text-[11px] text-slate-500">
        {earned ? TIER_LABELS[status.tier as 'bronze' | 'prata' | 'ouro'] : 'Não conquistado'}
      </p>
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
