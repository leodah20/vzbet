import { apiFetch } from './client'
import type { Prediction, SubmitPredictionPayload } from '../types/api'

export function listMyPredictions(): Promise<Prediction[]> {
  return apiFetch<Prediction[]>('/predictions/me')
}

export function submitPrediction(payload: SubmitPredictionPayload): Promise<Prediction> {
  return apiFetch<Prediction>('/predictions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
