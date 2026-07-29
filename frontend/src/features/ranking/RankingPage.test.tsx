import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import * as rankingApi from '../../api/ranking'
import { RankingPage } from './RankingPage'

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('RankingPage', () => {
  it('renders the ranking entries in order with points', async () => {
    vi.spyOn(rankingApi, 'getRanking').mockResolvedValue([
      { userId: 'u-1', userName: 'Ana', totalPoints: 9 },
      { userId: 'u-2', userName: 'Bia', totalPoints: 6 },
    ])

    renderWithClient(<RankingPage />)

    await waitFor(() => {
      expect(screen.getByText(/1\. Ana/)).toBeInTheDocument()
      expect(screen.getByText(/2\. Bia/)).toBeInTheDocument()
      expect(screen.getByText('9 pts')).toBeInTheDocument()
    })
  })
})
