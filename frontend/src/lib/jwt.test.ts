import { describe, expect, it } from 'vitest'
import { decodeJwtPayload } from './jwt'

function encodeFakeJwt(payload: object): string {
  const base64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_')
  return `header.${base64}.signature`
}

describe('decodeJwtPayload', () => {
  it('decodes the sub and role from a JWT payload', () => {
    const token = encodeFakeJwt({ sub: 'user-1', role: 'TORCEDOR' })
    expect(decodeJwtPayload(token)).toEqual({ sub: 'user-1', role: 'TORCEDOR' })
  })
})
