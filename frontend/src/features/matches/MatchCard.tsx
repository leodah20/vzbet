import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TeamCrest } from '../../components/TeamCrest'
import type { Match, PredictedOutcome, Prediction } from '../../types/api'

interface MatchCardProps {
  match: Match
  homeTeamName: string
  awayTeamName: string
  existingPrediction: Prediction | undefined
  onSubmit: (predictedOutcome: PredictedOutcome, predictedHome: number | null, predictedAway: number | null) => void
  isSubmitting: boolean
}

function outcomeFromScore(home: number, away: number): PredictedOutcome {
  if (home > away) return 'CASA'
  if (home < away) return 'FORA'
  return 'EMPATE'
}

export function MatchCard({
  match,
  homeTeamName,
  awayTeamName,
  existingPrediction,
  onSubmit,
  isSubmitting,
}: MatchCardProps) {
  const [outcome, setOutcome] = useState<PredictedOutcome | null>(existingPrediction?.predictedOutcome ?? null)
  const [showScore, setShowScore] = useState(
    existingPrediction?.predictedHome !== null && existingPrediction?.predictedHome !== undefined,
  )
  const [predictedHome, setPredictedHome] = useState(existingPrediction?.predictedHome ?? 0)
  const [predictedAway, setPredictedAway] = useState(existingPrediction?.predictedAway ?? 0)
  const deadlinePassed = new Date(match.kickoffAt).getTime() <= Date.now()

  function handleScoreChange(home: number, away: number) {
    setPredictedHome(home)
    setPredictedAway(away)
    setOutcome(outcomeFromScore(home, away))
  }

  function handleSubmit() {
    if (outcome === null) return
    onSubmit(outcome, showScore ? predictedHome : null, showScore ? predictedAway : null)
  }

  return (
    <li className="rounded-lg border border-brand-blue/20 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{new Date(match.kickoffAt).toLocaleString('pt-BR')}</span>
        {deadlinePassed && <span className="font-semibold text-red-600">Prazo encerrado</span>}
      </div>
      <div className="mt-2 flex items-center justify-center gap-3 text-sm font-medium">
        <Link
          to={`/times/${match.homeTeamId}`}
          className="flex flex-col items-center gap-1 text-brand-blue-dark hover:underline"
        >
          <TeamCrest teamName={homeTeamName} size={32} />
          {homeTeamName}
        </Link>
        <span className="text-slate-400">x</span>
        <Link
          to={`/times/${match.awayTeamId}`}
          className="flex flex-col items-center gap-1 text-brand-blue-dark hover:underline"
        >
          <TeamCrest teamName={awayTeamName} size={32} />
          {awayTeamName}
        </Link>
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <button
          type="button"
          disabled={deadlinePassed || showScore}
          onClick={() => setOutcome('CASA')}
          className={`rounded px-3 py-1.5 text-sm ${
            outcome === 'CASA' ? 'bg-brand-blue text-white' : 'border border-brand-blue/40 text-brand-blue-dark'
          } disabled:opacity-50`}
        >
          Casa vence
        </button>
        <button
          type="button"
          disabled={deadlinePassed || showScore}
          onClick={() => setOutcome('EMPATE')}
          className={`rounded px-3 py-1.5 text-sm ${
            outcome === 'EMPATE' ? 'bg-brand-blue text-white' : 'border border-brand-blue/40 text-brand-blue-dark'
          } disabled:opacity-50`}
        >
          Empate
        </button>
        <button
          type="button"
          disabled={deadlinePassed || showScore}
          onClick={() => setOutcome('FORA')}
          className={`rounded px-3 py-1.5 text-sm ${
            outcome === 'FORA' ? 'bg-brand-blue text-white' : 'border border-brand-blue/40 text-brand-blue-dark'
          } disabled:opacity-50`}
        >
          Fora vence
        </button>
      </div>
      {!deadlinePassed && (
        <button
          type="button"
          onClick={() => setShowScore((current) => !current)}
          className="mt-2 block w-full text-center text-xs text-brand-blue underline"
        >
          {showScore ? 'Cancelar múltipla' : 'Quer arriscar o placar exato? (múltipla, vale mais)'}
        </button>
      )}
      {showScore && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <input
            aria-label={`Placar de ${homeTeamName}`}
            type="number"
            min={0}
            value={predictedHome}
            disabled={deadlinePassed}
            onChange={(event) => handleScoreChange(Number(event.target.value), predictedAway)}
            className="w-14 rounded border border-slate-300 text-center"
          />
          <span>x</span>
          <input
            aria-label={`Placar de ${awayTeamName}`}
            type="number"
            min={0}
            value={predictedAway}
            disabled={deadlinePassed}
            onChange={(event) => handleScoreChange(predictedHome, Number(event.target.value))}
            className="w-14 rounded border border-slate-300 text-center"
          />
        </div>
      )}
      <p className="mt-2 text-center text-xs text-slate-400">Simples: 3 pts · Múltipla: 7 pts (tudo ou nada)</p>
      <button
        type="button"
        disabled={deadlinePassed || isSubmitting || outcome === null}
        onClick={handleSubmit}
        className="mt-2 w-full rounded bg-brand-blue py-1.5 text-white disabled:opacity-50"
      >
        {existingPrediction ? 'Atualizar palpite' : 'Enviar palpite'}
      </button>
    </li>
  )
}
