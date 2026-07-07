export type AnalyticsSummary = {
  occupancy_pct: number
  occupied: number
  tracked_slots: number
  total_events: number
}

export type ParkingAnalytics = {
  available: boolean
  error?: string
  summary?: AnalyticsSummary
  traffic_by_minute?: {
    labels: string[]
    entries: number[]
    exits: number[]
  }
  occupancy_by_zone?: {
    labels: string[]
    occupied: number[]
    vacant: number[]
  }
  slot_turnover?: {
    labels: string[]
    changes: number[]
  }
}

import { apiFetch } from '../utils/api'

export async function fetchParkingAnalytics(): Promise<ParkingAnalytics> {
  const response = await apiFetch('/api/analytics/summary')
  if (!response.ok) {
    return { available: false, error: `HTTP ${response.status}` }
  }
  return response.json()
}
