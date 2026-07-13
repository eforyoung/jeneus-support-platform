'use server'

import { prisma } from '@/lib/db/prisma'
import { revalidatePath } from 'next/cache'
import { fetchZabbixHosts, fetchZabbixAlerts } from './adapters/zabbix'
import type { UnifiedHost, UnifiedAlert } from './adapters/types'

const cache = new Map<string, { data: any; timestamp: number }>()

function getCached<T>(key: string, ttl = 60000): T | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.timestamp < ttl) return entry.data as T
  return null
}

function setCache(key: string, data: any) { cache.set(key, { data, timestamp: Date.now() }) }

export async function fetchAllHosts(): Promise<(UnifiedHost & { sourceName: string })[]> {
  const cached = getCached<(UnifiedHost & { sourceName: string })[]>('hosts')
  if (cached) return cached

  const sources = await prisma.monitoringSource.findMany({ where: { isActive: true } })
  const results: (UnifiedHost & { sourceName: string })[] = []

  for (const src of sources) {
    let hosts: UnifiedHost[] = []
    if (src.type === 'ZABBIX' && src.apiKey) hosts = await fetchZabbixHosts(src.baseUrl, src.apiKey)
    // PRTG and LibreNMS adapters — Phase II
    for (const h of hosts) { h.sourceId = src.id; results.push({ ...h, sourceName: src.name }) }
  }

  setCache('hosts', results)
  return results
}

export async function fetchAllAlerts(): Promise<(UnifiedAlert & { sourceName: string })[]> {
  const cached = getCached<(UnifiedAlert & { sourceName: string })[]>('alerts')
  if (cached) return cached

  const sources = await prisma.monitoringSource.findMany({ where: { isActive: true } })
  const results: (UnifiedAlert & { sourceName: string })[] = []

  for (const src of sources) {
    let alerts: UnifiedAlert[] = []
    if (src.type === 'ZABBIX' && src.apiKey) alerts = await fetchZabbixAlerts(src.baseUrl, src.apiKey)
    for (const a of alerts) { a.sourceId = src.id; results.push({ ...a, sourceName: src.name }) }
  }

  setCache('alerts', results)
  return results
}

// ─── Source CRUD ───

export async function getMonitoringSources() {
  return prisma.monitoringSource.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function saveMonitoringSource(data: Record<string, string>, id?: string) {
  const d = { name: data.name || '', type: data.type as any || 'ZABBIX', baseUrl: data.baseUrl || '', apiKey: data.apiKey || null, username: data.username || null, password: data.password || null }
  if (id) await prisma.monitoringSource.update({ where: { id }, data: d })
  else await prisma.monitoringSource.create({ data: d as any })
  revalidatePath('/dashboard/monitoring')
  return { success: true }
}

export async function deleteMonitoringSource(id: string) {
  await prisma.monitoringSource.delete({ where: { id } })
  revalidatePath('/dashboard/monitoring')
  return { success: true }
}

export async function toggleMonitoringSource(id: string, isActive: boolean) {
  await prisma.monitoringSource.update({ where: { id }, data: { isActive } })
  revalidatePath('/dashboard/monitoring')
  return { success: true }
}
