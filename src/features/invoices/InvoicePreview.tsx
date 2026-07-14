'use client'

import type { InvoiceFormData } from './types'
import { numberToWords } from './numberToWords'
import { getTodayFormatted } from './types'

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function InvoicePreview({
  data,
  companySettings,
}: {
  data: InvoiceFormData
  companySettings: Record<string, any> | null
}) {
  const nrcTotal = data.categories.nrc.reduce((s, sub) => s + sub.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0), 0)
  const mrcTotal = data.categories.mrc.reduce((s, sub) => s + sub.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0), 0)
  const arcTotal = data.categories.arc.reduce((s, sub) => s + sub.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0), 0)
  const subtotal = nrcTotal + mrcTotal + arcTotal
  const vatRate = companySettings ? Number(companySettings.vatRate) / 100 : 0.1925
  const vatAmount = data.applyVat ? Math.round(subtotal * vatRate) : 0
  const grandTotal = subtotal + vatAmount

  const amountInWords = numberToWords(Math.round(grandTotal))
  const typeLabel = data.type === 'proforma' ? 'PROFORMA INVOICE' : 'INVOICE'
  const formattedDate = getTodayFormatted()
  const cs = companySettings

  // Format invoice number for preview — show real number if set, show placeholder pattern if not
  const displayNumber = data.invoiceNumber || 'XXXX/JE/DD/MM/YYYY'

  // Client info lines
  const clientLines: string[] = [esc(data.customerName || '')]
  if (data.customerAddress) clientLines.push(data.customerAddress)
  if (data.customerBp) clientLines.push(data.customerBp)
  if (data.customerNiu) clientLines.push('NIU: ' + data.customerNiu)
  if (data.customerRc) clientLines.push('RC: ' + data.customerRc)

  const renderSection = (title: string, subs: InvoiceFormData['categories']['nrc']) => {
    if (subs.length === 0) return null
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontWeight: 700, fontSize: '11pt', marginBottom: 6, color: '#1e3a5f',
          borderBottom: '1px solid #1e3a5f', paddingBottom: 2,
        }}>
          {title}
        </div>
        {subs.map((sub) => {
          const subTotal = sub.items.reduce((s, it) => s + it.qty * it.unitPrice, 0)
          return (
            <div key={sub.id} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: '10pt', marginBottom: 4, color: '#1e3a5f' }}>
                {esc(sub.heading || 'Services')}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600, fontSize: '9pt', color: '#64748b' }}>Description</th>
                    <th style={{ textAlign: 'center', padding: '4px 8px', fontWeight: 600, fontSize: '9pt', color: '#64748b', width: 50 }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600, fontSize: '9pt', color: '#64748b', width: 120 }}>Unit Price (XAF)</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600, fontSize: '9pt', color: '#64748b', width: 120 }}>Total Price (XAF)</th>
                  </tr>
                </thead>
                <tbody>
                  {sub.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ color: '#999', textAlign: 'center', padding: '8px', fontSize: '10pt' }}>No items</td>
                    </tr>
                  ) : (
                    sub.items.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '10pt' }}>
                        <td style={{ padding: '4px 8px' }}>{esc(item.description || '—')}</td>
                        <td style={{ textAlign: 'center', padding: '4px 8px' }}>{item.qty}</td>
                        <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(item.unitPrice)}</td>
                        <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(item.qty * item.unitPrice)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div style={{ textAlign: 'right', fontSize: '9pt', fontWeight: 600, color: '#1e3a5f' }}>
                {esc(sub.heading || 'Subtotal')}: {fmt(subTotal)} XAF
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div id="invoice-preview" style={{
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '10pt',
      color: '#1e293b',
      background: '#fff',
      padding: '40px 36px',
      borderRadius: 4,
      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
      lineHeight: 1.6,
      maxWidth: 760,
      margin: '0 auto',
    }}>
      {/* ─── Header ─── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18, borderBottom: '1px solid #cbd5e1', paddingBottom: 14 }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top', width: 100 }}>
              <img src="/logo.jpg" alt="JENEUS CO LTD" style={{ maxWidth: 90, maxHeight: 65 }} />
            </td>
            <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
              <div style={{ fontSize: '14pt', fontWeight: 700, color: '#1e3a5f', marginBottom: 2 }}>
                {cs?.companyName || 'JENEUS CO. LTD'}
              </div>
              <div style={{ fontSize: '9pt', color: '#334155' }}>
                {(cs?.companyAddress || 'Immeuble Commercial Bank, 4th Floor').split('\n').map((l: string, i: number) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
              <div style={{ fontSize: '9pt', color: '#334155' }}>Rue Njo Njo Bonapriso</div>
              <div style={{ fontSize: '9pt', color: '#334155' }}>NIU: {cs?.companyNiu || 'M092217601761D'}</div>
              <div style={{ fontSize: '9pt', color: '#334155' }}>RC: {cs?.companyRc || 'RC/DLA/2022/B/5078'}</div>
              {data.accountOwner && (
                <div style={{ fontSize: '9pt', color: '#334155' }}>Account Manager: {esc(data.accountOwner)}</div>
              )}
              <div style={{
                marginTop: 8, padding: '5px 14px', display: 'inline-block',
                fontSize: '11pt', fontWeight: 700, color: '#1e3a5f',
                border: '2px solid #1e3a5f', borderRadius: 4,
              }}>
                {typeLabel}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ─── Client & Date ─── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top', width: '60%' }}>
              <strong style={{ fontSize: '10pt' }}>Client:</strong><br />
              {clientLines.map((line, i) => (
                <span key={i} style={{ fontSize: '10pt' }}>{line}<br /></span>
              ))}
            </td>
            <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
              <span style={{ fontSize: '10pt' }}>Douala, {formattedDate}</span><br />
              <strong style={{ fontSize: '10pt', fontFamily: 'monospace' }}>{displayNumber}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ─── Category Sections ─── */}
      {renderSection('NON-RECURRENT CHARGE', data.categories.nrc)}
      {renderSection('MONTHLY RECURRENT CHARGE', data.categories.mrc)}
      {renderSection('ANNUAL RECURRENT CHARGE', data.categories.arc)}

      {/* ─── Totals ─── */}
      <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 14, marginTop: 8 }}>
        <table style={{ width: '100%', maxWidth: 340, marginLeft: 'auto', fontSize: '10pt', borderCollapse: 'collapse' }}>
          <tbody>
            {nrcTotal > 0 && (
              <tr>
                <td style={{ padding: '2px 0', color: '#334155' }}>Non-Recurrent Charge Total</td>
                <td style={{ textAlign: 'right', padding: '2px 0', fontWeight: 600 }}>{fmt(nrcTotal)} XAF</td>
              </tr>
            )}
            {mrcTotal > 0 && (
              <tr>
                <td style={{ padding: '2px 0', color: '#334155' }}>Monthly Recurrent Charge Total</td>
                <td style={{ textAlign: 'right', padding: '2px 0', fontWeight: 600 }}>{fmt(mrcTotal)} XAF</td>
              </tr>
            )}
            {arcTotal > 0 && (
              <tr>
                <td style={{ padding: '2px 0', color: '#334155' }}>Annual Recurrent Charge Total</td>
                <td style={{ textAlign: 'right', padding: '2px 0', fontWeight: 600 }}>{fmt(arcTotal)} XAF</td>
              </tr>
            )}
            {data.applyVat && (
              <tr>
                <td style={{ padding: '2px 0', color: '#334155' }}>VAT (19.25%)</td>
                <td style={{ textAlign: 'right', padding: '2px 0', fontWeight: 600 }}>{fmt(vatAmount)} XAF</td>
              </tr>
            )}
            <tr style={{ borderTop: '2px solid #1e3a5f' }}>
              <td style={{ padding: '6px 0 2px', fontWeight: 700, fontSize: '11pt' }}>Grand Total</td>
              <td style={{ textAlign: 'right', padding: '6px 0 2px', fontWeight: 700, fontSize: '11pt' }}>{fmt(grandTotal)} XAF</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── Amount in Words ─── */}
      {grandTotal > 0 && (
        <div style={{ marginTop: 14, fontSize: '10pt', fontStyle: 'italic', color: '#475569' }}>
          The total amount to be paid is <strong style={{ color: '#1e3a5f' }}>{amountInWords}</strong>
        </div>
      )}

      {/* ─── Terms ─── */}
      <div style={{ marginTop: 24, borderTop: '1px solid #cbd5e1', paddingTop: 14, fontSize: '9pt', color: '#64748b' }}>
        <strong style={{ color: '#334155' }}>Standard Terms &amp; Conditions</strong><br />
        {data.terms.split('\n').map((line, i) => (
          <span key={i}>{esc(line)}<br /></span>
        ))}
      </div>
    </div>
  )
}
