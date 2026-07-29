import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function NavBar() {
  const { user, logout } = useAuth()

  if (!user) {
    return null
  }

  return (
    <nav className="flex justify-center gap-6 bg-brand-blue p-3 text-white">
      <Link to="/partidas">Partidas</Link>
      <Link to="/ranking">Ranking</Link>
      <button type="button" onClick={logout}>
        Sair
      </button>
    </nav>
  )
}
