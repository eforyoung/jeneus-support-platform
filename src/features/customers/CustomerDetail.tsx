'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, Card, Modal, Input } from '@/lib/ui'
import { getCustomer, saveContact, deleteContact, saveContract, deleteContract, saveSite, deleteSite } from './actions'

const TABS = ['Overview', 'Contacts', 'Contracts', 'Sites', 'Invoices', 'Tickets'] as const

export function CustomerDetail({ id }: { id: string }) {
  const router = useRouter()
  const [customer, setCustomer] = useState<any>(null)
  const [tab, setTab] = useState<string>('Overview')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ type: string; data?: any } | null>(null)

  useEffect(() => { getCustomer(id).then((d: any) => { setCustomer(d); setLoading(false) }) }, [id])

  if (loading) return <div className="text-white/40">Loading...</div>
  if (!customer) return <div className="text-white/40">Customer not found.</div>

  const typeBadge = (t: string) => {
    const m: Record<string, any> = { BUSINESS: 'blue', GOVERNMENT: 'purple', NGO: 'green', INDIVIDUAL: 'grey' }
    return <Badge variant={m[t] || 'grey'}>{t}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/customers')} className="text-teal hover:text-teal-dark text-sm">← Back</button>
        <h2 className="text-xl font-semibold text-white">{customer.name}</h2>
        {typeBadge(customer.customerType)}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-teal text-teal' : 'border-transparent text-white/50 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Overview' && (
        <Card title="Customer Information" className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-white/50">Address:</span> <span className="text-white">{customer.address || '—'}</span></div>
            <div><span className="text-white/50">BP:</span> <span className="text-white">{customer.bp || '—'}</span></div>
            <div><span className="text-white/50">NIU:</span> <span className="text-white">{customer.niu || '—'}</span></div>
            <div><span className="text-white/50">RC:</span> <span className="text-white">{customer.rc || '—'}</span></div>
            <div><span className="text-white/50">Phone:</span> <span className="text-white">{customer.phone || '—'}</span></div>
            <div><span className="text-white/50">Email:</span> <span className="text-white">{customer.email || '—'}</span></div>
            <div><span className="text-white/50">Website:</span> <span className="text-white">{customer.website || '—'}</span></div>
            <div><span className="text-white/50">Account Manager:</span> <span className="text-white">{customer.accountManager?.name || '—'}</span></div>
          </div>
          <div className="text-xs text-white/40">Created: {new Date(customer.createdAt).toLocaleDateString()}</div>
        </Card>
      )}

      {tab === 'Contacts' && (
        <Card title="Contacts">
          <Button size="sm" onClick={() => setModal({ type: 'contact' })} className="mb-3">+ Add Contact</Button>
          {customer.contacts?.length === 0 ? <div className="text-white/40 text-sm">No contacts.</div> : (
            <div className="space-y-2">
              {customer.contacts?.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between border border-white/10 rounded-lg p-3">
                  <div>
                    <div className="text-white font-medium">{c.firstName} {c.lastName} {c.isPrimary && <Badge variant="green">Primary</Badge>}</div>
                    <div className="text-white/60 text-xs">{c.title || ''} {c.phone || ''} {c.email || ''}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setModal({ type: 'contact', data: c })} className="text-teal text-xs">Edit</button>
                    <button onClick={async () => { if (confirm('Delete?')) { await deleteContact(c.id); router.refresh() } }} className="text-red-400 text-xs">Del</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'Contracts' && (
        <Card title="Contracts">
          <Button size="sm" onClick={() => setModal({ type: 'contract' })} className="mb-3">+ Add Contract</Button>
          {customer.contracts?.length === 0 ? <div className="text-white/40 text-sm">No contracts.</div> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/10 text-left text-white/60"><th className="py-2 px-3">Number</th><th className="py-2 px-3">Type</th><th className="py-2 px-3">Status</th><th className="py-2 px-3">Period</th><th className="py-2 px-3 text-right">Value</th><th className="py-2 px-3">Actions</th></tr></thead>
              <tbody>{customer.contracts?.map((c: any) => (
                <tr key={c.id} className="border-b border-white/5"><td className="py-2 px-3 text-white font-mono text-xs">{c.contractNumber}</td><td className="py-2 px-3"><Badge variant="blue">{c.contractType}</Badge></td><td className="py-2 px-3"><Badge variant={c.status === 'ACTIVE' ? 'green' : 'grey'}>{c.status}</Badge></td><td className="py-2 px-3 text-white/60 text-xs">{new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}</td><td className="py-2 px-3 text-right text-white">{c.value ? Number(c.value).toLocaleString() + ' ' + c.currency : '—'}</td><td className="py-2 px-3"><button onClick={() => setModal({ type: 'contract', data: c })} className="text-teal text-xs">Edit</button></td></tr>
              ))}</tbody></table></div>
          )}
        </Card>
      )}

      {tab === 'Sites' && (
        <Card title="Sites">
          <Button size="sm" onClick={() => setModal({ type: 'site' })} className="mb-3">+ Add Site</Button>
          {customer.sites?.length === 0 ? <div className="text-white/40 text-sm">No sites.</div> : (
            <div className="space-y-2">
              {customer.sites?.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between border border-white/10 rounded-lg p-3">
                  <div><div className="text-white font-medium">{s.name}</div><div className="text-white/60 text-xs">{s.address} {s.city} {s.gpsLat && `📍 ${s.gpsLat.toFixed(4)}, ${s.gpsLong.toFixed(4)}`}</div></div>
                  <div className="flex gap-2"><Badge variant="grey">{s.siteType}</Badge>
                    <button onClick={() => setModal({ type: 'site', data: s })} className="text-teal text-xs">Edit</button><button onClick={async () => { if (confirm('Delete?')) { await deleteSite(s.id); router.refresh() } }} className="text-red-400 text-xs">Del</button></div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'Invoices' && (
        <Card title="Invoices">
          {customer.invoices?.length === 0 ? <div className="text-white/40 text-sm">No invoices.</div> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/10 text-left text-white/60"><th className="py-2 px-3">Number</th><th className="py-2 px-3">Type</th><th className="py-2 px-3 text-right">Total</th><th className="py-2 px-3">Date</th></tr></thead>
              <tbody>{customer.invoices?.map((inv: any) => (
                <tr key={inv.id} className="border-b border-white/5"><td className="py-2 px-3 font-mono text-white text-xs">{inv.invoiceNumber}</td><td className="py-2 px-3"><Badge variant={inv.type === 'PROFORMA' ? 'blue' : 'green'}>{inv.type}</Badge></td><td className="py-2 px-3 text-right text-white">{Number(inv.grandTotal).toLocaleString()} XAF</td><td className="py-2 px-3 text-white/60 text-xs">{new Date(inv.savedAt).toLocaleDateString()}</td></tr>
              ))}</tbody></table></div>
          )}
        </Card>
      )}

      {tab === 'Tickets' && (
        <Card title="Tickets">
          {customer.tickets?.length === 0 ? <div className="text-white/40 text-sm">No tickets.</div> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/10 text-left text-white/60"><th className="py-2 px-3">Number</th><th className="py-2 px-3">Subject</th><th className="py-2 px-3">Type</th><th className="py-2 px-3">Priority</th><th className="py-2 px-3">Status</th></tr></thead>
              <tbody>{customer.tickets?.map((t: any) => (
                <tr key={t.id} className="border-b border-white/5"><td className="py-2 px-3 font-mono text-white text-xs">{t.ticketNumber}</td><td className="py-2 px-3 text-white">{t.subject}</td><td className="py-2 px-3"><Badge variant={t.type === 'INCIDENT' ? 'red' : 'blue'}>{t.type}</Badge></td><td className="py-2 px-3"><Badge variant={t.priority?.startsWith('P1') ? 'red' : 'amber'}>{t.priority}</Badge></td><td className="py-2 px-3"><Badge variant={t.status === 'CLOSED' || t.status === 'RESOLVED' ? 'green' : 'amber'}>{t.status}</Badge></td></tr>
              ))}</tbody></table></div>
          )}
        </Card>
      )}

      {/* Modal forms */}
      {modal?.type === 'contact' && <ContactFormModal initial={modal.data} customerId={id} onClose={() => setModal(null)} onSaved={() => { setModal(null); router.refresh() }} />}
      {modal?.type === 'contract' && <ContractFormModal initial={modal.data} customerId={id} onClose={() => setModal(null)} onSaved={() => { setModal(null); router.refresh() }} />}
      {modal?.type === 'site' && <SiteFormModal initial={modal.data} customerId={id} onClose={() => setModal(null)} onSaved={() => { setModal(null); router.refresh() }} />}
    </div>
  )
}

// ─── Sub-entity form modals (inline for efficiency) ───

function ContactFormModal({ initial, customerId, onClose, onSaved }: any) {
  const [f, setF] = useState({ firstName: initial?.firstName || '', lastName: initial?.lastName || '', title: initial?.title || '', phone: initial?.phone || '', email: initial?.email || '', isPrimary: initial?.isPrimary || false })
  async function handleSave() { await saveContact({ ...f, customerId }, initial?.id); onSaved() }
  return (
    <Modal title={initial ? 'Edit Contact' : 'Add Contact'} open onClose={onClose}>
      <div className="space-y-3"><Input label="First Name" value={f.firstName} onChange={(e: any) => setF({ ...f, firstName: e.target.value })} /><Input label="Last Name" value={f.lastName} onChange={(e: any) => setF({ ...f, lastName: e.target.value })} /><Input label="Title" value={f.title} onChange={(e: any) => setF({ ...f, title: e.target.value })} /><Input label="Phone" value={f.phone} onChange={(e: any) => setF({ ...f, phone: e.target.value })} /><Input label="Email" value={f.email} onChange={(e: any) => setF({ ...f, email: e.target.value })} /><label className="flex items-center gap-2"><input type="checkbox" checked={f.isPrimary} onChange={(e) => setF({ ...f, isPrimary: e.target.checked })} className="rounded" /><span className="text-sm text-white/70">Primary Contact</span></label>
        <div className="flex gap-3 justify-end pt-4"><Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button><Button size="sm" onClick={handleSave}>Save</Button></div></div>
    </Modal>)
}

function ContractFormModal({ initial, customerId, onClose, onSaved }: any) {
  const [f, setF] = useState({ contractNumber: initial?.contractNumber || '', contractType: initial?.contractType || 'SUPPORT', status: initial?.status || 'DRAFT', startDate: initial?.startDate?.split('T')[0] || '', endDate: initial?.endDate?.split('T')[0] || '', value: initial?.value?.toString() || '', currency: initial?.currency || 'XAF' })
  async function handleSave() { await saveContract({ ...f, value: parseFloat(f.value) || 0, customerId }, initial?.id); onSaved() }
  return (
    <Modal title={initial ? 'Edit Contract' : 'Add Contract'} open onClose={onClose}>
      <div className="space-y-3"><Input label="Contract Number" value={f.contractNumber} onChange={(e: any) => setF({ ...f, contractNumber: e.target.value })} /><div><label className="block text-sm font-medium text-white/70 mb-1">Type</label><select value={f.contractType} onChange={(e) => setF({ ...f, contractType: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option>SUPPORT</option><option>PROJECT</option><option>MANAGED_SERVICE</option><option>ONE_TIME</option></select></div><div><label className="block text-sm font-medium text-white/70 mb-1">Status</label><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option>DRAFT</option><option>ACTIVE</option><option>EXPIRED</option><option>TERMINATED</option></select></div><Input label="Start Date" type="date" value={f.startDate} onChange={(e: any) => setF({ ...f, startDate: e.target.value })} /><Input label="End Date" type="date" value={f.endDate} onChange={(e: any) => setF({ ...f, endDate: e.target.value })} /><Input label="Value" type="number" value={f.value} onChange={(e: any) => setF({ ...f, value: e.target.value })} />
        <div className="flex gap-3 justify-end pt-4"><Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button><Button size="sm" onClick={handleSave}>Save</Button></div></div>
    </Modal>)
}

function SiteFormModal({ initial, customerId, onClose, onSaved }: any) {
  const [f, setF] = useState({ name: initial?.name || '', address: initial?.address || '', city: initial?.city || '', gpsLat: initial?.gpsLat?.toString() || '', gpsLong: initial?.gpsLong?.toString() || '', siteType: initial?.siteType || 'BRANCH' })
  async function handleSave() { await saveSite({ ...f, gpsLat: parseFloat(f.gpsLat) || null, gpsLong: parseFloat(f.gpsLong) || null, customerId }, initial?.id); onSaved() }
  return (
    <Modal title={initial ? 'Edit Site' : 'Add Site'} open onClose={onClose}>
      <div className="space-y-3"><Input label="Site Name" value={f.name} onChange={(e: any) => setF({ ...f, name: e.target.value })} /><Input label="Address" value={f.address} onChange={(e: any) => setF({ ...f, address: e.target.value })} /><Input label="City" value={f.city} onChange={(e: any) => setF({ ...f, city: e.target.value })} /><Input label="GPS Lat" type="number" value={f.gpsLat} onChange={(e: any) => setF({ ...f, gpsLat: e.target.value })} /><Input label="GPS Long" type="number" value={f.gpsLong} onChange={(e: any) => setF({ ...f, gpsLong: e.target.value })} /><div><label className="block text-sm font-medium text-white/70 mb-1">Type</label><select value={f.siteType} onChange={(e) => setF({ ...f, siteType: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option>HEAD_OFFICE</option><option>BRANCH</option><option>DATA_CENTER</option><option>REMOTE</option></select></div>
        <div className="flex gap-3 justify-end pt-4"><Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button><Button size="sm" onClick={handleSave}>Save</Button></div></div>
    </Modal>)
}

