import type { UnifiedHost, UnifiedAlert } from './types'

export async function fetchZabbixHosts(baseUrl: string, apiKey: string): Promise<UnifiedHost[]> {
  const rpc = { jsonrpc: '2.0', method: 'host.get', params: { output: ['hostid', 'host', 'name', 'status'], selectInterfaces: ['ip'] }, id: 1 }
  try {
    const res = await fetch(`${baseUrl}/api_jsonrpc.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(rpc),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.result || []).map((h: any) => ({
      id: crypto.randomUUID(), sourceId: '', sourceType: 'ZABBIX', nativeId: h.hostid,
      name: h.name, ip: h.interfaces?.[0]?.ip || '', status: h.status === '0' ? 'UP' : 'DOWN',
      cpuPercent: null, memoryPercent: null, diskPercent: null, uptime: null, lastChecked: new Date().toISOString(),
    }))
  } catch { return [] }
}

export async function fetchZabbixAlerts(baseUrl: string, apiKey: string): Promise<UnifiedAlert[]> {
  const rpc = { jsonrpc: '2.0', method: 'problem.get', params: { output: ['eventid', 'name', 'severity', 'clock'], selectAcknowledges: ['acknowledgeid'], recent: true, sortfield: 'clock', sortorder: 'DESC', limit: 50 }, id: 1 }
  try {
    const res = await fetch(`${baseUrl}/api_jsonrpc.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(rpc),
    })
    if (!res.ok) return []
    const data = await res.json()
    const sevMap = ['', 'INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    return (data.result || []).map((p: any) => ({
      id: crypto.randomUUID(), sourceId: '', sourceType: 'ZABBIX', nativeId: p.eventid,
      hostName: '', severity: (sevMap[parseInt(p.severity)] || 'MEDIUM') as any,
      message: p.name, acknowledged: (p.acknowledges?.length || 0) > 0,
      triggeredAt: new Date(parseInt(p.clock) * 1000).toISOString(),
    }))
  } catch { return [] }
}
