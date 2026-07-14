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

const S = {
  // Spacing
  page:      { padding: '24px 28px', maxWidth: 700 },
  header:    { marginBottom: 10, paddingBottom: 8 },
  section:   { marginBottom: 8 },
  itemTable: { marginBottom: 2 },
  totals:    { paddingTop: 8, marginTop: 6 },
  amounts:   { marginTop: 8 },
  terms:     { marginTop: 14, paddingTop: 8 },
  // Font sizes
  company:   '12pt',
  label:     '10pt',
  heading:   '10pt',
  subhead:   '9pt',
  body:      '9pt',
  small:     '8pt',
  // Colors
  navy:      '#1e3a5f',
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
  const displayNumber = data.invoiceNumber || ''

  // Client info lines
  const clientLines: string[] = [esc(data.customerName || '')]
  if (data.customerAddress) clientLines.push(data.customerAddress)
  if (data.customerBp) clientLines.push(data.customerBp)
  if (data.customerNiu) clientLines.push('NIU: ' + data.customerNiu)
  if (data.customerRc) clientLines.push('RC: ' + data.customerRc)

  const renderSection = (title: string, subs: InvoiceFormData['categories']['nrc']) => {
    if (subs.length === 0) return null
    return (
      <div style={{ marginBottom: S.section.marginBottom }}>
        <div style={{ fontWeight: 700, fontSize: S.subhead, marginBottom: 3, color: S.navy, borderBottom: `1px solid ${S.navy}`, paddingBottom: 2 }}>
          {title}
        </div>
        {subs.map((sub) => {
          const subTotal = sub.items.reduce((s, it) => s + it.qty * it.unitPrice, 0)
          return (
            <div key={sub.id} style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 600, fontSize: S.small, marginBottom: 2, color: S.navy }}>
                {esc(sub.heading || 'Services')}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: S.itemTable.marginBottom }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '2px 6px', fontWeight: 600, fontSize: S.small, color: '#64748b' }}>Description</th>
                    <th style={{ textAlign: 'center', padding: '2px 6px', fontWeight: 600, fontSize: S.small, color: '#64748b', width: 42 }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '2px 6px', fontWeight: 600, fontSize: S.small, color: '#64748b', width: 100 }}>Unit Price (XAF)</th>
                    <th style={{ textAlign: 'right', padding: '2px 6px', fontWeight: 600, fontSize: S.small, color: '#64748b', width: 100 }}>Total Price (XAF)</th>
                  </tr>
                </thead>
                <tbody>
                  {sub.items.length === 0 ? (
                    <tr><td colSpan={4} style={{ color: '#999', textAlign: 'center', padding: '3px', fontSize: S.small }}>No items</td></tr>
                  ) : (
                    sub.items.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: S.small }}>
                        <td style={{ padding: '2px 6px' }}>{esc(item.description || '—')}</td>
                        <td style={{ textAlign: 'center', padding: '2px 6px' }}>{item.qty}</td>
                        <td style={{ textAlign: 'right', padding: '2px 6px' }}>{fmt(item.unitPrice)}</td>
                        <td style={{ textAlign: 'right', padding: '2px 6px' }}>{fmt(item.qty * item.unitPrice)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div style={{ textAlign: 'right', fontSize: S.small, fontWeight: 600, color: S.navy }}>
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
      fontFamily: 'Helvetica, Arial, "Segoe UI", sans-serif',
      fontSize: S.body,
      color: '#1e293b',
      background: '#fff',
      padding: S.page.padding,
      borderRadius: 4,
      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
      lineHeight: 1.5,
      maxWidth: S.page.maxWidth,
      margin: '0 auto',
    }}>
      {/* ─── Header ─── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: S.header.marginBottom, borderBottom: '1px solid #cbd5e1', paddingBottom: S.header.paddingBottom }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top', width: 80 }}>
              <img src="/logo.jpg" alt="JENEUS CO LTD" style={{ maxWidth: 75, maxHeight: 50 }} />
            </td>
            <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
              <div style={{ fontSize: S.company, fontWeight: 700, color: S.navy, marginBottom: 1 }}>
                {cs?.companyName || 'JENEUS CO. LTD'}
              </div>
              <div style={{ fontSize: S.small, color: '#334155', lineHeight: 1.4 }}>
                {(cs?.companyAddress || 'Immeuble Commercial Bank, 4th Floor').split('\n').map((l: string, i: number) => (
                  <div key={i}>{l}</div>
                ))}
                Rue Njo Njo Bonapriso
              </div>
              <div style={{ fontSize: S.small, color: '#334155', lineHeight: 1.4 }}>
                NIU: {cs?.companyNiu || 'M092217601761D'} &nbsp;|&nbsp; RC: {cs?.companyRc || 'RC/DLA/2022/B/5078'}
              </div>
              {data.accountOwner && (
                <div style={{ fontSize: S.small, color: '#334155' }}>
                  Account Manager: {esc(data.accountOwner)}
                </div>
              )}
              <div style={{ marginTop: 5, padding: '3px 10px', display: 'inline-block', fontSize: S.label, fontWeight: 700, color: S.navy, border: `2px solid ${S.navy}`, borderRadius: 3 }}>
                {typeLabel}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ─── Client & Date ─── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top', width: '60%' }}>
              <strong style={{ fontSize: S.body }}>Client:</strong><br />
              {clientLines.map((line, i) => (
                <span key={i} style={{ fontSize: S.body }}>{line}<br /></span>
              ))}
            </td>
            <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
              <span style={{ fontSize: S.body }}>Douala, {formattedDate}</span><br />
              <strong style={{ fontSize: S.body }}>{displayNumber}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ─── Category Sections ─── */}
      {renderSection('NON-RECURRENT CHARGE', data.categories.nrc)}
      {renderSection('MONTHLY RECURRENT CHARGE', data.categories.mrc)}
      {renderSection('ANNUAL RECURRENT CHARGE', data.categories.arc)}

      {/* ─── Totals ─── */}
      <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: S.totals.paddingTop, marginTop: S.totals.marginTop }}>
        <table style={{ width: '100%', maxWidth: 300, marginLeft: 'auto', fontSize: S.small, borderCollapse: 'collapse' }}>
          <tbody>
            {nrcTotal > 0 && (
              <tr>
                <td style={{ padding: '1px 0', color: '#334155' }}>Non-Recurrent Charge Total</td>
                <td style={{ textAlign: 'right', padding: '1px 0', fontWeight: 600 }}>{fmt(nrcTotal)} XAF</td>
              </tr>
            )}
            {mrcTotal > 0 && (
              <tr>
                <td style={{ padding: '1px 0', color: '#334155' }}>Monthly Recurrent Charge Total</td>
                <td style={{ textAlign: 'right', padding: '1px 0', fontWeight: 600 }}>{fmt(mrcTotal)} XAF</td>
              </tr>
            )}
            {arcTotal > 0 && (
              <tr>
                <td style={{ padding: '1px 0', color: '#334155' }}>Annual Recurrent Charge Total</td>
                <td style={{ textAlign: 'right', padding: '1px 0', fontWeight: 600 }}>{fmt(arcTotal)} XAF</td>
              </tr>
            )}
            {data.applyVat && (
              <tr>
                <td style={{ padding: '1px 0', color: '#334155' }}>VAT (19.25%)</td>
                <td style={{ textAlign: 'right', padding: '1px 0', fontWeight: 600 }}>{fmt(vatAmount)} XAF</td>
              </tr>
            )}
            <tr style={{ borderTop: `2px solid ${S.navy}` }}>
              <td style={{ padding: '4px 0 1px', fontWeight: 700, fontSize: S.subhead }}>Grand Total</td>
              <td style={{ textAlign: 'right', padding: '4px 0 1px', fontWeight: 700, fontSize: S.subhead }}>{fmt(grandTotal)} XAF</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── Amount in Words ─── */}
      {grandTotal > 0 && (
        <div style={{ marginTop: S.amounts.marginTop, fontSize: S.small, fontStyle: 'italic', color: '#475569' }}>
          The total amount to be paid is <strong style={{ color: S.navy }}>{amountInWords}</strong>
        </div>
      )}

      {/* ─── Terms ─── */}
      <div style={{ marginTop: S.terms.marginTop, borderTop: '1px solid #cbd5e1', paddingTop: S.terms.paddingTop, fontSize: S.small, color: '#64748b', lineHeight: 1.4 }}>
        <strong style={{ color: '#334155', fontSize: S.small }}>Standard Terms &amp; Conditions</strong><br />
        {data.terms.split('\n').map((line, i) => (
          <span key={i}>{esc(line)}<br /></span>
        ))}
      </div>
    </div>
  )
}
