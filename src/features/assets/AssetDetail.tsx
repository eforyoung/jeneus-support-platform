'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, Button, Card, Modal, Input } from '@/lib/ui'
import { getAsset, saveLicense, deleteLicense, saveWarranty, deleteWarranty } from './actions'

const typeBadge = (t: string) => {
  const m: Record<string, any> = { FIREWALL: 'red', ROUTER: 'amber', SWITCH: 'blue', SERVER: 'purple', UPS: 'green', WORKSTATION: 'grey', OTHER: 'grey' }
  return <Badge variant={m[t] || 'grey'}>{t}</Badge>
}
const statusBadge = (s: string) => {
  const m: Record<string, any> = { ACTIVE: 'green', INACTIVE: 'amber', DECOMMISSIONED: 'red', RMA: 'blue' }
  return <Badge variant={m[s] || 'grey'}>{s}</Badge>
}

type ModalType = 'license' | 'warranty' | null

export function AssetDetail({ id }: { id: string }) {
  const router = useRouter()
  const [asset, setAsset] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modalType, setModalType] = useState<ModalType>(null)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [licenseForm, setLicenseForm] = useState<Record<string, string>>({})
  const [warrantyForm, setWarrantyForm] = useState<Record<string, string>>({})

  useEffect(() => { getAsset(id).then((d: any) => { setAsset(d); setLoading(false) }) }, [id])

  async function handleSaveLicense() {
    await saveLicense({ ...licenseForm, assetId: id }, editingItem?.id)
    setModalType(null); setEditingItem(null)
    getAsset(id).then((d: any) => setAsset(d))
  }
  async function handleSaveWarranty() {
    await saveWarranty({ ...warrantyForm, assetId: id }, editingItem?.id)
    setModalType(null); setEditingItem(null)
    getAsset(id).then((d: any) => setAsset(d))
  }

  if (loading) return <div className="text-white/40">Loading...</div>
  if (!asset) return <div className="text-white/40">Asset not found.</div>

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/assets')} className="text-teal hover:text-teal-dark text-sm">← Back</button>
        <h2 className="text-xl font-semibold text-white font-mono">{asset.assetTag}</h2>
        {typeBadge(asset.type)}
        {statusBadge(asset.status)}
      </div>

      {/* Overview */}
      <Card title="Asset Information">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><span className="text-white/50">Type:</span> <span className="text-white">{asset.type}</span></div>
          <div><span className="text-white/50">Manufacturer:</span> <span className="text-white">{asset.manufacturer || '—'}</span></div>
          <div><span className="text-white/50">Model:</span> <span className="text-white">{asset.model || '—'}</span></div>
          <div><span className="text-white/50">Serial:</span> <span className="text-white font-mono">{asset.serialNumber}</span></div>
          <div><span className="text-white/50">Firmware:</span> <span className="text-white">{asset.firmwareVersion || '—'}</span></div>
          <div><span className="text-white/50">Hostname:</span> <span className="text-white">{asset.hostname || '—'}</span></div>
          <div><span className="text-white/50">IP:</span> <span className="text-white font-mono">{asset.ipAddress || '—'}</span></div>
          <div><span className="text-white/50">Status:</span> <span className="text-white">{asset.status}</span></div>
          <div><span className="text-white/50">Customer:</span> <span className="text-white">{asset.customer?.name || 'Internal'}</span></div>
          <div><span className="text-white/50">Site:</span> <span className="text-white">{asset.site?.name || '—'}</span></div>
          <div><span className="text-white/50">Purchase Date:</span> <span className="text-white">{asset.purchaseDate ? formatDate(asset.purchaseDate) : '—'}</span></div>
          <div><span className="text-white/50">Purchase Cost:</span> <span className="text-white">{asset.purchaseCost ? Number(asset.purchaseCost).toLocaleString() + ' XAF' : '—'}</span></div>
        </div>
        {asset.notes && <div className="mt-3 p-3 bg-dark rounded text-white/60 text-sm">{asset.notes}</div>}
        <div className="text-xs text-white/40 mt-2">Created: {formatDate(asset.createdAt)}</div>
      </Card>

      {/* Licenses */}
      <Card title="Licenses">
        <Button size="sm" onClick={() => { setEditingItem(null); setLicenseForm({}); setModalType('license') }} className="mb-3">+ Add License</Button>
        {asset.licenses?.length === 0 ? <div className="text-white/40 text-sm">No licenses.</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/10 text-left text-white/60"><th className="py-2 px-3">Software</th><th className="py-2 px-3">Key</th><th className="py-2 px-3">Vendor</th><th className="py-2 px-3">Seats</th><th className="py-2 px-3">Expiry</th><th className="py-2 px-3">Actions</th></tr></thead>
            <tbody>{asset.licenses?.map((l: any) => {
              const daysLeft = Math.ceil((new Date(l.endDate).getTime() - Date.now()) / 86400000)
              return (
                <tr key={l.id} className="border-b border-white/5">
                  <td className="py-2 px-3 text-white">{l.softwareName}</td>
                  <td className="py-2 px-3 text-white/60 font-mono text-xs">{l.licenseKey?.substring(0, 16) || '—'}</td>
                  <td className="py-2 px-3 text-white/60">{l.vendor || '—'}</td>
                  <td className="py-2 px-3 text-white/60 text-center">{l.seats}</td>
                  <td className="py-2 px-3"><span className={daysLeft < 0 ? 'text-red-400' : daysLeft < 30 ? 'text-amber-400' : 'text-green-400'}>{formatDate(l.endDate)} ({daysLeft}d)</span></td>
                  <td className="py-2 px-3"><div className="flex gap-1"><button onClick={() => { setEditingItem(l); setLicenseForm({ softwareName: l.softwareName, licenseKey: l.licenseKey || '', vendor: l.vendor || '', vendorContact: l.vendorContact || '', seats: String(l.seats), startDate: l.startDate?.split('T')[0], endDate: l.endDate?.split('T')[0] }); setModalType('license') }} className="text-teal text-xs">Edit</button><button onClick={async () => { if (confirm('Delete?')) { await deleteLicense(l.id); getAsset(id).then((d: any) => setAsset(d)) } }} className="text-red-400 text-xs">Del</button></div></td>
                </tr>
              )
            })}</tbody></table></div>
        )}
      </Card>

      {/* Warranties */}
      <Card title="Warranties">
        <Button size="sm" onClick={() => { setEditingItem(null); setWarrantyForm({}); setModalType('warranty') }} className="mb-3">+ Add Warranty</Button>
        {asset.warranties?.length === 0 ? <div className="text-white/40 text-sm">No warranties.</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/10 text-left text-white/60"><th className="py-2 px-3">Type</th><th className="py-2 px-3">Provider</th><th className="py-2 px-3">Contract</th><th className="py-2 px-3">Expiry</th><th className="py-2 px-3">Actions</th></tr></thead>
            <tbody>{asset.warranties?.map((w: any) => {
              const daysLeft = Math.ceil((new Date(w.endDate).getTime() - Date.now()) / 86400000)
              return (
                <tr key={w.id} className="border-b border-white/5">
                  <td className="py-2 px-3 text-white">{w.type || '—'}</td>
                  <td className="py-2 px-3 text-white/60">{w.provider || '—'}</td>
                  <td className="py-2 px-3 text-white/60 font-mono text-xs">{w.contractNumber || '—'}</td>
                  <td className="py-2 px-3"><span className={daysLeft < 0 ? 'text-red-400' : daysLeft < 30 ? 'text-amber-400' : 'text-green-400'}>{formatDate(w.endDate)} ({daysLeft}d)</span></td>
                  <td className="py-2 px-3"><div className="flex gap-1"><button onClick={() => { setEditingItem(w); setWarrantyForm({ type: w.type || '', provider: w.provider || '', coverage: w.coverage || '', contractNumber: w.contractNumber || '', startDate: w.startDate?.split('T')[0], endDate: w.endDate?.split('T')[0] }); setModalType('warranty') }} className="text-teal text-xs">Edit</button><button onClick={async () => { if (confirm('Delete?')) { await deleteWarranty(w.id); getAsset(id).then((d: any) => setAsset(d)) } }} className="text-red-400 text-xs">Del</button></div></td>
                </tr>
              )
            })}</tbody></table></div>
        )}
      </Card>

      {/* Audit History */}
      {asset.audits?.length > 0 && (
        <Card title="Change History">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {asset.audits?.map((a: any) => (
              <div key={a.id} className="border-l-2 border-teal/30 pl-3 py-1">
                <div className="text-white text-xs">{a.user?.name} changed <span className="text-teal">{a.field}</span></div>
                <div className="text-white/50 text-xs">{a.oldValue && <span className="line-through mr-1">{a.oldValue}</span>}→ <span className="text-white">{a.newValue}</span></div>
                <div className="text-white/30 text-xs">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* License Modal */}
      {modalType === 'license' && (
        <Modal title={editingItem ? 'Edit License' : 'Add License'} open onClose={() => setModalType(null)}>
          <div className="space-y-3">
            <Input label="Software Name" value={licenseForm.softwareName || ''} onChange={(e: any) => setLicenseForm({ ...licenseForm, softwareName: e.target.value })} />
            <Input label="License Key" value={licenseForm.licenseKey || ''} onChange={(e: any) => setLicenseForm({ ...licenseForm, licenseKey: e.target.value })} />
            <Input label="Vendor" value={licenseForm.vendor || ''} onChange={(e: any) => setLicenseForm({ ...licenseForm, vendor: e.target.value })} />
            <Input label="Vendor Contact" value={licenseForm.vendorContact || ''} onChange={(e: any) => setLicenseForm({ ...licenseForm, vendorContact: e.target.value })} />
            <Input label="Seats" type="number" value={licenseForm.seats || '1'} onChange={(e: any) => setLicenseForm({ ...licenseForm, seats: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date" type="date" value={licenseForm.startDate || ''} onChange={(e: any) => setLicenseForm({ ...licenseForm, startDate: e.target.value })} />
              <Input label="End Date" type="date" value={licenseForm.endDate || ''} onChange={(e: any) => setLicenseForm({ ...licenseForm, endDate: e.target.value })} />
            </div>
            <div className="flex gap-3 justify-end pt-4"><Button variant="ghost" size="sm" onClick={() => setModalType(null)}>Cancel</Button><Button size="sm" onClick={handleSaveLicense}>Save</Button></div>
          </div>
        </Modal>
      )}

      {/* Warranty Modal */}
      {modalType === 'warranty' && (
        <Modal title={editingItem ? 'Edit Warranty' : 'Add Warranty'} open onClose={() => setModalType(null)}>
          <div className="space-y-3">
            <Input label="Type" value={warrantyForm.type || ''} onChange={(e: any) => setWarrantyForm({ ...warrantyForm, type: e.target.value })} />
            <Input label="Provider" value={warrantyForm.provider || ''} onChange={(e: any) => setWarrantyForm({ ...warrantyForm, provider: e.target.value })} />
            <Input label="Coverage" value={warrantyForm.coverage || ''} onChange={(e: any) => setWarrantyForm({ ...warrantyForm, coverage: e.target.value })} />
            <Input label="Contract Number" value={warrantyForm.contractNumber || ''} onChange={(e: any) => setWarrantyForm({ ...warrantyForm, contractNumber: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date" type="date" value={warrantyForm.startDate || ''} onChange={(e: any) => setWarrantyForm({ ...warrantyForm, startDate: e.target.value })} />
              <Input label="End Date" type="date" value={warrantyForm.endDate || ''} onChange={(e: any) => setWarrantyForm({ ...warrantyForm, endDate: e.target.value })} />
            </div>
            <div className="flex gap-3 justify-end pt-4"><Button variant="ghost" size="sm" onClick={() => setModalType(null)}>Cancel</Button><Button size="sm" onClick={handleSaveWarranty}>Save</Button></div>
          </div>
        </Modal>
      )}
    </div>
  )
}
