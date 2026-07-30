import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listChampionships } from '../../api/championships'

export function CampeonatosPage() {
  const championshipsQuery = useQuery({ queryKey: ['championships'], queryFn: listChampionships })

  if (championshipsQuery.isLoading) {
    return <p className="p-4 text-center text-slate-500">Carregando campeonatos...</p>
  }

  return (
    <ul className="mx-auto flex max-w-md flex-col gap-2 p-4">
      {(championshipsQuery.data ?? []).map((championship) => (
        <li key={championship.id}>
          <Link
            to={`/campeonatos/${championship.id}`}
            className="block rounded-lg border border-brand-blue/20 bg-white p-4 shadow-sm"
          >
            <p className="font-medium text-brand-blue-dark">{championship.name}</p>
            <p className="text-sm text-slate-500">Temporada {championship.season}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
