'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Badge, Button, SlideOver, Input, Textarea } from '@/lib/ui'
import { getTickets, createTicket, updateTicketStatus, assignTicket, getUsersForAssignment, getCustomersForTicket, getSitesForCustomer, getContractsForCustomer } from './actions'

type ViewMode = 'table' | 'kanban'
type TicketData = any

const COLUMNS = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'] as const

const priorityBadge = (p: string) => {
  const m: Record<string, any> = { P1_CRITICAL: 'red', P2_HIGH: 'amber', P3_MEDIUM: 'blue', P4_LOW: 'grey' }
  return <Badge variant={m[p] || 'grey'}>{p.replace('_', ' ')}</Badge>
}

const statusBadge = (s: string) => {
  const m: Record<string, any> = { NEW: 'blue', ASSIGNED: 'amber', IN_PROGRESS: 'purple', PENDING: 'grey', RESOLVED: 'green', CLOSED: 'green' }
  return <Badge variant={m[s] || 'grey'}>{s.replace('_', ' ')}</Badge>
}

const typeBadge = (t: string) => {
  const m: Record<string, any> = { INCIDENT: 'red', SERVICE_REQUEST: 'blue', CHANGE_REQUEST: 'amber', PROBLEM: 'purple' }
  return <Badge variant={m[t] || 'grey'}>{t.replace('_', ' ')}</Badge>
}

function SLACountdown({ deadline }: { deadline?: string | null }) {
  if (!deadline) return <span className="text-white/40 text-xs">—</span>
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(i) }, [])
  const diff = new Date(deadline).getTime() - now
  const mins = Math.round(diff / 60000)
  if (mins < 0) return <span className="text-red-400 text-xs font-bold animate-pulse">BREACHED</span>
  if (mins < 60) return <span className="text-red-400 text-xs">{mins}m left</span>
  const hours = Math.floor(mins / 60)
  return <span className={hours < 2 ? 'text-amber-400 text-xs' : 'text-green-400 text-xs'}>{hours}h {mins % 60}m</span>
}

export function TicketList() {
  const router = useRouter()
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [form, setForm] = useState<Record<string, string>>({ type: 'INCIDENT', priority: 'P3_MEDIUM' })
  const [customers, setCustomers] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => { getTickets(filters).then((d: any) => { setTickets(d); setLoading(false) }) }, [filters])
  useEffect(() => { getCustomersForTicket().then(setCustomers as any) }, [])
  useEffect(() => { getUsersForAssignment().then(setUsers as any) }, [])

  async function openNew() {
    setForm({ type: 'INCIDENT', priority: 'P3_MEDIUM' }); setFormOpen(true)
    getCustomersForTicket().then(setCustomers as any)
  }

  async function handleCreate() {
    const result = await createTicket(form as any)
    if (result.success) { setFormOpen(false); getTickets(filters).then((d: any) => setTickets(d)) }
    else alert((result as any).error)
  }

  async function handleDrag(ticketId: string, newStatus: string) {
    await updateTicketStatus(ticketId, newStatus)
    getTickets(filters).then((d: any) => setTickets(d))
  }

  async function handleCustomerChange(cid: string) {
    setForm({ ...form, customerId: cid, siteId: '', contractId: '' })
    if (cid) {
      getSitesForCustomer(cid).then(setSites as any)
      getContractsForCustomer(cid).then(setContracts as any)
    }
  }

  const kanbanTickets = (status: string) => tickets.filter((t: any) => t.status === status)

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input type="text" placeholder="Search..." value={filters.search || ''}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="flex-1 min-w-[150px] px-3 py-2 bg-dark border border-white/10 rounded-md text-white text-sm focus:outline-none focus:border-teal" />
        <select value={filters.type || ''} onChange={(e) => setFilters({ ...filters, type: e.target.value || '' })}
          className="px-3 py-2 bg-dark border border-white/10 rounded-md text-white text-sm">
          <option value="">All Types</option><option>INCIDENT</option><option>SERVICE_REQUEST</option><option>CHANGE_REQUEST</option><option>PROBLEM</option></select>
        <select value={filters.priority || ''} onChange={(e) => setFilters({ ...filters, priority: e.target.value || '' })}
          className="px-3 py-2 bg-dark border border-white/10 rounded-md text-white text-sm">
          <option value="">All Priority</option><option>P1_CRITICAL</option><option>P2_HIGH</option><option>P3_MEDIUM</option><option>P4_LOW</option></select>
        <select value={filters.status || ''} onChange={(e) => setFilters({ ...filters, status: e.target.value || '' })}
          className="px-3 py-2 bg-dark border border-white/10 rounded-md text-white text-sm">
          <option value="">All Status</option>{COLUMNS.map((c) => <option key={c}>{c}</option>)}</select>
        <div className="flex gap-1 ml-auto">
          <Button size="sm" variant={viewMode === 'table' ? 'primary' : 'ghost'} onClick={() => setViewMode('table')}>📋</Button>
          <Button size="sm" variant={viewMode === 'kanban' ? 'primary' : 'ghost'} onClick={() => setViewMode('kanban')}>📌</Button>
          <Button size="sm" onClick={openNew}>+ New Ticket</Button>
        </div>
      </div>

      {loading ? <div className="text-white/40 text-sm">Loading...</div> : tickets.length === 0 ? <div className="text-white/40 text-sm">No tickets found.</div> : (
        viewMode === 'table' ? (
          <Card>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/10 text-left text-white/60"><th className="py-2 px-2 font-medium">#</th><th className="py-2 px-2 font-medium">Type</th><th className="py-2 px-2 font-medium">Priority</th><th className="py-2 px-2 font-medium">Subject</th><th className="py-2 px-2 font-medium">Customer</th><th className="py-2 px-2 font-medium">Status</th><th className="py-2 px-2 font-medium">Assignee</th><th className="py-2 px-2 font-medium">SLA</th></tr></thead>
              <tbody>{tickets.map((t: any) => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => router.push(`/dashboard/tickets/${t.id}`)}>
                  <td className="py-2 px-2 font-mono text-white text-xs">{t.ticketNumber}</td>
                  <td className="py-2 px-2">{typeBadge(t.type)}</td>
                  <td className="py-2 px-2">{priorityBadge(t.priority)}</td>
                  <td className="py-2 px-2 text-white max-w-xs truncate">{t.subject}</td>
                  <td className="py-2 px-2 text-white/60 text-xs">{t.customer?.name || '—'}</td>
                  <td className="py-2 px-2">{statusBadge(t.status)}</td>
                  <td className="py-2 px-2 text-white/60 text-xs">{t.assignedTo?.name || '—'}</td>
                  <td className="py-2 px-2"><SLACountdown deadline={t.slaDeadline} /></td>
                </tr>
              ))}</tbody></table></div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
            {COLUMNS.map((col) => (
              <div key={col} className="bg-dark-card border border-white/10 rounded-lg p-2 min-h-[200px]">
                <div className="text-xs font-semibold text-white/50 mb-2 px-1">{col.replace('_', ' ')} ({kanbanTickets(col).length})</div>
                <div className="space-y-1.5">
                  {kanbanTickets(col).map((t: any) => (
                    <div key={t.id} className="bg-dark border border-white/5 rounded p-2 cursor-pointer hover:border-teal/30"
                      draggable onDragEnd={() => {}} onClick={() => router.push(`/dashboard/tickets/${t.id}`)}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-white text-xs">{t.ticketNumber}</span>
                        {priorityBadge(t.priority)}</div>
                      <div className="text-white text-xs truncate">{t.subject}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-white/40 text-xs">{t.customer?.name}</span>
                        <SLACountdown deadline={t.slaDeadline} /></div>
                      {col !== t.status && (
                        <button onClick={(e) => { e.stopPropagation(); handleDrag(t.id, col) }}
                          className="mt-1 w-full text-teal text-xs hover:bg-teal/10 rounded px-1 py-0.5">Move to {col}</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* New Ticket SlideOver */}
      <SlideOver title="New Ticket" open={formOpen} onClose={() => setFormOpen(false)} size="lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-white/70 mb-1">Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option>INCIDENT</option><option>SERVICE_REQUEST</option><option>CHANGE_REQUEST</option><option>PROBLEM</option></select></div>
            <div><label className="block text-sm font-medium text-white/70 mb-1">Priority</label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option>P1_CRITICAL</option><option>P2_HIGH</option><option>P3_MEDIUM</option><option>P4_LOW</option></select></div>
          </div>
          <Input label="Subject" value={form.subject || ''} onChange={(e: any) => setForm({ ...form, subject: e.target.value })} />
          <Textarea label="Description" value={form.description || ''} onChange={(e: any) => setForm({ ...form, description: e.target.value })} rows={4} />
          <div><label className="block text-sm font-medium text-white/70 mb-1">Customer</label><select value={form.customerId || ''} onChange={(e) => handleCustomerChange(e.target.value)} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option value="">-- Select --</option>{customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          {sites.length > 0 && <div><label className="block text-sm font-medium text-white/70 mb-1">Site</label><select value={form.siteId || ''} onChange={(e) => setForm({ ...form, siteId: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option value="">-- Select --</option>{sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
          {contracts.length > 0 && <div><label className="block text-sm font-medium text-white/70 mb-1">Contract (SLA)</label><select value={form.contractId || ''} onChange={(e) => setForm({ ...form, contractId: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option value="">-- Select --</option>{contracts.map((c: any) => <option key={c.id} value={c.id}>{c.contractNumber}</option>)}</select></div>}
          <div className="flex gap-3 justify-end pt-4"><Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button><Button size="sm" onClick={handleCreate}>Create Ticket</Button></div>
        </div>
      </SlideOver>
    </div>
  )
}
