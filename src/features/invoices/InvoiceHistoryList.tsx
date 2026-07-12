'use client'

import { useEffect, useState } from 'react'
import { Card, Badge, Button } from '@/lib/ui'
import { getInvoices, deleteInvoice, exportInvoicesJSON, importInvoicesJSON } from './actions'

type SavedInvoice = {
  id: string
  invoiceNumber: string
  type: string
  customer?: { name: string } | null
  grandTotal: number
  savedAt: string
}

export function InvoiceHistoryList({
  refresh,
  onEdit,
}: {
  refresh: number
  onEdit: (invoice: any) => void
}) {
  const [invoices, setInvoices] = useState<SavedInvoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInvoices().then((data) => {
      setInvoices(data as any)
      setLoading(false)
    })
  }, [refresh])

  async function handleDelete(id: string) {
    if (!confirm('Delete this invoice?')) return
    await deleteInvoice(id)
    setInvoices((prev) => prev.filter((inv) => inv.id !== id))
  }

  async function handleExport() {
    const json = await exportInvoicesJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jeneus-invoices-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const formData = new FormData()
      formData.append('file', file)
      const result = await importInvoicesJSON(formData)
      if (result.success) {
        alert(`Imported ${result.data?.imported} invoices (${result.data?.skipped} skipped).`)
        getInvoices().then((data) => setInvoices(data as any))
      } else {
        alert((result as any).error || 'Import failed')
      }
    }
    input.click()
  }

  return (
    <Card title="Invoice History">
      <div className="flex gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={handleExport}>
          📥 Export All
        </Button>
        <Button variant="ghost" size="sm" onClick={handleImport}>
          📤 Import
        </Button>
      </div>

      {loading ? (
        <div className="text-white/40 text-sm">Loading...</div>
      ) : invoices.length === 0 ? (
        <div className="text-white/40 text-sm">No saved invoices yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/60">
                <th className="py-2 px-3 font-medium">Number</th>
                <th className="py-2 px-3 font-medium">Customer</th>
                <th className="py-2 px-3 font-medium">Type</th>
                <th className="py-2 px-3 font-medium text-right">Total</th>
                <th className="py-2 px-3 font-medium">Date</th>
                <th className="py-2 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2 px-3 font-mono text-white text-xs">{inv.invoiceNumber}</td>
                  <td className="py-2 px-3 text-white/80">{inv.customer?.name || '—'}</td>
                  <td className="py-2 px-3">
                    <Badge variant={inv.type === 'PROFORMA' ? 'blue' : 'green'}>
                      {inv.type === 'PROFORMA' ? 'Proforma' : 'Final'}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-white">
                    {Number(inv.grandTotal).toLocaleString('en-US')} XAF
                  </td>
                  <td className="py-2 px-3 text-white/60 text-xs">
                    {new Date(inv.savedAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(inv)}
                        className="text-teal hover:text-teal-dark text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
