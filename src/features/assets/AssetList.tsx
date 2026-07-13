'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Badge, Button, SlideOver, Input, Modal } from '@/lib/ui'
import { getAssets, saveAsset, deleteAsset, saveLicense, deleteLicense, saveWarranty, deleteWarranty, getCustomersForAsset, getSitesForAsset, importAssetsCSV } from './actions'

const typeBadge = (t: string) => {
  const m: Record<string, any> = { FIREWALL: 'red', ROUTER: 'amber', SWITCH: 'blue', SERVER: 'purple', UPS: 'green', WORKSTATION: 'grey', OTHER: 'grey' }
  return <Badge variant={m[t] || 'grey'}>{t}</Badge>
}
const statusBadge = (s: string) => {
  const m: Record<string, any> = { ACTIVE: 'green', INACTIVE: 'amber', DECOMMISSIONED: 'red', RMA: 'blue' }
  return <Badge variant={m[s] || 'grey'}>{s}</Badge>
}

function ExpiryDot({ date }: { date?: string | null }) {
  if (!date) return <span className="w-2 h-2 bg-white/20 rounded-full inline-block" />
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  if (days < 0) return <span className="w-2 h-2 bg-red-500 rounded-full inline-block" title="Expired" />
  if (days < 30) return <span className="w-2 h-2 bg-amber-500 rounded-full inline-block" title={`${days} days`} />
  return <span className="w-2 h-2 bg-green-500 rounded-full inline-block" title={`${days} days`} />
}

export function AssetList() {
  const router = useRouter()
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, string>>({ type: 'OTHER', status: 'ACTIVE' })
  const [customers, setCustomers] = useState<any[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [detailModal, setDetailModal] = useState<any>(null)
  const [licenseModal, setLicenseModal] = useState<any>(null)
  const [warrantyModal, setWarrantyModal] = useState<any>(null)

  useEffect(() => { getAssets(filters).then((d: any) => { setAssets(d); setLoading(false) }) }, [filters])

  function openNew() { setEditing(null); setForm({ type: 'OTHER', status: 'ACTIVE' }); setFormOpen(true); getCustomersForAsset().then(setCustomers as any) }
  function openEdit(a: any) {
    setEditing(a)
    setForm({ type: a.type, manufacturer: a.manufacturer || '', model: a.model || '', serialNumber: a.serialNumber, firmwareVersion: a.firmwareVersion || '', hostname: a.hostname || '', ipAddress: a.ipAddress || '', customerId: a.customerId || '', siteId: a.siteId || '', status: a.status, purchaseDate: a.purchaseDate?.split('T')[0] || '', purchaseCost: a.purchaseCost?.toString() || '', notes: a.notes || '' })
    setFormOpen(true)
    getCustomersForAsset().then(setCustomers as any)
    if (a.customerId) getSitesForAsset(a.customerId).then(setSites as any)
  }

  async function handleSave() {
    const result = await saveAsset(form, editing?.id)
    if (result.success) { setFormOpen(false); getAssets(filters).then((d: any) => setAssets(d)) }
  }

  async function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.csv'
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return
      const fd = new FormData(); fd.append('file', file)
      const result = await importAssetsCSV(fd)
      if (result.success) { alert(`Imported ${(result as any).data?.imported} assets.`); getAssets(filters).then((d: any) => setAssets(d)) }
      else alert((result as any).error)
    }
    input.click()
  }

  return (
    <Card title="Assets">
      <div className="flex flex-wrap gap-2 mb-4">
        <input type="text" placeholder="Search tag, serial, model..." value={filters.search || ''}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="flex-1 min-w-[180px] px-3 py-2 bg-dark border border-white/10 rounded-md text-white text-sm focus:outline-none focus:border-teal" />
        <select value={filters.type || ''} onChange={(e) => setFilters({ ...filters, type: e.target.value || '' })} className="px-3 py-2 bg-dark border border-white/10 rounded-md text-white text-sm">
          <option value="">All Types</option><option>FIREWALL</option><option>ROUTER</option><option>SWITCH</option><option>SERVER</option><option>UPS</option><option>WORKSTATION</option><option>OTHER</option></select>
        <select value={filters.status || ''} onChange={(e) => setFilters({ ...filters, status: e.target.value || '' })} className="px-3 py-2 bg-dark border border-white/10 rounded-md text-white text-sm">
          <option value="">All Status</option><option>ACTIVE</option><option>INACTIVE</option><option>DECOMMISSIONED</option><option>RMA</option></select>
        <Button size="sm" onClick={openNew}>+ Add Asset</Button>
        <Button variant="ghost" size="sm" onClick={handleImport}>📤 Import CSV</Button>
      </div>

      {loading ? <div className="text-white/40 text-sm">Loading...</div> : assets.length === 0 ? <div className="text-white/40 text-sm">No assets found.</div> : (
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/10 text-left text-white/60"><th className="py-2 px-2 font-medium">Tag</th><th className="py-2 px-2 font-medium">Type</th><th className="py-2 px-2 font-medium">Mfr</th><th className="py-2 px-2 font-medium">Model</th><th className="py-2 px-2 font-medium">Serial</th><th className="py-2 px-2 font-medium">Customer/Site</th><th className="py-2 px-2 font-medium">Status</th><th className="py-2 px-2 font-medium">Lic</th><th className="py-2 px-2 font-medium">War</th><th className="py-2 px-2 font-medium">Actions</th></tr></thead>
          <tbody>{assets.map((a: any) => (
            <tr key={a.id} className="border-b border-white/5 hover:bg-white/5">
              <td className="py-2 px-2 font-mono text-teal text-xs"><button onClick={() => router.push(`/dashboard/assets/${a.id}`)}>{a.assetTag}</button></td>
              <td className="py-2 px-2">{typeBadge(a.type)}</td>
              <td className="py-2 px-2 text-white/60 text-xs">{a.manufacturer || '—'}</td>
              <td className="py-2 px-2 text-white/60 text-xs">{a.model || '—'}</td>
              <td className="py-2 px-2 text-white/60 text-xs font-mono">{a.serialNumber?.substring(0, 12)}...</td>
              <td className="py-2 px-2 text-white/60 text-xs">{a.customer?.name || 'Internal'} {a.site?.name || ''}</td>
              <td className="py-2 px-2">{statusBadge(a.status)}</td>
              <td className="py-2 px-2"><span className="flex items-center gap-1">{a._count?.licenses || 0}<ExpiryDot date={a.licenses?.[0]?.endDate} /></span></td>
              <td className="py-2 px-2"><span className="flex items-center gap-1">{a._count?.warranties || 0}<ExpiryDot date={a.warranties?.[0]?.endDate} /></span></td>
              <td className="py-2 px-2"><div className="flex gap-1"><button onClick={() => openEdit(a)} className="text-teal hover:text-teal-dark text-xs">Edit</button><button onClick={async () => { if (confirm('Delete?')) { await deleteAsset(a.id); getAssets(filters).then((d: any) => setAssets(d)) } }} className="text-red-400 hover:text-red-300 text-xs">Del</button></div></td>
            </tr>
          ))}</tbody></table></div>
      )}

      {/* Asset Form SlideOver */}
      <SlideOver title={editing ? 'Edit Asset' : 'Add Asset'} open={formOpen} onClose={() => setFormOpen(false)} size="lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-white/70 mb-1">Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option>FIREWALL</option><option>ROUTER</option><option>SWITCH</option><option>SERVER</option><option>UPS</option><option>WORKSTATION</option><option>OTHER</option></select></div>
            <div><label className="block text-sm font-medium text-white/70 mb-1">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option>ACTIVE</option><option>INACTIVE</option><option>DECOMMISSIONED</option><option>RMA</option></select></div>
          </div>
          <Input label="Manufacturer" value={form.manufacturer || ''} onChange={(e: any) => setForm({ ...form, manufacturer: e.target.value })} />
          <Input label="Model" value={form.model || ''} onChange={(e: any) => setForm({ ...form, model: e.target.value })} />
          <Input label="Serial Number" value={form.serialNumber || ''} onChange={(e: any) => setForm({ ...form, serialNumber: e.target.value })} required />
          <Input label="Firmware Version" value={form.firmwareVersion || ''} onChange={(e: any) => setForm({ ...form, firmwareVersion: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Hostname" value={form.hostname || ''} onChange={(e: any) => setForm({ ...form, hostname: e.target.value })} />
            <Input label="IP Address" value={form.ipAddress || ''} onChange={(e: any) => setForm({ ...form, ipAddress: e.target.value })} />
          </div>
          <div><label className="block text-sm font-medium text-white/70 mb-1">Customer</label><select value={form.customerId || ''} onChange={(e) => { setForm({ ...form, customerId: e.target.value, siteId: '' }); if (e.target.value) getSitesForAsset(e.target.value).then(setSites as any) }} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option value="">Internal</option>{customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-white/70 mb-1">Site</label><select value={form.siteId || ''} onChange={(e) => setForm({ ...form, siteId: e.target.value })} className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white"><option value="">--</option>{sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Purchase Date" type="date" value={form.purchaseDate || ''} onChange={(e: any) => setForm({ ...form, purchaseDate: e.target.value })} />
            <Input label="Purchase Cost" type="number" value={form.purchaseCost || ''} onChange={(e: any) => setForm({ ...form, purchaseCost: e.target.value })} />
          </div>
          <div className="flex gap-3 justify-end pt-4"><Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSave}>Save</Button></div>
        </div>
      </SlideOver>
    </Card>
  )
}
