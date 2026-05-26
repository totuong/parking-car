export type Slot = {
  id: string
  occupied: boolean
  carType?: string
  carColor?: string
  timestamp?: number
}

export type LogEntry = {
  id: string
  time: string
  type: 'info' | 'alert' | 'charge' | 'security' | 'system'
  message: string
}