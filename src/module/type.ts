export type Slot = {
  id: string
  occupied: boolean
  carType?: string
  carColor?: string
  timestamp?: number
  noParking?: boolean
}

export type LogEntry = {
  id: string
  time: string
  type: 'info' | 'alert' | 'charge' | 'security' | 'system'
  message: string
}