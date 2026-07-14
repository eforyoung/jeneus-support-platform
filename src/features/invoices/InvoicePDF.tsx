'use client'

import jsPDF from 'jspdf'

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ─── Vector PDF Generator — crisp text at any zoom ───

export function generatePDFDirect(
  data: {
    type: string
    invoiceNumber: string
    customerName: string
    customerAddress: string
    customerBp: string
    customerNiu: string
    customerRc: string
    applyVat: boolean
    accountOwner: string
    terms: string
    categories: { nrc: any[]; mrc: any[]; arc: any[] }
  },
  companySettings: Record<string, any> | null,
  filename: string,
) {
  // eslint-disable-next-line new-cap
  const pdf = new jsPDF('p', 'mm', 'a4')
  const W = 210 // A4 width mm
  const M = 16  // margin

  // ── Helpers ──
  let y = M
  const LH = 5.5 // line height

  function hr(color = '#cccccc') {
    pdf.setDrawColor(color)
    pdf.setLineWidth(0.1)
    pdf.line(M, y, W - M, y)
    y += 1
  }

  function label(text: string, x = M) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor('#334155')
    pdf.text(text, x, y)
    pdf.setFont('helvetica', 'normal')
  }

  function value(text: string, x: number) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor('#1e293b')
    pdf.text(text, x, y)
  }

  function sectionTitle(text: string) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor('#1e3a5f')
    pdf.text(text, M, y)
    y += 1
    pdf.setDrawColor('#1e3a5f')
    pdf.setLineWidth(0.2)
    pdf.line(M, y, W - M, y)
    y += LH - 1
    pdf.setFont('helvetica', 'normal')
  }

  // ── Compute totals ──
  function itemsTotal(items: any[]) {
    return items.reduce((s, it) => s + (it.qty || 0) * (it.unitPrice || 0), 0)
  }
  const nrcTotal = data.categories.nrc.reduce((s, sub) => s + itemsTotal(sub.items || []), 0)
  const mrcTotal = data.categories.mrc.reduce((s, sub) => s + itemsTotal(sub.items || []), 0)
  const arcTotal = data.categories.arc.reduce((s, sub) => s + itemsTotal(sub.items || []), 0)
  const subtotal = nrcTotal + mrcTotal + arcTotal
  const vatRate = companySettings ? Number(companySettings.vatRate) / 100 : 0.1925
  const vatAmount = data.applyVat ? Math.round(subtotal * vatRate) : 0
  const grandTotal = subtotal + vatAmount
  const cs = companySettings

  // Convert number to words (inline to avoid import complexity)
  const amountInWords = (() => {
    let n = Math.round(grandTotal)
    if (n === 0) return 'zero francs'
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
    function c3(num: number): string {
      let r = ''
      if (num >= 100) { r += ones[Math.floor(num / 100)] + ' hundred '; num %= 100 }
      if (num >= 20) { r += tens[Math.floor(num / 10)] + ' '; num %= 10 }
      if (num > 0) r += ones[num] + ' '
      return r.trim()
    }
    let r = ''
    if (n >= 1000000) { r += c3(Math.floor(n / 1000000)) + ' million '; n %= 1000000 }
    if (n >= 1000) { r += c3(Math.floor(n / 1000)) + ' thousand '; n %= 1000 }
    if (n > 0) r += c3(n)
    return r.trim() + (r.trim() ? ' francs' : '')
  })()

  const typeLabel = data.type === 'proforma' ? 'PROFORMA INVOICE' : 'INVOICE'
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // ═══════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════
  y = M + 3

  // Company name
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.setTextColor('#1e3a5f')
  pdf.text(cs?.companyName || 'JENEUS CO. LTD', W - M, y, { align: 'right' })

  y += 5
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor('#334155')
  const addr = (cs?.companyAddress || 'Immeuble Commercial Bank, 4th Floor').split('\n')
  for (const l of addr) { pdf.text(l, W - M, y, { align: 'right' }); y += 3.5 }
  pdf.text('Rue Njo Njo Bonapriso', W - M, y, { align: 'right' }); y += 3.5
  pdf.text(`NIU: ${cs?.companyNiu || 'M092217601761D'}  |  RC: ${cs?.companyRc || 'RC/DLA/2022/B/5078'}`, W - M, y, { align: 'right' })

  y += 5
  // Label box
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor('#1e3a5f')
  const lblW = pdf.getTextWidth(typeLabel) + 16
  pdf.setDrawColor('#1e3a5f')
  pdf.setLineWidth(0.4)
  pdf.rect(W - M - lblW, y - 4, lblW, 7)
  pdf.text(typeLabel, W - M - lblW / 2, y, { align: 'center' })

  y += 8
  hr('#cbd5e1')

  // ═══════════════════════════════════════════
  // CLIENT & DATE
  // ═══════════════════════════════════════════
  y += 3
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor('#1e293b')
  pdf.text('Client:', M, y)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  y += 4.5
  if (data.customerName) { pdf.text(data.customerName, M, y); y += 4.5 }
  if (data.customerAddress) { pdf.text(data.customerAddress, M, y); y += 4.5 }
  if (data.customerBp) { pdf.text(data.customerBp, M, y); y += 4.5 }
  if (data.customerNiu) { pdf.text('NIU: ' + data.customerNiu, M, y); y += 4.5 }
  if (data.customerRc) { pdf.text('RC: ' + data.customerRc, M, y); y += 4.5 }

  // Date & number (right side, same vertical as client)
  const dateY = M + 3 + 5 + (addr.length + 1) * 3.5 + 5 + 8 + 1 + 3
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor('#1e293b')
  pdf.text(`Douala, ${today}`, W - M, dateY, { align: 'right' })
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text(data.invoiceNumber || '', W - M, dateY + 4.5, { align: 'right' })

  y += 3

  // ═══════════════════════════════════════════
  // CATEGORY SECTIONS
  // ═══════════════════════════════════════════

  function renderCat(title: string, subs: any[]) {
    if (subs.length === 0) return
    y += 2
    sectionTitle(title)

    for (const sub of subs) {
      const items = sub.items || []
      if (items.length === 0) continue
      y += 0.5
      // Sub-heading
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor('#1e3a5f')
      pdf.text(sub.heading || 'Services', M, y)
      y += 4.5

      // Table header
      const colX = [M, M + 90, M + 104, M + 134, M + 168] // desc | qty | unit | total | (no col)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(6.5)
      pdf.setTextColor('#64748b')
      pdf.text('Description', colX[0], y)
      pdf.text('Qty', colX[2], y, { align: 'center' })
      pdf.text('Unit Price (XAF)', colX[3], y, { align: 'right' })
      pdf.text('Total (XAF)', colX[4], y, { align: 'right' })
      y += 3
      pdf.setDrawColor('#e2e8f0')
      pdf.setLineWidth(0.05)
      pdf.line(M, y - 0.5, W - M, y - 0.5)
      pdf.setFont('helvetica', 'normal')

      for (const item of items) {
        const tot = (item.qty || 0) * (item.unitPrice || 0)
        pdf.setFontSize(7.5)
        pdf.setTextColor('#1e293b')
        pdf.text(item.description || '—', colX[0], y, { maxWidth: 80 })
        pdf.text(String(item.qty || 0), colX[2], y, { align: 'center' })
        pdf.text(fmt(item.unitPrice || 0), colX[3], y, { align: 'right' })
        pdf.text(fmt(tot), colX[4], y, { align: 'right' })
        y += 4.5
        if (y > 270) { pdf.addPage(); y = M }
      }
      // Subsection subtotal
      const subTot = itemsTotal(items)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7.5)
      pdf.setTextColor('#1e3a5f')
      pdf.text(`${sub.heading || 'Subtotal'}: ${fmt(subTot)} XAF`, W - M, y, { align: 'right' })
      y += 4
      pdf.setFont('helvetica', 'normal')
    }
    y += 1
  }

  renderCat('NON-RECURRENT CHARGE', data.categories.nrc)
  renderCat('MONTHLY RECURRENT CHARGE', data.categories.mrc)
  renderCat('ANNUAL RECURRENT CHARGE', data.categories.arc)

  // ═══════════════════════════════════════════
  // TOTALS
  // ═══════════════════════════════════════════
  y += 1
  hr('#cbd5e1')
  y += 2

  const rightX = W - M
  const valX = 185
  function totalRow(labelTxt: string, amount: number, bold = false) {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor('#334155')
    pdf.text(labelTxt, valX, y)
    pdf.setTextColor('#1e293b')
    pdf.text(fmt(amount) + ' XAF', rightX, y, { align: 'right' })
    y += 4.5
  }

  if (nrcTotal > 0) totalRow('Non-Recurrent Charge Total', nrcTotal)
  if (mrcTotal > 0) totalRow('Monthly Recurrent Charge Total', mrcTotal)
  if (arcTotal > 0) totalRow('Annual Recurrent Charge Total', arcTotal)
  if (data.applyVat) totalRow('VAT (19.25%)', vatAmount)

  y += 0.5
  pdf.setDrawColor('#1e3a5f')
  pdf.setLineWidth(0.3)
  pdf.line(valX, y, rightX, y)
  y += 2
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor('#1e3a5f')
  pdf.text('Grand Total', valX, y)
  pdf.text(fmt(grandTotal) + ' XAF', rightX, y, { align: 'right' })
  y += 6

  // ═══════════════════════════════════════════
  // AMOUNT IN WORDS
  // ═══════════════════════════════════════════
  if (grandTotal > 0) {
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(8)
    pdf.setTextColor('#475569')
    pdf.text('The total amount to be paid is ', M, y)
    pdf.setFont('helvetica', 'bolditalic')
    pdf.text(amountInWords, M + pdf.getTextWidth('The total amount to be paid is '), y)
    y += 5
  }

  // ═══════════════════════════════════════════
  // TERMS
  // ═══════════════════════════════════════════
  y += 3
  hr('#cbd5e1')
  y += 2
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.setTextColor('#334155')
  pdf.text('Standard Terms & Conditions', M, y)
  y += 4
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor('#64748b')
  const tl = data.terms.split('\n')
  for (const l of tl) { pdf.text(l, M, y); y += 3.2 }

  // ── Save ──
  pdf.save(`${filename}.pdf`)
}
