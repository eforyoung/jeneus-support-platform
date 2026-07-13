'use client'

import { useState, useEffect } from 'react'
import { Card, Badge, Button, SlideOver, Input, Textarea } from '@/lib/ui'
import { getMyJobs, getAllJobs, createFieldJob, acceptJob, declineJob, enRoute, checkIn, completeJob, getCustomersForField, getSitesForField, getEngineersForField } from './actions'

const jobTypeBadge = (t: string) => ({ INSTALLATION: 'blue', MAINTENANCE: 'green', REPAIR: 'amber', INSPECTION: 'purple', SURVEY: 'grey' } as any)[t] || 'grey'
const statusBadge = (s: string) => ({ ASSIGNED: 'blue', ACCEPTED: 'amber', EN_ROUTE: 'purple', ON_SITE: 'green', COMPLETED: 'green', CANCELLED: 'red' } as any)[s] || 'grey'

export function FieldJobList() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({ type: 'INSTALLATION' })
  const [customers, setCustomers] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [engineers, setEngineers] = useState<any[]>([])

  useEffect(() => {
    (viewMode === 'my' ? getMyJobs() : getAllJobs()).then((d: any) => { setJobs(d); setLoading(false) })
  }, [viewMode])

  function openNew() {
    setForm({ type: 'INSTALLATION' }); setFormOpen(true)
    getCustomersForField().then(setCustomers as any)
    getEngineersForField().then(setEngineers as any)
  }

  async function handleCreate() {
    const result = await createFieldJob(form)
    if (result.success) {
      setFormOpen(false)
      getAllJobs().then((d: any) => { setJobs(d); setViewMode('all') })
    }
  }

  async function handleAction(jobId: string, action: string) {
    if (action === 'accept') await acceptJob(jobId)
    else if (action === 'decline') { const r = prompt('Reason?'); if (r) await declineJob(jobId, r) }
    else if (action === 'enroute') await enRoute(jobId)
    else if (action === 'checkin') {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await checkIn(jobId, pos.coords.latitude, pos.coords.longitude)
          getAllJobs().then((d: any) => { setJobs(d); setViewMode('all') })
        }, () => { alert('GPS required for check-in') })
      }
    } else if (action === 'complete') {
      const f = prompt('Findings?') || ''
      const r = prompt('Recommendations?') || ''
      await completeJob(jobId, f, r, [])
    }
    (viewMode === 'my' ? getMyJobs() : getAllJobs()).then((d: any) => setJobs(d))
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button size="sm" variant={viewMode === 'my' ? 'primary' : 'ghost'} onClick={() => setViewMode('my')}>My Jobs</Button>
        <Button size="sm" variant={viewMode === 'all' ? 'primary' : 'ghost'} onClick={() => setViewMode('all')}>All Jobs</Button>
        <Button size="sm" onClick={openNew} className="ml-auto">+ New Job</Button>
      </div>

      {loading ? <div className="text-white/40 text-sm">Loading...</div> : jobs.length === 0 ? <div className="text-white/40 text-sm">No jobs found.</div> : (
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/10 text-left text-white/60"><th className="py-2 px-3">#</th><th className="py-2 px-3">Type</th><th className="py-2 px-3">Customer</th><th className="py-2 px-3">Site</th><th className="py-2 px-3">Scheduled</th><th className="py-2 px-3">Status</th><th className="py-2 px-3">Engineer</th><th className="py-2 px-3">Actions</th></tr></thead>
          <tbody>{jobs.map((j: any) => (
            <tr key={j.id} className="border-b border-white/5">
              <td className="py-2 px-3 font-mono text-teal text-xs">{j.jobNumber}</td>
              <td className="py-2 px-3"><Badge variant={jobTypeBadge(j.type)}>{j.type?.replace('_', ' ')}</Badge></td>
              <td className="py-2 px-3 text-white/80">{j.customer?.name}</td>
              <td className="py-2 px-3 text-white/60 text-xs">{j.site?.name}</td>
              <td className="py-2 px-3 text-white/60 text-xs">{new Date(j.scheduledDate).toLocaleDateString()}</td>
              <td className="py-2 px-3"><Badge variant={statusBadge(j.status)}>{j.status?.replace('_', ' ')}</Badge></td>
              <td className="py-2 px-3 text-white/60 text-xs">{j.assignedEngineer?.name || '—'}</td>
              <td className="py-2 px-3"><div className="flex gap-1 flex-wrap">
                {j.status === 'ASSIGNED' && <><button onClick={() => handleAction(j.id, 'accept')} className="text-green-400 text-xs">Accept</button><button onClick={() => handleAction(j.id, 'decline')} className="text-red-400 text-xs">Decline</button></>}
                {j.status === 'ACCEPTED' && <button onClick={() => handleAction(j.id, 'enroute')} className="text-teal text-xs">En Route</button>}
                {j.status === 'EN_ROUTE' && <button onClick={() => handleAction(j.id, 'checkin')} className="text-teal text-xs">Check In</button>}
                {j.status === 'ON_SITE' && <button onClick={() => handleAction(j.id, 'complete')} className="text-teal text-xs">Complete</button>}
                {j.checkInLat && <span className="text-white/40 text-xs">📍 {j.checkInLat.toFixed(4)}</span>}
              </div></td>
            </tr>
          ))}</tbody></table></div>
      )}

      <SlideOver title="New Field Job" open={formOpen} onClose={() => setFormOpen(false)} size="lg">
        <div className="space-y-3">
          <div><label className="block text-sm font-medium text-white/70 mb-1">Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option>INSTALLATION</option><option>MAINTENANCE</option><option>REPAIR</option><option>INSPECTION</option><option>SURVEY</option></select></div>
          <div><label className="block text-sm font-medium text-white/70 mb-1">Customer</label><select value={form.customerId || ''} onChange={(e) => { setForm({ ...form, customerId: e.target.value, siteId: '' }); getSitesForField(e.target.value).then(setSites as any) }} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option value="">-- Select --</option>{customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-white/70 mb-1">Site</label><select value={form.siteId || ''} onChange={(e) => setForm({ ...form, siteId: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option value="">-- Select --</option>{sites.map((s: any) => <option key={s.id} value={s.id}>{s.name} — {s.address}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-white/70 mb-1">Engineer</label><select value={form.assignedEngineerId || ''} onChange={(e) => setForm({ ...form, assignedEngineerId: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option value="">-- Select --</option>{engineers.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <Input label="Scheduled Date" type="date" value={form.scheduledDate || ''} onChange={(e: any) => setForm({ ...form, scheduledDate: e.target.value })} />
          <div className="flex gap-3 justify-end pt-4"><Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button><Button size="sm" onClick={handleCreate}>Create Job</Button></div>
        </div>
      </SlideOver>
    </div>
  )
}
