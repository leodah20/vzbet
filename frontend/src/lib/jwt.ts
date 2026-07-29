export interface JwtPayload {
  sub: string
  role: 'TORCEDOR' | 'ADMIN'
}

export function decodeJwtPayload(token: string): JwtPayload {
  const [, payload] = token.split('.')
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
  const json = atob(base64)
  return JSON.parse(json) as JwtPayload
}
