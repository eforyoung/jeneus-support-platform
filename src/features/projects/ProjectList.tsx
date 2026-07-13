'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Badge, Button, SlideOver, Input } from '@/lib/ui'
import { getProjects, saveProject, deleteProject, getCustomersForProject, getUsersForProject, getSitesForProject } from './actions'

const statusBadge = (s: string) => {
  const m: Record<string, any> = { PLANNING: 'blue', IN_PROGRESS: 'purple', ON_HOLD: 'amber', COMPLETED: 'green', CANCELLED: 'red' }
  return <Badge variant={m[s] || 'grey'}>{s?.replace('_', ' ')}</Badge>
}

export function ProjectList() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, string>>({ type: 'OTHER', status: 'PLANNING' })
  const [customers, setCustomers] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => { getProjects(filters).then((d: any) => { setProjects(d); setLoading(false) }) }, [filters])

  function openNew() {
    setEditing(null); setForm({ type: 'OTHER', status: 'PLANNING' }); setFormOpen(true)
    getCustomersForProject().then(setCustomers as any); getUsersForProject().then(setUsers as any)
  }
  function openEdit(p: any) {
    setEditing(p)
    setForm({ name: p.name, type: p.type, status: p.status, customerId: p.customerId, siteId: p.siteId || '', projectManagerId: p.projectManagerId || '', startDate: p.startDate?.split('T')[0] || '', endDate: p.endDate?.split('T')[0] || '', budget: p.budget?.toString() || '', description: p.description || '' })
    setFormOpen(true)
    getCustomersForProject().then(setCustomers as any); getUsersForProject().then(setUsers as any)
  }

  async function handleSave() {
    const result = await saveProject(form, editing?.id)
    if (result.success) { setFormOpen(false); getProjects(filters).then((d: any) => setProjects(d)) }
  }

  return (
    <Card title="Projects">
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filters.status || ''} onChange={(e) => setFilters({ ...filters, status: e.target.value || '' })} className="px-3 py-2 bg-dark border border-white/10 rounded-md text-white text-sm">
          <option value="">All Status</option><option>PLANNING</option><option>IN_PROGRESS</option><option>ON_HOLD</option><option>COMPLETED</option><option>CANCELLED</option></select>
        <Button size="sm" onClick={openNew}>+ New Project</Button>
      </div>

      {loading ? <div className="text-white/40 text-sm">Loading...</div> : projects.length === 0 ? <div className="text-white/40 text-sm">No projects.</div> : (
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/10 text-left text-white/60"><th className="py-2 px-3">#</th><th className="py-2 px-3">Name</th><th className="py-2 px-3">Type</th><th className="py-2 px-3">Customer</th><th className="py-2 px-3">Status</th><th className="py-2 px-3">Progress</th><th className="py-2 px-3">PM</th><th className="py-2 px-3">Budget</th></tr></thead>
          <tbody>{projects.map((p: any) => {
            const done = p.tasks?.filter((t: any) => t.status === 'DONE').length || 0
            const total = p.tasks?.length || 0
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            const budgetUsed = p.invoices?.reduce((s: number, i: any) => s + Number(i.grandTotal || 0), 0) || 0
            const budgetPct = p.budget ? Math.round((budgetUsed / Number(p.budget)) * 100) : 0
            return (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => router.push(`/dashboard/projects/${p.id}`)}>
                <td className="py-2 px-3 font-mono text-teal text-xs">{p.projectNumber}</td>
                <td className="py-2 px-3 text-white">{p.name}</td>
                <td className="py-2 px-3"><Badge variant="grey">{p.type?.replace('_', ' ')}</Badge></td>
                <td className="py-2 px-3 text-white/60">{p.customer?.name}</td>
                <td className="py-2 px-3">{statusBadge(p.status)}</td>
                <td className="py-2 px-3"><div className="flex items-center gap-1"><div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-teal rounded-full" style={{ width: `${pct}%` }} /></div><span className="text-white/60 text-xs">{pct}%</span></div></td>
                <td className="py-2 px-3 text-white/60 text-xs">{p.projectManager?.name || '—'}</td>
                <td className="py-2 px-3"><div className="flex items-center gap-1"><div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className={`h-full rounded-full ${budgetPct > 100 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} /></div><span className="text-white/60 text-xs">{budgetPct}%</span></div></td>
              </tr>
            )
          })}</tbody></table></div>
      )}

      <SlideOver title={editing ? 'Edit Project' : 'New Project'} open={formOpen} onClose={() => setFormOpen(false)} size="lg">
        <div className="space-y-3">
          <Input label="Project Name" value={form.name || ''} onChange={(e: any) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-white/70 mb-1">Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option>INSTALLATION</option><option>MIGRATION</option><option>ROLLOUT</option><option>SITE_ACCEPTANCE</option><option>OTHER</option></select></div>
            <div><label className="block text-sm font-medium text-white/70 mb-1">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option>PLANNING</option><option>IN_PROGRESS</option><option>ON_HOLD</option><option>COMPLETED</option><option>CANCELLED</option></select></div>
          </div>
          <div><label className="block text-sm font-medium text-white/70 mb-1">Customer</label><select value={form.customerId || ''} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option value="">-- Select --</option>{customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-white/70 mb-1">Project Manager</label><select value={form.projectManagerId || ''} onChange={(e) => setForm({ ...form, projectManagerId: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option value="">-- Select --</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" value={form.startDate || ''} onChange={(e: any) => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End Date" type="date" value={form.endDate || ''} onChange={(e: any) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <Input label="Budget" type="number" value={form.budget || ''} onChange={(e: any) => setForm({ ...form, budget: e.target.value })} />
          <div className="flex gap-3 justify-end pt-4"><Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSave}>Save</Button></div>
        </div>
      </SlideOver>
    </Card>
  )
}
