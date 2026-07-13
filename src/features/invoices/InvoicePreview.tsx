'use client'

import type { InvoiceFormData } from './types'
import { numberToWords } from './numberToWords'

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function InvoicePreview({
  data,
  companySettings,
}: {
  data: InvoiceFormData
  companySettings: Record<string, any> | null
}) {
  const amountInWords = numberToWords(Math.round(
    data.categories.nrc.reduce((s, sub) => s + sub.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0), 0) +
    data.categories.mrc.reduce((s, sub) => s + sub.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0), 0) +
    data.categories.arc.reduce((s, sub) => s + sub.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0), 0)
  ))

  const typeLabel = data.type === 'proforma' ? 'PROFORMA INVOICE' : 'INVOICE'

  const formattedDate = data.customerName
    ? new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '________'

  const nrcTotal = data.categories.nrc.reduce((s, sub) => s + sub.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0), 0)
  const mrcTotal = data.categories.mrc.reduce((s, sub) => s + sub.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0), 0)
  const arcTotal = data.categories.arc.reduce((s, sub) => s + sub.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0), 0)
  const subtotal = nrcTotal + mrcTotal + arcTotal
  const vatRate = companySettings ? Number(companySettings.vatRate) / 100 : 0.1925
  const vatAmount = data.applyVat ? Math.round(subtotal * vatRate) : 0
  const grandTotal = subtotal + vatAmount

  let clientInfo = esc(data.customerName)
  if (data.customerAddress) clientInfo += '\n' + data.customerAddress
  if (data.customerBp) clientInfo += '\n' + data.customerBp
  if (data.customerNiu) clientInfo += '\nNIU: ' + data.customerNiu
  if (data.customerRc) clientInfo += '\nRC: ' + data.customerRc

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
                {sub.heading || 'Untitled'}
              </div>
              <table className="invoice-items-table" style={{ marginBottom: 4, width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', fontSize: '9pt', color: '#64748b' }}>
                    <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600 }}>Description</th>
                    <th style={{ textAlign: 'center', padding: '4px 8px', fontWeight: 600 }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>Unit Price (XAF)</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>Total Price (XAF)</th>
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
                        <td style={{ padding: '4px 8px' }}>{item.description || '—'}</td>
                        <td style={{ textAlign: 'center', padding: '4px 8px' }}>{item.qty}</td>
                        <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(item.unitPrice)}</td>
                        <td style={{ textAlign: 'right', padding: '4px 8px' }}>{fmt(item.qty * item.unitPrice)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div style={{ textAlign: 'right', fontSize: '9pt', fontWeight: 600, color: '#1e3a5f' }}>
                {sub.heading || 'Subtotal'}: {fmt(subTotal)} XAF
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const cs = companySettings

  return (
    <div id="invoice-preview" className="invoice-preview" style={{
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '10pt',
      color: '#1e293b',
      background: '#fff',
      padding: '32px 28px',
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      lineHeight: 1.5,
      maxWidth: 700,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div className="invoice-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
        <div className="logo-area">
          <img src="/logo.jpg" alt="JENEUS CO LTD" style={{ maxWidth: 90, maxHeight: 65 }} />
        </div>
        <div className="company-info" style={{ textAlign: 'right' }}>
          <div className="company-name" style={{ fontSize: '14pt', fontWeight: 700, color: '#1e3a5f' }}>
            {cs?.companyName || 'JENEUS CO. LTD'}
          </div>
          <div style={{ fontSize: '9pt' }}>{cs?.companyAddress || 'Immeuble Commercial Bank, 4th Floor'}</div>
          {cs?.companyAddress ? null : <div style={{ fontSize: '9pt' }}>Rue Njo Njo Bonapriso</div>}
          <div style={{ fontSize: '9pt' }}>NIU: {cs?.companyNiu || 'M092217601761D'}</div>
          <div style={{ fontSize: '9pt' }}>RC: {cs?.companyRc || 'RC/DLA/2022/B/5078'}</div>
          {data.accountOwner && (
            <div style={{ fontSize: '9pt' }}>Account Manager: {esc(data.accountOwner)}</div>
          )}
          <div className="invoice-label" style={{
            marginTop: 6, padding: '4px 12px', display: 'inline-block',
            fontSize: '11pt', fontWeight: 700, color: '#1e3a5f',
            border: '2px solid #1e3a5f', borderRadius: 4,
          }}>
            {typeLabel}
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="invoice-meta" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="client-info" style={{ maxWidth: '60%' }}>
          <strong>Client:</strong><br />
          {clientInfo.split('\n').map((line, i) => (
            <span key={i}>{line}<br /></span>
          ))}
        </div>
        <div className="date-info" style={{ textAlign: 'right' }}>
          Douala, {formattedDate}<br />
          <strong>{'XXXX/JE/DD/MM/YYYY'}</strong>
        </div>
      </div>

      {/* Category sections */}
      {renderSection('NON-RECURRENT CHARGE', data.categories.nrc)}
      {renderSection('MONTHLY RECURRENT CHARGE', data.categories.mrc)}
      {renderSection('ANNUAL RECURRENT CHARGE', data.categories.arc)}

      {/* Totals */}
      <div className="invoice-totals" style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 12 }}>
        <table style={{ width: '100%', maxWidth: 300, marginLeft: 'auto', fontSize: '10pt' }}>
          <tbody>
            {nrcTotal > 0 && <tr><td>Non-Recurrent Charge Total</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(nrcTotal)} XAF</td></tr>}
            {mrcTotal > 0 && <tr><td>Monthly Recurrent Charge Total</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(mrcTotal)} XAF</td></tr>}
            {arcTotal > 0 && <tr><td>Annual Recurrent Charge Total</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(arcTotal)} XAF</td></tr>}
            {data.applyVat && (
              <tr><td>VAT ({(vatRate * 100).toFixed(2)}%)</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(vatAmount)} XAF</td></tr>
            )}
            <tr className="grand-total" style={{ borderTop: '2px solid #1e3a5f', fontSize: '11pt', fontWeight: 700 }}>
              <td>Grand Total</td>
              <td style={{ textAlign: 'right' }}>{fmt(grandTotal)} XAF</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Amount in words */}
      {grandTotal > 0 && (
        <div className="amount-in-words" style={{ marginTop: 12, fontSize: '10pt', fontStyle: 'italic' }}>
          The total amount to be paid is <strong>{amountInWords}</strong>
        </div>
      )}

      {/* Terms */}
      <div className="terms-section" style={{ marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 12, fontSize: '9pt', color: '#64748b' }}>
        <strong>Standard Terms &amp; Conditions</strong><br />
        {data.terms.split('\n').map((line, i) => (
          <span key={i}>{esc(line)}<br /></span>
        ))}
      </div>
    </div>
  )
}
