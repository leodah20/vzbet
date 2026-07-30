import { useQuery } from '@tanstack/react-query'
import { listMyPredictions } from '../../api/predictions'
import { listMatches } from '../../api/matches'
import { listTeams } from '../../api/teams'
import { getRanking } from '../../api/ranking'
import { calculatePerformanceSummary } from '../../lib/performance'
import { calculateBadges } from '../../lib/badges'
import { useBadgeCelebration } from '../../lib/useBadgeCelebration'
import { calculatePointsProgression } from '../../lib/pointsProgression'
import { useAuth } from '../../context/AuthContext'
import { BadgeCard } from '../../components/BadgeCard'
import { PointsProgressionChart } from './PointsProgressionChart'

export function MeusPalpitesPage() {
  const { user } = useAuth()
  const predictionsQuery = useQuery({ queryKey: ['predictions', 'me'], queryFn: listMyPredictions })
  const matchesQuery = useQuery({ queryKey: ['matches', 'all'], queryFn: () => listMatches() })
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: listTeams })
  const rankingQuery = useQuery({ queryKey: ['ranking'], queryFn: () => getRanking() })

  // Every hook below must run on every render, in the same order, regardless of
  // loading state — the loading early-return happens after all of them.
  const predictions = predictionsQuery.data ?? []
  const rankingIndex = (rankingQuery.data ?? []).findIndex((entry) => entry.userId === user?.id)
  const rankingPosition = rankingIndex === -1 ? null : rankingIndex + 1
  const badges = calculateBadges(predictions, rankingPosition)
  const newlyUnlocked = useBadgeCelebration(badges.map(({ category, tier }) => ({ category, tier })))

  if (predictionsQuery.isLoading || matchesQuery.isLoading || teamsQuery.isLoading || rankingQuery.isLoading) {
    return <p className="p-4 text-center text-slate-500">Carregando seus palpites...</p>
  }

  const matchesById = new Map((matchesQuery.data ?? []).map((match) => [match.id, match]))
  const teamNames = new Map((teamsQuery.data ?? []).map((team) => [team.id, team.name]))
  const summary = calculatePerformanceSummary(predictions)
  const progression = calculatePointsProgression(predictions, matchesQuery.data ?? [])

  const rows = predictions
    .map((prediction) => ({ prediction, match: matchesById.get(prediction.matchId) }))
    .filter((row) => row.match !== undefined)
    .reverse()

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-bold text-brand-blue-dark">Meus palpites</h1>

      <div className="mt-2 flex flex-wrap justify-center gap-4 rounded-lg border border-brand-blue/20 bg-white p-3">
        {badges.map((badge) => (
          <BadgeCard
            key={badge.category}
            status={badge}
            isNewlyUnlocked={newlyUnlocked.has(`${badge.category}:${badge.tier}`)}
          />
        ))}
      </div>

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

      <div className="mt-4">
        <PointsProgressionChart data={progression} />
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
