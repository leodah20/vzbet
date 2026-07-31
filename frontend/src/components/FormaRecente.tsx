import type { FormResult } from '../lib/teamStats'

interface FormaRecenteProps {
  results: FormResult[]
}

const dotClasses: Record<FormResult, string> = {
  V: 'bg-brand-blue text-white',
  E: 'bg-white text-brand-blue border border-brand-blue',
  D: 'bg-slate-200 text-slate-500',
}

export function FormaRecente({ results }: FormaRecenteProps) {
  if (results.length === 0) return null
  return (
    <div className="flex gap-1.5" aria-label="Forma recente">
      {results.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${dotClasses[result]}`}
        >
          {result}
        </span>
      ))}
    </div>
  )
}
