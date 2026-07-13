'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Badge, Button, SlideOver, Input } from '@/lib/ui'
import { fetchAllHosts, fetchAllAlerts, getMonitoringSources, saveMonitoringSource, deleteMonitoringSource, toggleMonitoringSource } from '@/features/monitoring/actions'

export function MonitoringPage() {
  const router = useRouter()
  const [hosts, setHosts] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, string>>({ type: 'ZABBIX' })
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    Promise.all([fetchAllHosts(), fetchAllAlerts(), getMonitoringSources()]).then(([h, a, s]: any) => {
      setHosts(h); setAlerts(a); setSources(s); setLoading(false)
    })
  }, [])

  async function handleSave() {
    await saveMonitoringSource(form, editing?.id)
    setFormOpen(false); setEditing(null)
    getMonitoringSources().then(setSources as any)
  }

  const sevBadge = (s: string) => ({ CRITICAL: 'red', HIGH: 'amber', MEDIUM: 'blue', LOW: 'grey', INFO: 'grey' } as any)[s] || 'grey'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Network Monitoring</h2>
      </div>

      <div className="flex gap-1 border-b border-white/10">
        {['overview', 'hosts', 'alerts', 'sources'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm capitalize border-b-2 ${tab === t ? 'border-teal text-teal' : 'border-transparent text-white/50'}`}>{t}</button>
        ))}
      </div>

      {loading ? <div className="text-white/40 text-sm">Loading...</div> : (
        <>
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {sources.map((s: any) => (
                  <Card key={s.id}>
                    <div className="text-sm font-semibold text-teal">{s.name}</div>
                    <div className="text-xs text-white/50">{s.type}</div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div className="text-green-400">Up: {hosts.filter(h => h.sourceId === s.id && h.status === 'UP').length}</div>
                      <div className="text-red-400">Down: {hosts.filter(h => h.sourceId === s.id && h.status === 'DOWN').length}</div>
                    </div>
                  </Card>
                ))}
                {sources.length === 0 && <div className="col-span-4 text-white/40 text-sm">No monitoring sources configured. Add one in the Sources tab.</div>}
              </div>
              <Card title="Recent Critical Alerts">
                {alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').slice(0, 20).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-1 border-b border-white/5">
                    <div><Badge variant={sevBadge(a.severity)}>{a.severity}</Badge> <span className="text-white text-sm">{a.message}</span></div>
                    <span className="text-white/40 text-xs">{a.sourceName}</span>
                  </div>
                ))}
                {alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length === 0 && <div className="text-white/40 text-sm">No critical alerts.</div>}
              </Card>
            </div>
          )}

          {tab === 'hosts' && (
            <Card title="All Hosts">
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/10 text-left text-white/60"><th className="py-2 px-3">Host</th><th className="py-2 px-3">IP</th><th className="py-2 px-3">Source</th><th className="py-2 px-3">Status</th></tr></thead>
                <tbody>{hosts.map((h: any) => (
                  <tr key={h.id} className="border-b border-white/5">
                    <td className="py-2 px-3 text-white">{h.name}</td>
                    <td className="py-2 px-3 text-white/60 font-mono text-xs">{h.ip}</td>
                    <td className="py-2 px-3"><Badge variant="grey">{h.sourceName}</Badge></td>
                    <td className="py-2 px-3"><Badge variant={h.status === 'UP' ? 'green' : 'red'}>{h.status}</Badge></td>
                  </tr>
                ))}</tbody></table></div>
              {hosts.length === 0 && <div className="text-white/40 text-sm mt-4">No hosts. Configure sources first.</div>}
            </Card>
          )}

          {tab === 'alerts' && (
            <Card title="Alert Feed">
              <div className="space-y-1">
                {alerts.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-white/5">
                    <div><Badge variant={sevBadge(a.severity)}>{a.severity}</Badge> <span className="text-white text-sm">{a.message}</span></div>
                    <div className="flex items-center gap-2">
                      {a.acknowledged && <span className="text-green-400 text-xs">Ack'd</span>}
                      <span className="text-white/40 text-xs">{new Date(a.triggeredAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && <div className="text-white/40 text-sm">No alerts.</div>}
              </div>
            </Card>
          )}

          {tab === 'sources' && (
            <Card title="Monitoring Sources">
              <Button size="sm" onClick={() => { setEditing(null); setForm({ type: 'ZABBIX' }); setFormOpen(true) }} className="mb-4">+ Add Source</Button>
              {sources.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between border border-white/10 rounded-lg p-3 mb-2">
                  <div><div className="text-white font-medium">{s.name}</div><div className="text-white/60 text-xs">{s.type} — {s.baseUrl}</div></div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleMonitoringSource(s.id, !s.isActive)} className={`text-xs px-2 py-1 rounded ${s.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{s.isActive ? 'Active' : 'Inactive'}</button>
                    <button onClick={() => { setEditing(s); setForm({ name: s.name, type: s.type, baseUrl: s.baseUrl, apiKey: s.apiKey || '', username: s.username || '', password: s.password || '' }); setFormOpen(true) }} className="text-teal text-xs">Edit</button>
                    <button onClick={async () => { if (confirm('Delete?')) { await deleteMonitoringSource(s.id); getMonitoringSources().then(setSources as any) } }} className="text-red-400 text-xs">Del</button>
                  </div>
                </div>
              ))}
              {sources.length === 0 && <div className="text-white/40 text-sm">No sources configured.</div>}

              <SlideOver title={editing ? 'Edit Source' : 'Add Source'} open={formOpen} onClose={() => setFormOpen(false)}>
                <div className="space-y-3">
                  <Input label="Name" value={form.name || ''} onChange={(e: any) => setForm({ ...form, name: e.target.value })} />
                  <div><label className="block text-sm font-medium text-white/70 mb-1">Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option>ZABBIX</option><option>PRTG</option><option>LIBRENMS</option></select></div>
                  <Input label="Base URL" value={form.baseUrl || ''} onChange={(e: any) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://zabbix.example.com" />
                  <Input label="API Key" type="password" value={form.apiKey || ''} onChange={(e: any) => setForm({ ...form, apiKey: e.target.value })} />
                  {form.type === 'LIBRENMS' && (<><Input label="Username" value={form.username || ''} onChange={(e: any) => setForm({ ...form, username: e.target.value })} /><Input label="Password" type="password" value={form.password || ''} onChange={(e: any) => setForm({ ...form, password: e.target.value })} /></>)}
                  <div className="flex gap-3 justify-end pt-4"><Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSave}>Save</Button></div>
                </div>
              </SlideOver>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
