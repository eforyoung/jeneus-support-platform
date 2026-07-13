export type UnifiedHost = {
  id: string
  sourceId: string
  sourceType: string
  nativeId: string
  name: string
  ip: string
  status: 'UP' | 'DOWN' | 'WARNING' | 'UNKNOWN'
  cpuPercent: number | null
  memoryPercent: number | null
  diskPercent: number | null
  uptime: string | null
  lastChecked: string
}

export type UnifiedAlert = {
  id: string
  sourceId: string
  sourceType: string
  nativeId: string
  hostName: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  message: string
  acknowledged: boolean
  triggeredAt: string
}
