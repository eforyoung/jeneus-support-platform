'use client'

import jsPDF from 'jspdf'

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function loadLogo(): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(img) // silently skip if logo fails
    img.src = '/logo.jpg'
  })
}

export async function generatePDFDirect(
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
  const logo = await loadLogo()

  const pdf = new jsPDF('p', 'mm', 'a4')
  const W = 210
  const M = 14
  let y = M
  const LH = 5

  function hr(color = '#cccccc') {
    pdf.setDrawColor(color)
    pdf.setLineWidth(0.1)
    pdf.line(M, y, W - M, y)
    y += 1.5
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
    y += LH - 0.5
    pdf.setFont('helvetica', 'normal')
  }

  // ── Compute totals ──
  function itemsTotal(items: any[]) { return items.reduce((s, it) => s + (it.qty || 0) * (it.unitPrice || 0), 0) }
  const nrcTotal = data.categories.nrc.reduce((s, sub) => s + itemsTotal(sub.items || []), 0)
  const mrcTotal = data.categories.mrc.reduce((s, sub) => s + itemsTotal(sub.items || []), 0)
  const arcTotal = data.categories.arc.reduce((s, sub) => s + itemsTotal(sub.items || []), 0)
  const subtotal = nrcTotal + mrcTotal + arcTotal
  const vatRate = companySettings ? Number(companySettings.vatRate) / 100 : 0.1925
  const vatAmount = data.applyVat ? Math.round(subtotal * vatRate) : 0
  const grandTotal = subtotal + vatAmount
  const cs = companySettings

  // Amount in words
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
  // HEADER — logo left, company info right
  // ═══════════════════════════════════════════
  y = M + 2

  // Logo (left side, 22mm × 15mm area)
  if (logo && logo.width > 0) {
    const logoW = 22
    const logoH = (logo.height / logo.width) * logoW
    pdf.addImage(logo, 'JPEG', M, y - 2, logoW, Math.min(logoH, 16))
  }

  // Company info (right side)
  const rightX = W - M
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(15)
  pdf.setTextColor('#1e3a5f')
  pdf.text(cs?.companyName || 'JENEUS CO. LTD', rightX, y, { align: 'right' })
  y += 5
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor('#334155')
  const addr = (cs?.companyAddress || 'Immeuble Commercial Bank, 4th Floor').split('\n')
  for (const l of addr) { pdf.text(l, rightX, y, { align: 'right' }); y += 3.5 }
  pdf.text('Rue Njo Njo Bonapriso', rightX, y, { align: 'right' }); y += 3.5
  const niuRc = `NIU: ${cs?.companyNiu || 'M092217601761D'}  |  RC: ${cs?.companyRc || 'RC/DLA/2022/B/5078'}`
  pdf.text(niuRc, rightX, y, { align: 'right' })
  y += 3.5
  if (data.accountOwner) {
    pdf.text(`Account Manager: ${data.accountOwner}`, rightX, y, { align: 'right' })
    y += 3.5
  }

  // Type label box
  y += 1.5
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor('#1e3a5f')
  const lblW = pdf.getTextWidth(typeLabel) + 14
  pdf.setDrawColor('#1e3a5f')
  pdf.setLineWidth(0.4)
  pdf.rect(rightX - lblW, y - 3.5, lblW, 6.5)
  pdf.text(typeLabel, rightX - lblW / 2, y, { align: 'center' })

  y += 7
  hr('#cbd5e1')
  y += 3

  // ═══════════════════════════════════════════
  // CLIENT (left) & DATE/NUMBER (right)
  // ═══════════════════════════════════════════
  const clientStartY = y
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

  // Date & number (right, aligned with client block top)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor('#1e293b')
  pdf.text(`Douala, ${today}`, rightX, clientStartY, { align: 'right' })
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text(data.invoiceNumber || '', rightX, clientStartY + 4.5, { align: 'right' })

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
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor('#1e3a5f')
      pdf.text(sub.heading || 'Services', M, y)
      y += 4.5

      // Table: desc | qty | unit | total
      const c1 = M, c2 = M + 90, c3 = M + 108, c4 = M + 142, c5 = M + 176
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(6.5)
      pdf.setTextColor('#64748b')
      pdf.text('Description', c1, y)
      pdf.text('Qty', c3, y, { align: 'center' })
      pdf.text('Unit Price (XAF)', c4, y, { align: 'right' })
      pdf.text('Total (XAF)', c5, y, { align: 'right' })
      y += 3
      pdf.setDrawColor('#e2e8f0')
      pdf.setLineWidth(0.05)
      pdf.line(M, y - 0.5, rightX, y - 0.5)
      pdf.setFont('helvetica', 'normal')

      for (const item of items) {
        const tot = (item.qty || 0) * (item.unitPrice || 0)
        pdf.setFontSize(7.5)
        pdf.setTextColor('#1e293b')
        pdf.text(item.description || '—', c1, y, { maxWidth: 85 })
        pdf.text(String(item.qty || 0), c3, y, { align: 'center' })
        pdf.text(fmt(item.unitPrice || 0), c4, y, { align: 'right' })
        pdf.text(fmt(tot), c5, y, { align: 'right' })
        y += 4.5
        if (y > 272) { pdf.addPage(); y = M }
      }
      const subTot = itemsTotal(items)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7.5)
      pdf.setTextColor('#1e3a5f')
      pdf.text(`${sub.heading || 'Subtotal'}: ${fmt(subTot)} XAF`, rightX, y, { align: 'right' })
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

  const labelX = 125
  function totalRow(labelTxt: string, amount: number, bold = false) {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor('#334155')
    pdf.text(labelTxt, labelX, y)
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
  pdf.line(labelX, y, rightX, y)
  y += 2
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor('#1e3a5f')
  pdf.text('Grand Total', labelX, y)
  pdf.text(fmt(grandTotal) + ' XAF', rightX, y, { align: 'right' })
  y += 6

  // ═══════════════════════════════════════════
  // AMOUNT IN WORDS
  // ═══════════════════════════════════════════
  if (grandTotal > 0) {
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(8)
    pdf.setTextColor('#475569')
    const prefix = 'The total amount to be paid is '
    pdf.text(prefix, M, y)
    pdf.setFont('helvetica', 'bolditalic')
    pdf.text(amountInWords, M + pdf.getTextWidth(prefix), y)
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

  pdf.save(`${filename}.pdf`)
}
