'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, Card, Input, Textarea } from '@/lib/ui'
import { getTicket, updateTicketStatus, assignTicket, addComment, escalateTicket, getUsersForAssignment } from './actions'

function priorityBadge(p: string) {
  const m: Record<string, any> = { P1_CRITICAL: 'red', P2_HIGH: 'amber', P3_MEDIUM: 'blue', P4_LOW: 'grey' }
  return <Badge variant={m[p] || 'grey'}>{p?.replace('_', ' ')}</Badge>
}
function statusBadge(s: string) {
  const m: Record<string, any> = { NEW: 'blue', ASSIGNED: 'amber', IN_PROGRESS: 'purple', PENDING: 'grey', RESOLVED: 'green', CLOSED: 'green' }
  return <Badge variant={m[s] || 'grey'}>{s?.replace('_', ' ')}</Badge>
}
function typeBadge(t: string) {
  const m: Record<string, any> = { INCIDENT: 'red', SERVICE_REQUEST: 'blue', CHANGE_REQUEST: 'amber', PROBLEM: 'purple' }
  return <Badge variant={m[t] || 'grey'}>{t?.replace('_', ' ')}</Badge>
}

function SLACountdown({ deadline }: { deadline?: string | null }) {
  if (!deadline) return <span className="text-white/40 text-xs">No SLA</span>
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(i) }, [])
  const diff = new Date(deadline).getTime() - now
  const mins = Math.round(diff / 60000)
  if (mins < 0) return <span className="text-red-400 font-bold animate-pulse">BREACHED by {Math.abs(mins)}m</span>
  if (mins < 30) return <span className="text-red-400 font-bold">{mins}m left</span>
  if (mins < 60) return <span className="text-amber-400">{mins}m left</span>
  const hours = Math.floor(mins / 60)
  return <span className="text-green-400">{hours}h {mins % 60}m</span>
}

export function TicketDetail({ id }: { id: string }) {
  const router = useRouter()
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [commentInternal, setCommentInternal] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState('')

  useEffect(() => { getTicket(id).then((d: any) => { setTicket(d); setLoading(false) }) }, [id])

  async function handleStatus(newStatus: string) {
    const result = await updateTicketStatus(id, newStatus)
    if (result.success) getTicket(id).then((d: any) => setTicket(d))
  }

  async function openAssign() {
    setAssignOpen(true)
    getUsersForAssignment().then(setUsers as any)
  }

  async function handleAssign() {
    if (!selectedUser) return
    const result = await assignTicket(id, selectedUser)
    if (result.success) { setAssignOpen(false); getTicket(id).then((d: any) => setTicket(d)) }
  }

  async function handleComment() {
    if (!comment.trim()) return
    await addComment(id, comment, commentInternal)
    setComment('')
    getTicket(id).then((d: any) => setTicket(d))
  }

  if (loading) return <div className="text-white/40">Loading...</div>
  if (!ticket) return <div className="text-white/40">Ticket not found.</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/tickets')} className="text-teal hover:text-teal-dark text-sm">← Back</button>
        <h2 className="text-lg font-semibold text-white font-mono">{ticket.ticketNumber}</h2>
        {typeBadge(ticket.type)}
        {priorityBadge(ticket.priority)}
        {statusBadge(ticket.status)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: subject + actions + comments */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h3 className="text-lg font-semibold text-white mb-2">{ticket.subject}</h3>
            {ticket.description && <p className="text-white/60 text-sm whitespace-pre-wrap mb-4">{ticket.description}</p>}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
              {ticket.status === 'NEW' && <><Button size="sm" onClick={openAssign}>Assign</Button></>}
              {ticket.status === 'ASSIGNED' && <><Button size="sm" onClick={() => handleStatus('IN_PROGRESS')}>Start Work</Button></>}
              {(ticket.status === 'IN_PROGRESS' || ticket.status === 'PENDING') && (
                <><Button size="sm" onClick={() => handleStatus('RESOLVED')}>Resolve</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleStatus('PENDING')}>Mark Pending</Button></>
              )}
              {ticket.status === 'RESOLVED' && <Button size="sm" onClick={() => handleStatus('CLOSED')}>Close</Button>}
              {ticket.status === 'CLOSED' && <Button variant="ghost" size="sm" onClick={() => handleStatus('NEW')}>Reopen</Button>}
              {(ticket.priority === 'P2_HIGH' || ticket.priority === 'P3_MEDIUM') && (
                <Button variant="danger" size="sm" onClick={async () => { await escalateTicket(id); getTicket(id).then((d: any) => setTicket(d)) }}>Escalate P1</Button>
              )}
            </div>
          </Card>

          {/* Comments */}
          <Card title="Comments">
            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
              {ticket.comments?.length === 0 ? <div className="text-white/40 text-sm">No comments yet.</div> : (
                ticket.comments?.map((c: any) => (
                  <div key={c.id} className={`border rounded-lg p-3 ${c.isInternal ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/10'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-medium">{c.user?.name || 'Unknown'}</span>
                      {c.isInternal && <Badge variant="amber">Internal</Badge>}
                      <span className="text-white/40 text-xs">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-white/80 text-sm whitespace-pre-wrap">{c.body}</div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-white/10 pt-3 space-y-2">
              <Textarea label="Add comment" value={comment} onChange={(e: any) => setComment(e.target.value)} rows={3} placeholder="Type your comment..." />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2"><input type="checkbox" checked={commentInternal} onChange={(e) => setCommentInternal(e.target.checked)} className="rounded" /><span className="text-xs text-white/60">Internal note</span></label>
                <Button size="sm" onClick={handleComment}>Post Comment</Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar: details + SLA + timeline */}
        <div className="space-y-4">
          <Card title="Details">
            <div className="space-y-2 text-sm">
              <div><span className="text-white/50">Customer:</span> <span className="text-white">{ticket.customer?.name}</span></div>
              <div><span className="text-white/50">Site:</span> <span className="text-white">{ticket.site?.name || '—'}</span></div>
              <div><span className="text-white/50">Created by:</span> <span className="text-white">{ticket.createdBy?.name}</span></div>
              <div><span className="text-white/50">Assignee:</span> <span className="text-white">{ticket.assignedTo?.name || 'Unassigned'}</span></div>
              <div><span className="text-white/50">Created:</span> <span className="text-white text-xs">{new Date(ticket.createdAt).toLocaleString()}</span></div>
            </div>
          </Card>

          <Card title="SLA">
            <div className="text-center">
              <SLACountdown deadline={ticket.slaDeadline} />
              {ticket.contract && <div className="text-white/40 text-xs mt-1">Contract: {ticket.contract.contractNumber}</div>}
            </div>
          </Card>

          {/* Timeline */}
          <Card title="Timeline">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ticket.audits?.map((a: any) => (
                <div key={a.id} className="border-l-2 border-teal/30 pl-3 py-1">
                  <div className="text-white text-xs">{a.user?.name} changed <span className="text-teal">{a.field}</span></div>
                  <div className="text-white/50 text-xs">
                    {a.oldValue && <span className="line-through mr-1">{a.oldValue}</span>}
                    → <span className="text-white">{a.newValue}</span>
                  </div>
                  <div className="text-white/30 text-xs">{new Date(a.createdAt).toLocaleTimeString()}</div>
                </div>
              ))}
              {ticket.audits?.length === 0 && <div className="text-white/40 text-xs">No changes yet.</div>}
            </div>
          </Card>
        </div>
      </div>

      {/* Assign Modal */}
      {assignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setAssignOpen(false)} />
          <div className="relative bg-dark-card border border-white/10 rounded-lg shadow-2xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Assign Ticket</h3>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white mb-4">
              <option value="">-- Select engineer --</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAssign}>Assign</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

