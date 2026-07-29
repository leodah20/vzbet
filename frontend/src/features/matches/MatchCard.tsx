import { useState } from 'react'
import type { Match, Prediction } from '../../types/api'

interface MatchCardProps {
  match: Match
  homeTeamName: string
  awayTeamName: string
  existingPrediction: Prediction | undefined
  onSubmit: (predictedHome: number, predictedAway: number) => void
  isSubmitting: boolean
}

export function MatchCard({
  match,
  homeTeamName,
  awayTeamName,
  existingPrediction,
  onSubmit,
  isSubmitting,
}: MatchCardProps) {
  const [predictedHome, setPredictedHome] = useState(existingPrediction?.predictedHome ?? 0)
  const [predictedAway, setPredictedAway] = useState(existingPrediction?.predictedAway ?? 0)
  const deadlinePassed = new Date(match.kickoffAt).getTime() <= Date.now()

  return (
    <li className="rounded-lg border border-brand-blue/20 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{new Date(match.kickoffAt).toLocaleString('pt-BR')}</span>
        {deadlinePassed && <span className="font-semibold text-red-600">Prazo encerrado</span>}
      </div>
      <div className="mt-2 flex items-center justify-center gap-3">
        <span className="font-medium text-brand-blue-dark">{homeTeamName}</span>
        <input
          aria-label={`Placar de ${homeTeamName}`}
          type="number"
          min={0}
          value={predictedHome}
          disabled={deadlinePassed}
          onChange={(event) => setPredictedHome(Number(event.target.value))}
          className="w-14 rounded border border-slate-300 text-center"
        />
        <span>x</span>
        <input
          aria-label={`Placar de ${awayTeamName}`}
          type="number"
          min={0}
          value={predictedAway}
          disabled={deadlinePassed}
          onChange={(event) => setPredictedAway(Number(event.target.value))}
          className="w-14 rounded border border-slate-300 text-center"
        />
        <span className="font-medium text-brand-blue-dark">{awayTeamName}</span>
      </div>
      <button
        type="button"
        disabled={deadlinePassed || isSubmitting}
        onClick={() => onSubmit(predictedHome, predictedAway)}
        className="mt-3 w-full rounded bg-brand-blue py-1.5 text-white disabled:opacity-50"
      >
        {existingPrediction ? 'Atualizar palpite' : 'Enviar palpite'}
      </button>
    </li>
  )
}
