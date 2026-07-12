'use client'

import { Button } from '@/lib/ui'
import type { SubSection, InvoiceItemData } from './types'
import { createEmptyItem } from './types'

export function ItemsTable({
  subSection,
  onChange,
  onRemove,
}: {
  subSection: SubSection
  onChange: (updated: SubSection) => void
  onRemove: () => void
}) {
  function updateItem(index: number, item: InvoiceItemData) {
    const items = [...subSection.items]
    items[index] = item
    onChange({ ...subSection, items })
  }

  function addItem() {
    onChange({ ...subSection, items: [...subSection.items, createEmptyItem()] })
  }

  function removeItem(index: number) {
    const items = subSection.items.filter((_, i) => i !== index)
    onChange({ ...subSection, items: items.length === 0 ? [createEmptyItem()] : items })
  }

  function updateHeading(heading: string) {
    onChange({ ...subSection, heading })
  }

  return (
    <div className="border border-white/10 rounded-lg p-3 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={subSection.heading}
          onChange={(e) => updateHeading(e.target.value)}
          placeholder="Sub-section heading (e.g. Equipment, Services)"
          className="flex-1 px-2 py-1 bg-dark border border-white/10 rounded text-sm text-white focus:outline-none focus:border-teal"
        />
        <button
          onClick={onRemove}
          className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
          title="Remove sub-section"
        >
          ✕
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/60 text-xs">
              <th className="py-1 px-1 text-left font-medium">Description</th>
              <th className="py-1 px-1 text-center font-medium w-16">Qty</th>
              <th className="py-1 px-1 text-right font-medium w-24">Unit Price</th>
              <th className="py-1 px-1 text-right font-medium w-24">Total</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {subSection.items.map((item, idx) => {
              const itemTotal = (item.qty || 0) * (item.unitPrice || 0)
              return (
                <tr key={item.id} className="border-b border-white/5">
                  <td className="py-1 px-1">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(idx, { ...item, description: e.target.value })}
                      placeholder="Item description"
                      className="w-full px-1 py-1 bg-transparent text-white text-sm focus:outline-none focus:bg-dark rounded"
                    />
                  </td>
                  <td className="py-1 px-1">
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateItem(idx, { ...item, qty: parseInt(e.target.value) || 0 })}
                      min={1}
                      className="w-14 text-center px-1 py-1 bg-dark border border-white/10 rounded text-white text-sm"
                    />
                  </td>
                  <td className="py-1 px-1">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, { ...item, unitPrice: parseFloat(e.target.value) || 0 })}
                      min={0}
                      className="w-24 text-right px-1 py-1 bg-dark border border-white/10 rounded text-white text-sm"
                    />
                  </td>
                  <td className="py-1 px-1 text-right font-semibold text-white">
                    {itemTotal.toLocaleString('en-US')}
                  </td>
                  <td className="py-1 px-1">
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-red-400 hover:text-red-300 text-lg leading-none"
                      title="Remove item"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-2">
        <Button variant="ghost" size="sm" onClick={addItem}>
          + Add Item
        </Button>
        <div className="text-sm text-white/70 font-semibold">
          Subtotal: {subSection.items.reduce((s, it) => s + (it.qty || 0) * (it.unitPrice || 0), 0).toLocaleString('en-US')} XAF
        </div>
      </div>
    </div>
  )
}
