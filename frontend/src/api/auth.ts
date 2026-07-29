import { apiFetch } from './client'
import type { AuthUser, LoginPayload, LoginResponse, RegisterPayload } from '../types/api'

export function register(payload: RegisterPayload): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
