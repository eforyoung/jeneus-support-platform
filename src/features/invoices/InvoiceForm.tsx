'use client'

import { useState, useEffect } from 'react'
import { Button, Input, Textarea, Card, Badge } from '@/lib/ui'
import { saveInvoice, getCustomersForDropdown, getCompanySettings, getInvoice } from './actions'
import { InvoicePreview } from './InvoicePreview'
import { generatePDF } from './InvoicePDF'
import { ItemsTable } from './ItemsTable'
import { InvoiceHistoryList } from './InvoiceHistoryList'
import type { InvoiceFormData, SubSection } from './types'
import { createEmptyItem, createEmptySubSection } from './types'

type CustomerInfo = { id: string; name: string; address: string | null; bp: string | null; niu: string | null; rc: string | null }

export function InvoiceForm() {
  const [formData, setFormData] = useState<InvoiceFormData>({
    type: 'proforma',
    invoiceNumber: '',
    customerId: '',
    customerName: '',
    customerAddress: '',
    customerBp: '',
    customerNiu: '',
    customerRc: '',
    applyVat: true,
    accountOwner: '',
    terms: '1. Payment is due within 30 days of invoice date.\n2. All prices are in XAF (CFA Francs).\n3. Late payments may incur additional charges.',
    categories: { nrc: [], mrc: [], arc: [] },
  })
  const [customers, setCustomers] = useState<CustomerInfo[]>([])
  const [companySettings, setCompanySettings] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [refreshHistory, setRefreshHistory] = useState(0)

  useEffect(() => {
    getCustomersForDropdown().then(setCustomers)
    getCompanySettings().then(setCompanySettings)
  }, [])

  function updateField<K extends keyof InvoiceFormData>(key: K, value: InvoiceFormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function fillFromCustomer(customerId: string) {
    const c = customers.find((x) => x.id === customerId)
    if (!c) return
    setFormData((prev) => ({
      ...prev,
      customerId: c.id,
      customerName: c.name,
      customerAddress: c.address || '',
      customerBp: c.bp || '',
      customerNiu: c.niu || '',
      customerRc: c.rc || '',
    }))
  }

  function addSubSection(category: 'nrc' | 'mrc' | 'arc') {
    setFormData((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: [...prev.categories[category], createEmptySubSection()],
      },
    }))
  }

  function updateSubSection(category: 'nrc' | 'mrc' | 'arc', index: number, sub: SubSection) {
    setFormData((prev) => {
      const subs = [...prev.categories[category]]
      subs[index] = sub
      return { ...prev, categories: { ...prev.categories, [category]: subs } }
    })
  }

  function removeSubSection(category: 'nrc' | 'mrc' | 'arc', index: number) {
    if (!confirm('Remove this sub-section and all its items?')) return
    setFormData((prev) => {
      const subs = prev.categories[category].filter((_, i) => i !== index)
      return { ...prev, categories: { ...prev.categories, [category]: subs } }
    })
  }

  async function handleSave() {
    if (!formData.customerName.trim()) {
      setMessage({ type: 'error', text: 'Client name is required.' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const result = await saveInvoice(formData, editingId || undefined)
      setSaving(false)
      if (result.success) {
        const invNum = result.data?.number || ''
        setMessage({ type: 'success', text: `Invoice ${invNum} saved.` })
        setRefreshHistory((x) => x + 1)
        // Store the invoice number so preview shows it
        setFormData((prev) => ({ ...prev, invoiceNumber: invNum }))
        if (!editingId) {
          setFormData((prev) => ({
            ...prev,
            invoiceNumber: '',
            customerId: '',
            customerName: '',
            customerAddress: '',
            customerBp: '',
            customerNiu: '',
            customerRc: '',
            categories: { nrc: [], mrc: [], arc: [] },
          }))
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Save failed' })
      }
    } catch (err: any) {
      setSaving(false)
      setMessage({ type: 'error', text: err?.message || 'Save failed — check the console' })
    }
    setTimeout(() => setMessage(null), 6000)
  }

  async function handlePDF() {
    const filename = formData.invoiceNumber
      ? `Invoice-${formData.invoiceNumber.replace(/\//g, '-')}`
      : 'Invoice-draft'
    await generatePDF('invoice-preview', filename)
  }

  async function handleEdit(invoice: any) {
    try {
      setMessage(null)
      setSaving(true)
      const fullInvoice = await getInvoice(invoice.id)
      setSaving(false)
      if (!fullInvoice) {
        setMessage({ type: 'error', text: 'Could not load invoice — it may have been deleted.' })
        return
      }
      const cats = { nrc: [] as SubSection[], mrc: [] as SubSection[], arc: [] as SubSection[] }
      const items = Array.isArray(fullInvoice.items) ? fullInvoice.items : []
      const grouped: Record<string, SubSection> = {}
      for (const item of items) {
        const cat = ((item.category || 'NRC') as string).toLowerCase() as 'nrc' | 'mrc' | 'arc'
        const key = `${cat}::${item.heading || ''}`
        if (!grouped[key]) {
          grouped[key] = { id: crypto.randomUUID(), heading: item.heading || '', items: [] }
        }
        grouped[key].items.push({
          id: crypto.randomUUID(),
          description: item.description || '',
          qty: Number(item.qty) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          total: Number(item.total) || 0,
        })
      }
      for (const key of Object.keys(grouped)) {
        const cat = key.split('::')[0] as 'nrc' | 'mrc' | 'arc'
        cats[cat].push(grouped[key])
      }

      setEditingId(fullInvoice.id)
      setFormData({
        type: (fullInvoice.type || 'PROFORMA').toLowerCase() as 'proforma' | 'final',
        invoiceNumber: fullInvoice.invoiceNumber || '',
        customerId: fullInvoice.customerId || '',
        customerName: fullInvoice.customer?.name || '',
        customerAddress: fullInvoice.customer?.address || '',
        customerBp: fullInvoice.customer?.bp || '',
        customerNiu: fullInvoice.customer?.niu || '',
        customerRc: fullInvoice.customer?.rc || '',
        applyVat: fullInvoice.applyVat ?? true,
        accountOwner: fullInvoice.accountOwner || '',
        terms: fullInvoice.terms || '',
        categories: cats,
      })
    } catch (err: any) {
      setSaving(false)
      setMessage({ type: 'error', text: `Edit failed: ${err?.message || 'Unknown error'}` })
    }
  }

  function handleCancelEdit() {
    setEditingId(null)
    setFormData({
      type: 'proforma', invoiceNumber: '', customerId: '', customerName: '',
      customerAddress: '', customerBp: '', customerNiu: '', customerRc: '',
      applyVat: true, accountOwner: '', terms: formData.terms,
      categories: { nrc: [], mrc: [], arc: [] },
    })
  }

  return (
    <div>
      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-4">
          {/* Invoice Type & Header */}
          <Card>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => updateField('type', 'proforma')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  formData.type === 'proforma' ? 'bg-teal text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                Proforma Invoice
              </button>
              <button
                onClick={() => updateField('type', 'final')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  formData.type === 'final' ? 'bg-teal text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                Final Invoice
              </button>
              {editingId && (
                <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="ml-auto">
                  Cancel Edit
                </Button>
              )}
            </div>
            <Input label="Account Manager" value={formData.accountOwner} onChange={(e) => updateField('accountOwner', e.target.value)} />
          </Card>

          {/* Client Info */}
          <Card title="Client Information">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Customer</label>
                <select
                  value={formData.customerId}
                  onChange={(e) => fillFromCustomer(e.target.value)}
                  className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white focus:outline-none focus:border-teal"
                >
                  <option value="">-- Select a customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <Input label="Client Name" value={formData.customerName} onChange={(e) => updateField('customerName', e.target.value)} required />
              <Input label="Address" value={formData.customerAddress} onChange={(e) => updateField('customerAddress', e.target.value)} />
              <Input label="BP / PO Box" value={formData.customerBp} onChange={(e) => updateField('customerBp', e.target.value)} />
              <Input label="NIU Number" value={formData.customerNiu} onChange={(e) => updateField('customerNiu', e.target.value)} />
              <Input label="RC Number" value={formData.customerRc} onChange={(e) => updateField('customerRc', e.target.value)} />
            </div>
          </Card>

          {/* Categories */}
          {(['nrc', 'mrc', 'arc'] as const).map((cat) => {
            const catLabels = { nrc: 'Non-Recurrent Charge (NRC)', mrc: 'Monthly Recurrent Charge (MRC)', arc: 'Annual Recurrent Charge (ARC)' }
            return (
              <Card key={cat} title={catLabels[cat]}>
                {formData.categories[cat].map((sub, idx) => (
                  <ItemsTable
                    key={sub.id}
                    subSection={sub}
                    onChange={(updated) => updateSubSection(cat, idx, updated)}
                    onRemove={() => removeSubSection(cat, idx)}
                  />
                ))}
                <Button variant="ghost" size="sm" onClick={() => addSubSection(cat)} className="mt-2">
                  + Add Sub-Section
                </Button>
              </Card>
            )
          })}

          {/* VAT & Terms */}
          <Card title="Options">
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={formData.applyVat}
                onChange={(e) => updateField('applyVat', e.target.checked)}
                className="rounded border-white/20 bg-dark"
              />
              <span className="text-sm text-white/80">Apply VAT (19.25%)</span>
            </label>
            <Textarea
              label="Terms & Conditions"
              value={formData.terms}
              onChange={(e) => updateField('terms', e.target.value)}
              rows={4}
            />
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? 'Saving...' : editingId ? 'Update Invoice' : 'Save Invoice'}
            </Button>
            <Button variant="ghost" size="lg" onClick={handlePDF}>
              Generate PDF
            </Button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:sticky lg:top-20 self-start">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Preview</h3>
          <InvoicePreview data={formData} companySettings={companySettings} />
        </div>
      </div>

      {/* History */}
      <div className="mt-8">
        <InvoiceHistoryList
          refresh={refreshHistory}
          onEdit={handleEdit}
        />
      </div>
    </div>
  )
}
