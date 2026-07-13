'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, Card, Modal, Input, Textarea } from '@/lib/ui'
import { getProject, saveProject, createTask, updateTaskStatus, deleteTask, submitAcceptance, getUsersForProject } from './actions'

const statusBadge = (s: string) => {
  const m: Record<string, any> = { PLANNING: 'blue', IN_PROGRESS: 'purple', ON_HOLD: 'amber', COMPLETED: 'green', CANCELLED: 'red' }
  return <Badge variant={m[s] || 'grey'}>{s?.replace('_', ' ')}</Badge>
}
const taskStatusColors: Record<string, string> = { TODO: 'blue', IN_PROGRESS: 'amber', DONE: 'green', BLOCKED: 'red' }

const TASK_COLS = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'] as const

export function ProjectDetail({ id }: { id: string }) {
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Tasks')
  const [taskForm, setTaskForm] = useState(false)
  const [newTask, setNewTask] = useState<Record<string, string>>({ status: 'TODO', priority: 'MEDIUM' })
  const [users, setUsers] = useState<any[]>([])
  const [acceptForm, setAcceptForm] = useState(false)
  const [checklist, setChecklist] = useState<{ criterion: string; result: string; notes: string }[]>([])
  const [signature, setSignature] = useState<string | null>(null)

  useEffect(() => { getProject(id).then((d: any) => { setProject(d); setLoading(false) }) }, [id])

  async function handleNewTask() {
    await createTask(id, newTask)
    setTaskForm(false); setNewTask({ status: 'TODO', priority: 'MEDIUM' })
    getProject(id).then((d: any) => setProject(d))
  }

  async function handleDrag(taskId: string, newStatus: string) {
    await updateTaskStatus(taskId, newStatus)
    getProject(id).then((d: any) => setProject(d))
  }

  async function handleAcceptance() {
    await submitAcceptance(id, {
      customerName: project?.customer?.name || '',
      siteName: project?.site?.name || '',
      date: new Date().toISOString(),
      overallResult: 'ACCEPTED',
      checklist,
      customerSignatureUrl: signature,
    })
    setAcceptForm(false)
    getProject(id).then((d: any) => setProject(d))
  }

  if (loading) return <div className="text-white/40">Loading...</div>
  if (!project) return <div className="text-white/40">Project not found.</div>

  const done = project.tasks?.filter((t: any) => t.status === 'DONE').length || 0
  const total = project.tasks?.length || 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const budgetUsed = project.invoices?.reduce((s: number, i: any) => s + Number(i.grandTotal || 0), 0) || 0
  const budgetPct = project.budget ? Math.round((budgetUsed / Number(project.budget)) * 100) : 0

  const TABS = ['Overview', 'Tasks', 'Budget', 'Documents', 'Acceptance']

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/projects')} className="text-teal hover:text-teal-dark text-sm">← Back</button>
        <h2 className="text-xl font-semibold text-white font-mono">{project.projectNumber}</h2>
        <span className="text-white">{project.name}</span>
        {statusBadge(project.status)}
      </div>

      <div className="flex gap-1 border-b border-white/10 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-teal text-teal' : 'border-transparent text-white/50 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <Card title="Project Overview">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-white/50">Name:</span> <span className="text-white">{project.name}</span></div>
            <div><span className="text-white/50">Type:</span> <Badge variant="grey">{project.type?.replace('_', ' ')}</Badge></div>
            <div><span className="text-white/50">Status:</span> {statusBadge(project.status)}</div>
            <div><span className="text-white/50">Customer:</span> <span className="text-white">{project.customer?.name}</span></div>
            <div><span className="text-white/50">Site:</span> <span className="text-white">{project.site?.name || '—'}</span></div>
            <div><span className="text-white/50">PM:</span> <span className="text-white">{project.projectManager?.name || '—'}</span></div>
            <div><span className="text-white/50">Start:</span> <span className="text-white">{project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}</span></div>
            <div><span className="text-white/50">End:</span> <span className="text-white">{project.endDate ? new Date(project.endDate).toLocaleDateString() : '—'}</span></div>
            <div><span className="text-white/50">Budget:</span> <span className="text-white">{project.budget ? Number(project.budget).toLocaleString() + ' XAF' : '—'}</span></div>
            <div><span className="text-white/50">Progress:</span> <span className="text-white">{pct}% ({done}/{total} tasks)</span></div>
          </div>
          {project.description && <div className="mt-3 p-3 bg-dark rounded text-white/60 text-sm whitespace-pre-wrap">{project.description}</div>}
        </Card>
      )}

      {tab === 'Tasks' && (
        <Card title="Task Board">
          <Button size="sm" onClick={() => { setTaskForm(true); getUsersForProject().then(setUsers as any) }} className="mb-4">+ Add Task</Button>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TASK_COLS.map((col) => {
              const tasks = project.tasks?.filter((t: any) => t.status === col) || []
              return (
                <div key={col} className="bg-dark-card border border-white/10 rounded-lg p-2">
                  <div className="text-xs font-semibold text-white/50 mb-2 px-1">{col.replace('_', ' ')} ({tasks.length})</div>
                  <div className="space-y-1.5">
                    {tasks.map((t: any) => (
                      <div key={t.id} className="bg-dark border border-white/5 rounded p-2 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium">{t.title}</span>
                          <Badge variant={taskStatusColors[t.status] as any || 'grey'}>{t.priority}</Badge>
                        </div>
                        {t.assignedTo && <div className="text-white/40">{t.assignedTo.name}</div>}
                        {t.dueDate && <div className="text-white/40">Due: {new Date(t.dueDate).toLocaleDateString()}</div>}
                        <div className="flex gap-1 mt-1">
                          {TASK_COLS.filter((c) => c !== t.status).map((c) => (
                            <button key={c} onClick={() => handleDrag(t.id, c)} className="text-teal hover:bg-teal/10 text-xs rounded px-1 py-0.5">{c.replace('_', ' ')}</button>
                          ))}
                          <button onClick={async () => { if (confirm('Delete task?')) { await deleteTask(t.id); getProject(id).then((d: any) => setProject(d)) } }} className="text-red-400 hover:bg-red-400/10 text-xs rounded px-1 py-0.5">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {tab === 'Budget' && (
        <Card title="Budget Tracking">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-dark rounded-lg"><div className="text-2xl font-bold text-teal">{project.budget ? Number(project.budget).toLocaleString() : '—'}</div><div className="text-white/50 text-xs mt-1">Budget (XAF)</div></div>
            <div className="text-center p-4 bg-dark rounded-lg"><div className="text-2xl font-bold text-amber-400">{budgetUsed.toLocaleString()}</div><div className="text-white/50 text-xs mt-1">Actual (XAF)</div></div>
            <div className={`text-center p-4 bg-dark rounded-lg`}><div className={`text-2xl font-bold ${budgetPct > 100 ? 'text-red-400' : 'text-green-400'}`}>{budgetPct}%</div><div className="text-white/50 text-xs mt-1">Used</div></div>
          </div>
          <div className="h-4 bg-white/10 rounded-full overflow-hidden"><div className={`h-full rounded-full ${budgetPct > 100 ? 'bg-red-500' : 'bg-teal'}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} /></div>
          {project.invoices?.length > 0 && (
            <div className="mt-4"><h4 className="text-sm font-medium text-white/70 mb-2">Linked Invoices</h4>
              <table className="w-full text-sm"><thead><tr className="border-b border-white/10 text-left text-white/60"><th className="py-1 px-2">Number</th><th className="py-1 px-2 text-right">Amount</th><th className="py-1 px-2">Date</th></tr></thead>
                <tbody>{project.invoices?.map((inv: any) => (<tr key={inv.id} className="border-b border-white/5"><td className="py-1 px-2 font-mono text-white text-xs">{inv.invoiceNumber}</td><td className="py-1 px-2 text-right text-white">{Number(inv.grandTotal).toLocaleString()}</td><td className="py-1 px-2 text-white/60 text-xs">{new Date(inv.savedAt).toLocaleDateString()}</td></tr>))}</tbody></table></div>
          )}
        </Card>
      )}

      {tab === 'Documents' && (
        <Card title="Documents">
          {project.acceptances?.length === 0 ? <div className="text-white/40 text-sm">No documents yet. Complete a site acceptance to generate documents.</div> : (
            <div className="space-y-2">
              {project.acceptances?.map((a: any) => (
                <div key={a.id} className="border border-white/10 rounded-lg p-3 flex items-center justify-between">
                  <div><div className="text-white font-medium">Site Acceptance</div><div className="text-white/60 text-xs">{a.customerName} — {a.siteName} — {new Date(a.date).toLocaleDateString()}</div></div>
                  <div className="flex gap-2 items-center">
                    <Badge variant={a.overallResult === 'ACCEPTED' ? 'green' : a.overallResult === 'ACCEPTED_WITH_CONDITIONS' ? 'amber' : 'red'}>{a.overallResult?.replace(/_/g, ' ')}</Badge>
                    {a.reportPdfUrl && <a href={a.reportPdfUrl} target="_blank" className="text-teal text-xs">PDF</a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'Acceptance' && (
        <Card title="Site Acceptance">
          {project.acceptances?.length > 0 ? (
            <div className="text-white/40 text-sm">Acceptance already submitted. View in Documents tab.</div>
          ) : (
            <div className="space-y-4">
              <p className="text-white/60 text-sm">Complete site acceptance testing for this project.</p>
              <div className="space-y-2">
                {(checklist.length === 0 ? [{ criterion: '', result: 'PASS', notes: '' }] : checklist).map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <input type="text" value={item.criterion} onChange={(e) => { const c = [...checklist]; c[idx] = { ...c[idx], criterion: e.target.value }; setChecklist(c) }} placeholder="Acceptance criterion" className="flex-1 px-2 py-1 bg-dark border border-white/10 rounded text-sm text-white" />
                    <select value={item.result} onChange={(e) => { const c = [...checklist]; c[idx] = { ...c[idx], result: e.target.value }; setChecklist(c) }} className="px-2 py-1 bg-dark border border-white/10 rounded text-sm text-white"><option>PASS</option><option>FAIL</option></select>
                    <button onClick={() => setChecklist(checklist.filter((_, i) => i !== idx))} className="text-red-400 text-lg">×</button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setChecklist([...checklist, { criterion: '', result: 'PASS', notes: '' }])}>+ Add Criterion</Button>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Customer Signature (draw below)</label>
                <div className="border border-white/10 rounded-lg bg-white" style={{ width: '100%', height: 120 }}>
                  <canvas id="sig-canvas" width={500} height={120} style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
                    onMouseDown={(e) => {} } />
                </div>
                <button onClick={() => setSignature('signature-placeholder')} className="text-teal text-xs mt-1">Save Signature</button>
              </div>
              <Button size="lg" onClick={handleAcceptance}>Submit Acceptance (Mark Project Complete)</Button>
            </div>
          )}
        </Card>
      )}

      {/* New Task Modal */}
      {taskForm && (
        <Modal title="Add Task" open onClose={() => setTaskForm(false)}>
          <div className="space-y-3">
            <Input label="Title" value={newTask.title || ''} onChange={(e: any) => setNewTask({ ...newTask, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-white/70 mb-1">Status</label><select value={newTask.status} onChange={(e) => setNewTask({ ...newTask, status: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option>TODO</option><option>IN_PROGRESS</option><option>DONE</option><option>BLOCKED</option></select></div>
              <div><label className="block text-sm font-medium text-white/70 mb-1">Priority</label><select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></div>
            </div>
            <div><label className="block text-sm font-medium text-white/70 mb-1">Assignee</label><select value={newTask.assignedToId || ''} onChange={(e) => setNewTask({ ...newTask, assignedToId: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option value="">--</option>{users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
            <Input label="Due Date" type="date" value={newTask.dueDate || ''} onChange={(e: any) => setNewTask({ ...newTask, dueDate: e.target.value })} />
            <Input label="Estimated Hours" type="number" value={newTask.estimatedHours || ''} onChange={(e: any) => setNewTask({ ...newTask, estimatedHours: e.target.value })} />
            <div className="flex gap-3 justify-end pt-4"><Button variant="ghost" size="sm" onClick={() => setTaskForm(false)}>Cancel</Button><Button size="sm" onClick={handleNewTask}>Create Task</Button></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
