import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function NavBar() {
  const { user, logout } = useAuth()

  if (!user) {
    return null
  }

  return (
    <nav className="flex flex-wrap justify-center gap-4 bg-brand-blue p-3 text-white">
      <Link to="/">Painel</Link>
      <Link to="/partidas">Partidas</Link>
      <Link to="/campeonatos">Campeonatos</Link>
      <Link to="/ranking">Ranking</Link>
      <Link to="/meus-palpites">Meus Palpites</Link>
      <button type="button" onClick={logout}>
        Sair
      </button>
    </nav>
  )
}
