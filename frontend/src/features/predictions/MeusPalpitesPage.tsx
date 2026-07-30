import { useQuery } from '@tanstack/react-query'
import { listMyPredictions } from '../../api/predictions'
import { listMatches } from '../../api/matches'
import { listTeams } from '../../api/teams'
import { calculatePerformanceSummary } from '../../lib/performance'

export function MeusPalpitesPage() {
  const predictionsQuery = useQuery({ queryKey: ['predictions', 'me'], queryFn: listMyPredictions })
  const matchesQuery = useQuery({ queryKey: ['matches', 'all'], queryFn: () => listMatches() })
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: listTeams })

  if (predictionsQuery.isLoading || matchesQuery.isLoading || teamsQuery.isLoading) {
    return <p className="p-4 text-center text-slate-500">Carregando seus palpites...</p>
  }

  const matchesById = new Map((matchesQuery.data ?? []).map((match) => [match.id, match]))
  const teamNames = new Map((teamsQuery.data ?? []).map((team) => [team.id, team.name]))
  const predictions = predictionsQuery.data ?? []
  const summary = calculatePerformanceSummary(predictions)

  const rows = predictions
    .map((prediction) => ({ prediction, match: matchesById.get(prediction.matchId) }))
    .filter((row) => row.match !== undefined)
    .reverse()

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-bold text-brand-blue-dark">Meus palpites</h1>
      <div className="mt-2 flex justify-around rounded-lg border border-brand-blue/20 bg-white p-3 text-center text-sm">
        <div>
          <p className="font-semibold text-brand-blue-dark">{summary.totalPoints}</p>
          <p className="text-slate-500">pontos</p>
        </div>
        <div>
          <p className="font-semibold text-brand-blue-dark">{summary.hitRate}%</p>
          <p className="text-slate-500">de acerto</p>
        </div>
        <div>
          <p className="font-semibold text-brand-blue-dark">{summary.longestStreak}</p>
          <p className="text-slate-500">maior sequência</p>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {rows.map(({ prediction, match }) => (
          <li key={prediction.id} className="rounded-lg border border-brand-blue/10 bg-white p-3 text-sm">
            <p className="text-slate-500">{new Date(match!.kickoffAt).toLocaleDateString('pt-BR')}</p>
            <p className="text-brand-blue-dark">
              {teamNames.get(match!.homeTeamId)} x {teamNames.get(match!.awayTeamId)}
            </p>
            <p>
              Seu palpite: {prediction.predictedOutcome}
              {prediction.predictedHome !== null && ` (${prediction.predictedHome}x${prediction.predictedAway})`}
            </p>
            <p>{prediction.pointsEarned === null ? 'Aguardando resultado' : `${prediction.pointsEarned} pontos`}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
