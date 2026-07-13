'use client'

import { useState, useEffect } from 'react'
import { Card, Badge } from '@/lib/ui'
import { getDashboardData } from './actions'

export function DashboardsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboardData()
      .then((d: any) => { setData(d); setLoading(false) })
      .catch((e: any) => { setError(e.message || 'Failed to load'); setLoading(false) })
  }, [])

  if (loading) return <div className="text-white/40 p-6">Loading dashboards...</div>

  if (error) return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Dashboards</h2>
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm mb-4">
        Error: {error}
      </div>
      <p className="text-white/60 text-sm">
        Make sure the database is connected and seeded. Run <code className="bg-dark px-2 py-0.5 rounded">npx prisma db push</code> and <code className="bg-dark px-2 py-0.5 rounded">npx prisma db seed</code>.
      </p>
    </div>
  )

  if (!data) return <div className="text-white/40 p-6">No dashboard data available.</div>

  const totalOpen = data.openTickets?.reduce((s: number, t: any) => s + t._count, 0) || 0

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Dashboards</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Open Tickets */}
        <Card title="Open Tickets">
          <div className="text-3xl font-bold text-white mb-2">{totalOpen}</div>
          <div className="text-white/50 text-sm">Total open tickets</div>
        </Card>

        {/* SLA Compliance */}
        <Card title="SLA Compliance">
          <div className="text-3xl font-bold text-green-400">{data.slaCompliance}%</div>
          <div className="text-white/50 text-sm">Last 30 days</div>
          <div className="h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${data.slaCompliance}%` }} />
          </div>
        </Card>

        {/* MTTR */}
        <Card title="Mean Time to Resolve">
          <div className="text-3xl font-bold text-teal">{data.avgMttr}h</div>
          <div className="text-white/50 text-sm mt-1">Average resolution time</div>
        </Card>

        {/* Engineer Workload */}
        <Card title="Engineer Workload">
          {data.engineerWorkload?.length === 0 ? <div className="text-white/40 text-sm">No active tickets.</div> : (
            <div className="space-y-2">
              {data.engineerWorkload?.slice(0, 8).map((e: any) => (
                <div key={e.name} className="flex items-center justify-between">
                  <span className="text-white text-sm">{e.name}</span>
                  <span className="text-white/60 text-sm">{e.count} tickets</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Revenue */}
        <Card title="Revenue by Customer">
          {data.revenueByCustomer?.length === 0 ? <div className="text-white/40 text-sm">No invoices yet.</div> : (
            <div className="space-y-2">
              {data.revenueByCustomer?.slice(0, 8).map((r: any) => (
                <div key={r.name} className="flex items-center justify-between">
                  <span className="text-white text-sm truncate max-w-[160px]">{r.name}</span>
                  <span className="text-white/60 text-sm">{r.total.toLocaleString()} XAF</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Project Health */}
        <Card title="Project Health">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><div className="text-2xl font-bold text-green-400">{data.projectHealth?.onTrack || 0}</div><div className="text-white/40 text-xs">On Track</div></div>
            <div><div className="text-2xl font-bold text-amber-400">{data.projectHealth?.atRisk || 0}</div><div className="text-white/40 text-xs">At Risk</div></div>
            <div><div className="text-2xl font-bold text-red-400">{data.projectHealth?.overdue || 0}</div><div className="text-white/40 text-xs">Overdue</div></div>
          </div>
        </Card>

        {/* Asset Expiry */}
        <Card title="Expiring This Quarter">
          <div className="text-sm text-white/70 mb-2">
            {data.expiringAssets?.licenses?.length || 0} licenses, {data.expiringAssets?.warranties?.length || 0} warranties
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
            {[...(data.expiringAssets?.licenses || []).map((l: any) => ({ ...l, _type: 'License' })), ...(data.expiringAssets?.warranties || []).map((w: any) => ({ ...w, _type: 'Warranty' }))].slice(0, 6).map((item: any, i: number) => (
              <div key={i} className="flex justify-between">
                <span className="text-white">{item.asset?.assetTag} <span className="text-white/50">{item._type}</span></span>
                <span className="text-amber-400">{item.endDate ? new Date(item.endDate).toLocaleDateString() : '—'}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Ticket Volume */}
        <Card title="Ticket Volume (30d)">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {data.ticketVolume?.reduce((s: number, d: any) => s + d.created, 0) || 0}
              </div>
              <div className="text-white/50 text-xs">Created</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                {data.ticketVolume?.reduce((s: number, d: any) => s + d.resolved, 0) || 0}
              </div>
              <div className="text-white/50 text-xs">Resolved</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
