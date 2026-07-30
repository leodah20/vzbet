import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { listChampionships } from '../../api/championships'
import { listMatches } from '../../api/matches'
import { listTeams } from '../../api/teams'
import { calculateStandings } from '../../lib/standings'
import { TeamCrest } from '../../components/TeamCrest'

export function ClassificacaoPage() {
  const { id } = useParams<{ id: string }>()

  const championshipsQuery = useQuery({ queryKey: ['championships'], queryFn: listChampionships })
  const matchesQuery = useQuery({
    queryKey: ['matches', 'championship', id, 'FINALIZADA'],
    queryFn: () => listMatches({ championshipId: id, status: 'FINALIZADA' }),
    enabled: Boolean(id),
  })
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: listTeams })

  if (championshipsQuery.isLoading || matchesQuery.isLoading || teamsQuery.isLoading) {
    return <p className="p-4 text-center text-slate-500">Carregando classificação...</p>
  }

  const championship = (championshipsQuery.data ?? []).find((item) => item.id === id)
  const standings = calculateStandings(matchesQuery.data ?? [], teamsQuery.data ?? [])

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-xl font-bold text-brand-blue-dark">{championship?.name ?? 'Campeonato'}</h1>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-brand-blue/20 text-left text-slate-500">
            <th className="py-2">Time</th>
            <th className="text-center">P</th>
            <th className="text-center">J</th>
            <th className="text-center">V</th>
            <th className="text-center">E</th>
            <th className="text-center">D</th>
            <th className="text-center">GP</th>
            <th className="text-center">GC</th>
            <th className="text-center">SG</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((entry) => (
            <tr key={entry.teamId} className="border-b border-brand-blue/10">
              <td className="py-2 font-medium text-brand-blue-dark">
                <Link to={`/times/${entry.teamId}`} className="flex items-center gap-2 hover:underline">
                  <TeamCrest teamName={entry.teamName} size={24} />
                  {entry.teamName}
                </Link>
              </td>
              <td className="text-center">{entry.points}</td>
              <td className="text-center">{entry.played}</td>
              <td className="text-center">{entry.wins}</td>
              <td className="text-center">{entry.draws}</td>
              <td className="text-center">{entry.losses}</td>
              <td className="text-center">{entry.goalsFor}</td>
              <td className="text-center">{entry.goalsAgainst}</td>
              <td className="text-center">{entry.goalDifference}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
