import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '../../api/auth'
import { ApiError } from '../../api/client'

export function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await register({ name, email, password })
      navigate('/login', { state: { registered: true } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado ao cadastrar.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-sm flex-col gap-3 p-4">
      <h1 className="text-xl font-bold text-brand-blue-dark">Criar conta</h1>
      <label className="flex flex-col gap-1">
        Nome
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="rounded border border-slate-300 p-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="rounded border border-slate-300 p-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Senha
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          className="rounded border border-slate-300 p-2"
        />
      </label>
      {error && <p className="text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-brand-blue py-2 text-white disabled:opacity-50"
      >
        Cadastrar
      </button>
    </form>
  )
}
