import { useQuery } from '@tanstack/react-query'
import { getRanking } from '../../api/ranking'

export function RankingPage() {
  const rankingQuery = useQuery({ queryKey: ['ranking'], queryFn: () => getRanking() })

  if (rankingQuery.isLoading) {
    return <p className="p-4 text-center text-slate-500">Carregando ranking...</p>
  }

  return (
    <ol className="mx-auto max-w-md p-4">
      {(rankingQuery.data ?? []).map((entry, index) => (
        <li key={entry.userId} className="flex justify-between border-b border-brand-blue/10 py-2">
          <span>
            {index + 1}. {entry.userName}
          </span>
          <span className="font-semibold text-brand-blue-dark">{entry.totalPoints} pts</span>
        </li>
      ))}
    </ol>
  )
}
