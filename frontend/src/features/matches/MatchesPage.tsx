import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listMatches } from '../../api/matches'
import { listMyPredictions, submitPrediction } from '../../api/predictions'
import { listTeams } from '../../api/teams'
import { MatchCard } from './MatchCard'

export function MatchesPage() {
  const queryClient = useQueryClient()

  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: listTeams })
  const matchesQuery = useQuery({
    queryKey: ['matches', 'AGENDADA'],
    queryFn: () => listMatches({ status: 'AGENDADA' }),
  })
  const predictionsQuery = useQuery({ queryKey: ['predictions', 'me'], queryFn: listMyPredictions })

  const submitMutation = useMutation({
    mutationFn: submitPrediction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions', 'me'] })
    },
  })

  if (teamsQuery.isLoading || matchesQuery.isLoading || predictionsQuery.isLoading) {
    return <p className="p-4 text-center text-slate-500">Carregando partidas...</p>
  }

  const teamNames = new Map((teamsQuery.data ?? []).map((team) => [team.id, team.name]))
  const predictionsByMatch = new Map(
    (predictionsQuery.data ?? []).map((prediction) => [prediction.matchId, prediction]),
  )

  return (
    <ul className="mx-auto flex max-w-md flex-col gap-3 p-4">
      {(matchesQuery.data ?? []).map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          homeTeamName={teamNames.get(match.homeTeamId) ?? 'Time'}
          awayTeamName={teamNames.get(match.awayTeamId) ?? 'Time'}
          existingPrediction={predictionsByMatch.get(match.id)}
          isSubmitting={submitMutation.isPending}
          onSubmit={(predictedOutcome, predictedHome, predictedAway) =>
            submitMutation.mutate({ matchId: match.id, predictedOutcome, predictedHome, predictedAway })
          }
        />
      ))}
    </ul>
  )
}
