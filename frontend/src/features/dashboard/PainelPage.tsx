import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listMyPredictions } from '../../api/predictions'
import { listMatches } from '../../api/matches'
import { listTeams } from '../../api/teams'
import { getRanking } from '../../api/ranking'
import { calculateBadges } from '../../lib/badges'
import { useBadgeCelebration } from '../../lib/useBadgeCelebration'
import { getAccompaniedTeamIds } from '../../lib/teamsAccompanied'
import { useAuth } from '../../context/AuthContext'
import { BadgeCard } from '../../components/BadgeCard'
import { TeamCrest } from '../../components/TeamCrest'

export function PainelPage() {
  const { user } = useAuth()
  const predictionsQuery = useQuery({ queryKey: ['predictions', 'me'], queryFn: listMyPredictions })
  const matchesQuery = useQuery({ queryKey: ['matches', 'all'], queryFn: () => listMatches() })
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: listTeams })
  const rankingQuery = useQuery({ queryKey: ['ranking'], queryFn: () => getRanking() })

  // Every hook below must run on every render, in the same order, regardless of
  // loading state — the loading early-return happens after all of them.
  const predictions = predictionsQuery.data ?? []
  const allMatches = matchesQuery.data ?? []
  const rankingIndex = (rankingQuery.data ?? []).findIndex((entry) => entry.userId === user?.id)
  const rankingPosition = rankingIndex === -1 ? null : rankingIndex + 1
  const badges = calculateBadges(predictions, rankingPosition)
  const newlyUnlocked = useBadgeCelebration(badges.map(({ category, tier }) => ({ category, tier })))

  if (predictionsQuery.isLoading || matchesQuery.isLoading || teamsQuery.isLoading || rankingQuery.isLoading) {
    return <p className="p-4 text-center text-slate-500">Carregando painel...</p>
  }

  const teamNames = new Map((teamsQuery.data ?? []).map((team) => [team.id, team.name]))

  const upcoming = allMatches
    .filter((match) => match.status === 'AGENDADA')
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
    .slice(0, 3)

  const topRanking = (rankingQuery.data ?? []).slice(0, 3)

  const accompaniedTeamIds = getAccompaniedTeamIds(predictions, allMatches)
  const recentResults = allMatches
    .filter((match) => match.status === 'FINALIZADA')
    .filter((match) => accompaniedTeamIds.has(match.homeTeamId) || accompaniedTeamIds.has(match.awayTeamId))
    .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime())
    .slice(0, 3)

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-bold text-brand-blue-dark">Painel</h1>

      <section className="mt-3">
        <h2 className="font-semibold text-brand-blue-dark">Seus emblemas</h2>
        <div className="mt-2 flex flex-wrap justify-center gap-4 rounded-lg border border-brand-blue/20 bg-white p-3">
          {badges.map((badge) => (
            <BadgeCard
              key={badge.category}
              status={badge}
              isNewlyUnlocked={newlyUnlocked.has(`${badge.category}:${badge.tier}`)}
            />
          ))}
        </div>
        <Link to="/meus-palpites" className="mt-1 block text-sm text-brand-blue underline">
          Ver meus palpites
        </Link>
      </section>

      <section className="mt-4">
        <h2 className="font-semibold text-brand-blue-dark">Próximos jogos</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {upcoming.map((match) => (
            <li
              key={match.id}
              className="flex items-center justify-between rounded-lg border border-brand-blue/10 bg-white p-3 text-sm"
            >
              <span className="text-slate-500">{new Date(match.kickoffAt).toLocaleDateString('pt-BR')}</span>
              <span className="flex items-center gap-2 text-brand-blue-dark">
                <TeamCrest teamName={teamNames.get(match.homeTeamId) ?? 'Time'} size={24} />
                {teamNames.get(match.homeTeamId)} x {teamNames.get(match.awayTeamId)}
                <TeamCrest teamName={teamNames.get(match.awayTeamId) ?? 'Time'} size={24} />
              </span>
            </li>
          ))}
        </ul>
        <Link to="/partidas" className="mt-1 block text-sm text-brand-blue underline">
          Ver todas as partidas
        </Link>
      </section>

      <section className="mt-4">
        <h2 className="font-semibold text-brand-blue-dark">Top 3 do ranking</h2>
        <ol className="mt-2 flex flex-col gap-1 rounded-lg border border-brand-blue/10 bg-white p-3 text-sm">
          {topRanking.map((entry, index) => (
            <li
              key={entry.userId}
              className={`flex justify-between ${
                entry.userId === user?.id ? 'font-semibold text-brand-blue-dark' : ''
              }`}
            >
              <span>
                {index + 1}. {entry.userName}
              </span>
              <span>{entry.totalPoints} pts</span>
            </li>
          ))}
        </ol>
        <Link to="/ranking" className="mt-1 block text-sm text-brand-blue underline">
          Ver ranking completo
        </Link>
      </section>

      <section className="mt-4">
        <h2 className="font-semibold text-brand-blue-dark">Últimos resultados dos times que você acompanha</h2>
        {recentResults.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Dê seu primeiro palpite para acompanhar times aqui.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {recentResults.map((match) => (
              <li key={match.id} className="rounded-lg border border-brand-blue/10 bg-white p-3 text-sm">
                {new Date(match.kickoffAt).toLocaleDateString('pt-BR')} — {teamNames.get(match.homeTeamId)}{' '}
                {match.homeScore} x {match.awayScore} {teamNames.get(match.awayTeamId)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
