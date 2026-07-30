import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { CampeonatosPage } from './features/championships/CampeonatosPage'
import { ClassificacaoPage } from './features/championships/ClassificacaoPage'
import { MatchesPage } from './features/matches/MatchesPage'
import { MeusPalpitesPage } from './features/predictions/MeusPalpitesPage'
import { RankingPage } from './features/ranking/RankingPage'
import { TeamPage } from './features/teams/TeamPage'

function RootLayout() {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/partidas" element={<MatchesPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/campeonatos" element={<CampeonatosPage />} />
          <Route path="/campeonatos/:id" element={<ClassificacaoPage />} />
          <Route path="/times/:id" element={<TeamPage />} />
          <Route path="/meus-palpites" element={<MeusPalpitesPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
