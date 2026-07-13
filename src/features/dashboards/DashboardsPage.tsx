'use client'

import { useState, useEffect } from 'react'
import { Card, Badge } from '@/lib/ui'
import { getDashboardData } from './actions'

const priorityBadge = (p: string) => ({ P1_CRITICAL: 'red', P2_HIGH: 'amber', P3_MEDIUM: 'blue', P4_LOW: 'grey' } as any)[p] || 'grey'

export function DashboardsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  useEffect(() => { getDashboardData(period).then((d: any) => { setData(d); setLoading(false) }) }, [period])

  if (loading) return <div className="text-white/40">Loading dashboards...</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Dashboards</h2>
        <div className="flex gap-1">
          {['7d', '30d', '90d'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 text-xs rounded-full ${period === p ? 'bg-teal text-white' : 'text-white/50 hover:text-white'}`}>{p}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Open Tickets */}
        <Card title="Open Tickets">
          <div className="text-3xl font-bold text-white mb-2">
            {data.openTickets.reduce((s: number, t: any) => s + t._count, 0)}
          </div>
          <div className="flex gap-2 flex-wrap">
            {data.openTickets.map((t: any) => (
              <span key={t.priority} className="text-xs"><Badge variant={priorityBadge(t.priority)}>{t.priority}: {t._count}</Badge></span>
            ))}
          </div>
        </Card>

        {/* SLA Compliance */}
        <Card title="SLA Compliance">
          <div className="flex items-center gap-3">
            <div className={`text-3xl font-bold ${data.slaCompliance >= 90 ? 'text-green-400' : data.slaCompliance >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
              {data.slaCompliance}%
            </div>
            <div className="text-white/50 text-sm">Last 30 days</div>
          </div>
          <div className="h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
            <div className={`h-full rounded-full ${data.slaCompliance >= 90 ? 'bg-green-500' : data.slaCompliance >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${data.slaCompliance}%` }} />
          </div>
        </Card>

        {/* MTTR */}
        <Card title="Mean Time to Resolve">
          <div className="text-3xl font-bold text-teal">{data.avgMttr}h</div>
          <div className="text-white/50 text-sm mt-1">Average resolution time</div>
        </Card>

        {/* Engineer Workload */}
        <Card title="Engineer Workload">
          {data.engineerWorkload.length === 0 ? <div className="text-white/40 text-sm">No active tickets.</div> : (
            <div className="space-y-2">
              {data.engineerWorkload.slice(0, 8).map((e: any) => (
                <div key={e.name} className="flex items-center justify-between">
                  <span className="text-white text-sm">{e.name}</span>
                  <span className="text-white/60 text-sm">{e.count} tickets</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Revenue by Customer */}
        <Card title="Revenue by Customer">
          {data.revenueByCustomer.length === 0 ? <div className="text-white/40 text-sm">No invoices in period.</div> : (
            <div className="space-y-2">
              {data.revenueByCustomer.slice(0, 8).map((r: any) => (
                <div key={r.name} className="flex items-center justify-between">
                  <span className="text-white text-sm truncate max-w-[140px]">{r.name}</span>
                  <span className="text-white/60 text-sm">{r.total.toLocaleString()} XAF</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Project Health */}
        <Card title="Project Health">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><div className="text-2xl font-bold text-green-400">{data.projectHealth.onTrack}</div><div className="text-white/40 text-xs">On Track</div></div>
            <div><div className="text-2xl font-bold text-amber-400">{data.projectHealth.atRisk}</div><div className="text-white/40 text-xs">At Risk</div></div>
            <div><div className="text-2xl font-bold text-red-400">{data.projectHealth.overdue}</div><div className="text-white/40 text-xs">Overdue</div></div>
          </div>
        </Card>

        {/* Asset Expiry */}
        <Card title="Expiring This Quarter">
          <div className="text-sm text-white/70 mb-2">
            {data.expiringAssets.licenses.length} licenses, {data.expiringAssets.warranties.length} warranties
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
            {[...data.expiringAssets.licenses.map((l: any) => ({ ...l, _type: 'License' })), ...data.expiringAssets.warranties.map((w: any) => ({ ...w, _type: 'Warranty' }))].slice(0, 6).map((item: any, i: number) => (
              <div key={i} className="flex justify-between">
                <span className="text-white">{item.asset?.assetTag} <span className="text-white/50">{item._type}</span></span>
                <span className="text-amber-400">{new Date(item.endDate).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Ticket Volume */}
        <Card title="Ticket Volume (30d)">
          <div className="flex items-center gap-4">
            <div><div className="text-2xl font-bold text-blue-400">{data.ticketVolume.reduce((s: number, d: any) => s + d.created, 0)}</div><div className="text-white/50 text-xs">Created</div></div>
            <div><div className="text-2xl font-bold text-green-400">{data.ticketVolume.reduce((s: number, d: any) => s + d.resolved, 0)}</div><div className="text-white/50 text-xs">Resolved</div></div>
          </div>
          <div className={`text-sm mt-2 ${data.ticketVolume.reduce((s: number, d: any) => s + d.created, 0) > data.ticketVolume.reduce((s: number, d: any) => s + d.resolved, 0) ? 'text-red-400' : 'text-green-400'}`}>
            Net: {data.ticketVolume.reduce((s: number, d: any) => s + d.created, 0) - data.ticketVolume.reduce((s: number, d: any) => s + d.resolved, 0)} tickets
          </div>
        </Card>
      </div>
    </div>
  )
}
