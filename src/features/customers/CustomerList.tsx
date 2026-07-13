'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Badge, Button, SlideOver, Modal, Input, Textarea } from '@/lib/ui'
import { getCustomers, saveCustomer, deleteCustomer, importCustomersCSV } from './actions'

export function CustomerList() {
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => { getCustomers(search, typeFilter || undefined).then((d) => { setCustomers(d as any); setLoading(false) }) }, [search, typeFilter])

  function openNew() { setEditing(null); setForm({ customerType: 'BUSINESS' }); setFormOpen(true) }
  function openEdit(c: any) {
    setEditing(c)
    setForm({ name: c.name, customerType: c.customerType, address: c.address || '', bp: c.bp || '', niu: c.niu || '', rc: c.rc || '', phone: c.phone || '', email: c.email || '', website: c.website || '' })
    setFormOpen(true)
  }

  async function handleSave() {
    const result = await saveCustomer(form, editing?.id)
    if (result.success) {
      setFormOpen(false)
      getCustomers(search, typeFilter || undefined).then((d) => setCustomers(d as any))
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return
    await deleteCustomer(id)
    getCustomers(search, typeFilter || undefined).then((d) => setCustomers(d as any))
  }

  async function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.csv'
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return
      const fd = new FormData(); fd.append('file', file)
      const result = await importCustomersCSV(fd)
      if (result.success) { alert(`Imported ${(result as any).data?.imported} customers.`); getCustomers(search, typeFilter || undefined).then((d) => setCustomers(d as any)) }
      else alert((result as any).error)
    }
    input.click()
  }

  const typeBadge = (t: string) => {
    const m: Record<string, 'green' | 'blue' | 'purple' | 'grey'> = { BUSINESS: 'blue', GOVERNMENT: 'purple', NGO: 'green', INDIVIDUAL: 'grey' }
    return <Badge variant={m[t] || 'grey'}>{t}</Badge>
  }

  return (
    <Card title="Customers">
      <div className="flex flex-wrap gap-2 mb-4">
        <input type="text" placeholder="Search name, NIU, RC, city..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 bg-dark border border-white/10 rounded-md text-white text-sm focus:outline-none focus:border-teal" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-dark border border-white/10 rounded-md text-white text-sm">
          <option value="">All Types</option><option value="BUSINESS">Business</option><option value="GOVERNMENT">Government</option><option value="NGO">NGO</option><option value="INDIVIDUAL">Individual</option>
        </select>
        <Button size="sm" onClick={openNew}>+ Add Customer</Button>
        <Button variant="ghost" size="sm" onClick={handleImport}>📤 Import CSV</Button>
      </div>

      {loading ? <div className="text-white/40 text-sm">Loading...</div> : customers.length === 0 ? <div className="text-white/40 text-sm">No customers found.</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm"><thead><tr className="border-b border-white/10 text-left text-white/60"><th className="py-2 px-3 font-medium">Name</th><th className="py-2 px-3 font-medium">Type</th><th className="py-2 px-3 font-medium">City</th><th className="py-2 px-3 font-medium">Contracts</th><th className="py-2 px-3 font-medium">Contact</th><th className="py-2 px-3 font-medium">Actions</th></tr></thead>
            <tbody>
              {customers.map((c: any) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2 px-3"><button onClick={() => router.push(`/dashboard/customers/${c.id}`)} className="text-teal hover:text-teal-dark text-left">{c.name}</button></td>
                  <td className="py-2 px-3">{typeBadge(c.customerType)}</td>
                  <td className="py-2 px-3 text-white/60">{c.address?.split(',').pop()?.trim() || '—'}</td>
                  <td className="py-2 px-3 text-white/60">{c._count?.contracts || 0}</td>
                  <td className="py-2 px-3 text-white/60">{c._count?.contacts || 0}</td>
                  <td className="py-2 px-3"><div className="flex gap-2"><button onClick={() => openEdit(c)} className="text-teal hover:text-teal-dark text-xs">Edit</button><button onClick={() => handleDelete(c.id, c.name)} className="text-red-400 hover:text-red-300 text-xs">Delete</button></div></td>
                </tr>
              ))}
            </tbody></table></div>)}

      <SlideOver title={editing ? 'Edit Customer' : 'Add Customer'} open={formOpen} onClose={() => setFormOpen(false)}>
        <div className="space-y-3">
          <Input label="Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div><label className="block text-sm font-medium text-white/70 mb-1">Type</label><select value={form.customerType || 'BUSINESS'} onChange={(e) => setForm({ ...form, customerType: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option value="BUSINESS">Business</option><option value="GOVERNMENT">Government</option><option value="NGO">NGO</option><option value="INDIVIDUAL">Individual</option></select></div>
          <Input label="Address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input label="BP / PO Box" value={form.bp || ''} onChange={(e) => setForm({ ...form, bp: e.target.value })} />
          <Input label="NIU" value={form.niu || ''} onChange={(e) => setForm({ ...form, niu: e.target.value })} />
          <Input label="RC" value={form.rc || ''} onChange={(e) => setForm({ ...form, rc: e.target.value })} />
          <Input label="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Website" value={form.website || ''} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          <div className="flex gap-3 justify-end pt-4"><Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSave}>Save</Button></div>
        </div>
      </SlideOver>
    </Card>
  )
}
