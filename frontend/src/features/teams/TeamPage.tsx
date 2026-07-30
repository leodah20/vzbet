import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { getTeam, listTeams } from '../../api/teams'
import { listMatches } from '../../api/matches'
import { listPlayersByTeam } from '../../api/players'
import type { Match } from '../../types/api'

export function TeamPage() {
  const { id } = useParams<{ id: string }>()
  const [headToHeadOpponentId, setHeadToHeadOpponentId] = useState<string | null>(null)

  const teamQuery = useQuery({ queryKey: ['team', id], queryFn: () => getTeam(id!), enabled: Boolean(id) })
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: listTeams })
  const playersQuery = useQuery({
    queryKey: ['players', id],
    queryFn: () => listPlayersByTeam(id!),
    enabled: Boolean(id),
  })
  const matchesQuery = useQuery({
    queryKey: ['matches', 'team', id],
    queryFn: () => listMatches({ teamId: id }),
    enabled: Boolean(id),
  })

  if (teamQuery.isLoading || teamsQuery.isLoading || playersQuery.isLoading || matchesQuery.isLoading) {
    return <p className="p-4 text-center text-slate-500">Carregando time...</p>
  }

  const teamNames = new Map((teamsQuery.data ?? []).map((team) => [team.id, team.name]))
  const allMatches = matchesQuery.data ?? []
  const upcoming = allMatches.filter((match) => match.status === 'AGENDADA')
  const finished = allMatches
    .filter((match) => match.status === 'FINALIZADA')
    .filter((match) =>
      headToHeadOpponentId
        ? match.homeTeamId === headToHeadOpponentId || match.awayTeamId === headToHeadOpponentId
        : true,
    )

  function opponentOf(match: Match): string {
    return match.homeTeamId === id ? match.awayTeamId : match.homeTeamId
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-bold text-brand-blue-dark">{teamQuery.data?.name}</h1>
      <p className="text-sm text-slate-500">{teamQuery.data?.region}</p>

      <h2 className="mt-4 font-semibold text-brand-blue-dark">Elenco</h2>
      {(playersQuery.data ?? []).length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum jogador cadastrado ainda.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {(playersQuery.data ?? []).map((player) => (
            <li key={player.id} className="text-sm">
              #{player.number} {player.name} — {player.position}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-4 font-semibold text-brand-blue-dark">Próximos jogos</h2>
      <ul className="mt-2 flex flex-col gap-1">
        {upcoming.map((match) => (
          <li key={match.id} className="text-sm">
            {new Date(match.kickoffAt).toLocaleDateString('pt-BR')} — {teamNames.get(match.homeTeamId)} x{' '}
            {teamNames.get(match.awayTeamId)}
          </li>
        ))}
      </ul>

      <h2 className="mt-4 flex items-center justify-between font-semibold text-brand-blue-dark">
        Últimos resultados
        {headToHeadOpponentId && (
          <button
            type="button"
            onClick={() => setHeadToHeadOpponentId(null)}
            className="text-xs font-normal text-brand-blue underline"
          >
            Ver todos
          </button>
        )}
      </h2>
      <ul className="mt-2 flex flex-col gap-1">
        {finished.map((match) => (
          <li key={match.id} className="text-sm">
            {new Date(match.kickoffAt).toLocaleDateString('pt-BR')} — {teamNames.get(match.homeTeamId)}{' '}
            {match.homeScore} x {match.awayScore} {teamNames.get(match.awayTeamId)}{' '}
            <button
              type="button"
              onClick={() => setHeadToHeadOpponentId(opponentOf(match))}
              className="text-brand-blue underline"
            >
              confronto direto
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
