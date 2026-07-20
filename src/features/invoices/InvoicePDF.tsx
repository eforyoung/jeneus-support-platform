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

/** Split a long string across multiple lines at a max character width. */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxCharsPerLine) {
      lines.push(current.trim())
      current = w
    } else {
      current += (current ? ' ' : '') + w
    }
  }
  if (current.trim()) lines.push(current.trim())
  return lines
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
  const M = 18          // Generous side margins for clean whitespace
  const rightX = W - M
  const contentW = W - 2 * M
  const B = 12          // Bottom margin
  let page = 1
  let y = M

  // ── Helpers ──
  function checkPageBreak(needed: number, onBreak?: () => void) {
    const maxY = 285 - B
    if (y + needed > maxY) {
      addFooter()
      pdf.addPage()
      page++
      y = M + 8
      if (onBreak) onBreak()
    }
  }

  function addFooter() {
    // Thin divider above the footer
    pdf.setDrawColor('#cbd5e1')
    pdf.setLineWidth(0.15)
    pdf.line(M, 287, rightX, 287)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor('#94a3b8')
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    pdf.text(`JENEUS CO. LTD — ${dateStr}`, M, 292)
    pdf.text(`Page ${page}`, rightX, 292, { align: 'right' })
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

  const typeLabel = data.type === 'proforma' ? 'PROFORMA INVOICE' : 'TAX INVOICE'
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // ═══════════════════════════════════════════════════════
  //  HEADER — logo left, company info right
  // ═══════════════════════════════════════════════════════
  y = M

  // Logo (left side)
  if (logo && logo.width > 0) {
    const logoW = 26
    const logoH = (logo.height / logo.width) * logoW
    pdf.addImage(logo, 'JPEG', M, y, logoW, Math.min(logoH, 20))
  }

  // Company name (right-aligned, prominent)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.setTextColor('#1e3a5f')
  pdf.text(cs?.companyName || 'JENEUS CO. LTD', rightX, y + 2, { align: 'right' })

  // Company address (below name, lighter and smaller)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor('#64748b')
  const addrLines = (cs?.companyAddress || 'Immeuble Commercial Bank, 4th Floor, Rue Njo Njo Bonapriso').split('\n')
  let addrY = y + 7
  for (const l of addrLines) {
    pdf.text(l, rightX, addrY, { align: 'right' })
    addrY += 4
  }
  const niuRc = `NIU: ${cs?.companyNiu || 'M092217601761D'}  |  RC: ${cs?.companyRc || 'RC/DLA/2022/B/5078'}`
  pdf.text(niuRc, rightX, addrY, { align: 'right' })
  addrY += 4
  if (data.accountOwner) {
    pdf.text(`Account: ${data.accountOwner}`, rightX, addrY, { align: 'right' })
    addrY += 4
  }

  // Move past header
  y = Math.max(y + 24, addrY + 2)

  // ── Full-width accent divider ──
  pdf.setDrawColor('#0D9488')
  pdf.setLineWidth(0.8)
  pdf.line(M, y, rightX, y)
  y += 6

  // ═══════════════════════════════════════════════════════
  //  INVOICE TYPE BANNER
  // ═══════════════════════════════════════════════════════
  checkPageBreak(14)
  pdf.setFillColor('#1e3a5f')
  pdf.roundedRect(M, y, contentW, 10, 1.5, 1.5, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor('#ffffff')
  pdf.text(typeLabel, M + 5, y + 7)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(data.invoiceNumber || '', rightX - 5, y + 7, { align: 'right' })
  y += 16

  // ═══════════════════════════════════════════════════════
  //  CLIENT (left) + DATE (right) — two-column layout
  // ═══════════════════════════════════════════════════════
  checkPageBreak(36)

  const colMid = W / 2 + 5  // divider between left/right info panels
  const leftPanelEnd = colMid - 8
  const rightPanelStart = colMid + 4

  // -- Left panel: BILL TO --
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.setTextColor('#0D9488')
  pdf.text('BILL TO', M, y)
  y += 5.5

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9.5)
  pdf.setTextColor('#1e293b')
  const billToY = y  // save for the right panel

  if (data.customerName) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.text(data.customerName, M, y)
    y += 5.5
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
  }

  pdf.setTextColor('#475569')
  if (data.customerAddress) { pdf.text(data.customerAddress, M, y); y += 5 }
  if (data.customerBp) { pdf.text(data.customerBp, M, y); y += 5 }

  // NIU/RC on a single line if both exist, for conciseness
  const customerReg: string[] = []
  if (data.customerNiu) customerReg.push('NIU: ' + data.customerNiu)
  if (data.customerRc) customerReg.push('RC: ' + data.customerRc)
  if (customerReg.length > 0) {
    pdf.setFontSize(8)
    pdf.setTextColor('#64748b')
    pdf.text(customerReg.join('   |   '), M, y)
    y += 5
  }

  // -- Right panel: Date & Invoice details --
  let ry = billToY
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.setTextColor('#0D9488')
  pdf.text('INVOICE DETAILS', rightPanelStart, ry - 5.5)

  pdf.setFontSize(8.5)
  pdf.setTextColor('#64748b')
  pdf.setFont('helvetica', 'normal')
  pdf.text('Date:', rightPanelStart, ry)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor('#1e293b')
  pdf.setFontSize(9.5)
  pdf.text(`Douala, ${today}`, rightPanelStart, ry + 5)
  ry += 14

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor('#64748b')
  pdf.text('Invoice No:', rightPanelStart, ry)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor('#1e293b')
  pdf.setFontSize(9.5)
  pdf.text(data.invoiceNumber || '', rightPanelStart, ry + 5)

  // Use the tallest panel for y
  y = Math.max(y, ry + 10) + 6

  // Light separator before the table
  pdf.setDrawColor('#e2e8f0')
  pdf.setLineWidth(0.3)
  pdf.line(M, y, rightX, y)
  y += 8

  // ═══════════════════════════════════════════════════════
  //  CATEGORY SECTIONS — clean table with generous spacing
  // ═══════════════════════════════════════════════════════
  const colDesc = M + 3
  const colQty = 128
  const colUnit = 162
  const colTotal = rightX - 2
  const maxDescChars = 55  // Slightly narrower to keep clear of numeric columns

  // Row layout constants shared by every category's keep-together sizing
  const lineLead = 4.5      // Spacing between wrapped description lines
  const rowPadTop = 2       // Padding above text within a row
  const rowPadBottom = 3    // Padding below text within a row
  const maxUsablePerPage = (285 - B) - (M + 8)   // Content height available on a fresh page

  function rowHeightFor(item: any): number {
    const wrapped = wrapText(item.description || '—', maxDescChars)
    const textHeight = (wrapped.length - 1) * lineLead + 3.5
    return rowPadTop + textHeight + rowPadBottom
  }

  function subsectionBlockHeight(items: any[], showSubtotal: boolean): number {
    const headingBlockH = 8 + 7.5   // sub-heading row + column header row
    const subtotalBlockH = showSubtotal ? 14.5 : 0   // spacing + rule + subtotal line
    return headingBlockH + items.reduce((s: number, it: any) => s + rowHeightFor(it), 0) + subtotalBlockH
  }

  function renderCategoryTable(title: string, subs: any[]) {
    const nonEmptySubs = subs.filter((s: any) => (s.items || []).length > 0)
    if (nonEmptySubs.length === 0) return

    // A single-subsection category's subtotal is always identical to the
    // category total shown in the totals box below — showing both reads as
    // a duplicated/mistaken number. Only break out per-subsection subtotals
    // when there's more than one subsection to actually distinguish.
    const showSubtotals = nonEmptySubs.length > 1

    // Keep-together: don't leave the category header stranded alone at the
    // bottom of a page with its first subsection pushed to the next one. If
    // the header plus its first subsection fit on a fresh page, break now.
    const categoryHeaderH = 9.5
    const firstBlockH = subsectionBlockHeight(nonEmptySubs[0].items || [], showSubtotals)
    const neededWithFirst = categoryHeaderH + firstBlockH
    checkPageBreak(neededWithFirst <= maxUsablePerPage ? neededWithFirst : categoryHeaderH)

    // Section header — full-width dark bar
    pdf.setFillColor('#1e3a5f')
    pdf.roundedRect(M, y, contentW, 7.5, 1, 1, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor('#ffffff')
    pdf.text(title, M + 4, y + 5)
    y += 9.5

    for (const sub of nonEmptySubs) {
      const items = sub.items || []

      // Keep-together: a subsection that would otherwise be split leaving only
      // one orphaned row before/after the page break looks broken. If the
      // whole subsection fits on a fresh page, push it there as a unit instead
      // of starting it here and immediately breaking mid-table.
      const subsectionBlockH = subsectionBlockHeight(items, showSubtotals)
      checkPageBreak(subsectionBlockH <= maxUsablePerPage ? subsectionBlockH : 14)

      const drawSubHeading = (continued: boolean) => {
        // Subtle tinted background for sub-section heading
        pdf.setFillColor('#f0f4ff')
        pdf.rect(M, y, contentW, 6.5, 'F')
        // Left accent bar
        pdf.setFillColor('#3b82f6')
        pdf.rect(M, y, 1.5, 6.5, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8.5)
        pdf.setTextColor('#1e40af')
        pdf.text((sub.heading || 'Services') + (continued ? ' (continued)' : ''), M + 5, y + 4.5)
        y += 8
      }

      const drawColumnHeaders = () => {
        pdf.setFillColor('#f1f5f9')
        pdf.rect(M, y, contentW, 5.5, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(7.5)
        pdf.setTextColor('#64748b')
        pdf.text('DESCRIPTION', colDesc, y + 3.8)
        pdf.text('QTY', colQty, y + 3.8, { align: 'center' })
        pdf.text('UNIT PRICE (XAF)', colUnit, y + 3.8, { align: 'right' })
        pdf.text('TOTAL (XAF)', colTotal, y + 3.8, { align: 'right' })
        y += 7.5  // More space between header row and first data row
      }

      drawSubHeading(false)
      drawColumnHeaders()

      // Item rows — generous line spacing
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx]
        const tot = (item.qty || 0) * (item.unitPrice || 0)
        const desc = item.description || '—'
        const wrapped = wrapText(desc, maxDescChars)
        const rowHeight = rowHeightFor(item)

        checkPageBreak(rowHeight, () => {
          drawSubHeading(true)
          drawColumnHeaders()
        })

        // Zebra striping — very subtle
        if (idx % 2 === 0) {
          pdf.setFillColor('#f8fafc')
          pdf.rect(M, y, contentW, rowHeight, 'F')
        }

        const baseY = y + rowPadTop + 2.5
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        pdf.setTextColor('#1e293b')
        for (let i = 0; i < wrapped.length; i++) {
          pdf.text(wrapped[i], colDesc, baseY + i * lineLead)
        }
        pdf.text(String(item.qty || 0), colQty, baseY, { align: 'center' })
        pdf.text(fmt(item.unitPrice || 0), colUnit, baseY, { align: 'right' })
        pdf.setFont('helvetica', 'bold')
        pdf.text(fmt(tot), colTotal, baseY, { align: 'right' })

        y += rowHeight

        // Row separator — very light
        pdf.setDrawColor('#e2e8f0')
        pdf.setLineWidth(0.1)
        pdf.line(M + 1, y, rightX - 1, y)
      }

      // Sub-section subtotal — only shown when it adds information beyond
      // the category total (i.e. more than one subsection in this category)
      if (showSubtotals) {
        const subTot = itemsTotal(items)
        checkPageBreak(7)
        y += 2
        pdf.setDrawColor('#94a3b8')
        pdf.setLineWidth(0.2)
        pdf.line(colUnit - 10, y, rightX - 1, y)
        y += 4.5
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.setTextColor('#1e3a5f')
        pdf.text('Subtotal:', colUnit, y, { align: 'right' })
        pdf.text(`${fmt(subTot)} XAF`, colTotal, y, { align: 'right' })
        y += 8
      } else {
        y += 3
      }
    }
  }

  renderCategoryTable('NON-RECURRENT CHARGES (NRC)', data.categories.nrc)
  renderCategoryTable('MONTHLY RECURRENT CHARGES (MRC)', data.categories.mrc)
  renderCategoryTable('ANNUAL RECURRENT CHARGES (ARC)', data.categories.arc)

  // ═══════════════════════════════════════════════════════
  //  TOTALS BOX — right-aligned, clearly separated
  // ═══════════════════════════════════════════════════════
  y += 4
  checkPageBreak(50)

  const totBoxLeft = 115
  const totBoxW = rightX - totBoxLeft
  const totStartY = y

  let totRows = 0
  if (nrcTotal > 0) totRows++
  if (mrcTotal > 0) totRows++
  if (arcTotal > 0) totRows++
  if (data.applyVat) totRows++
  totRows += 2 // separator space + grand total row
  const rowH = 6.5  // Taller rows for readability
  const totBoxH = totRows * rowH + 6

  // Box background
  pdf.setFillColor('#f8fafc')
  pdf.setDrawColor('#1e3a5f')
  pdf.setLineWidth(0.5)
  pdf.roundedRect(totBoxLeft, totStartY, totBoxW, totBoxH, 2, 2, 'FD')

  let ty = totStartY + 5

  function totalRow(labelTxt: string, amount: number) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor('#475569')
    pdf.text(labelTxt, totBoxLeft + 5, ty)
    pdf.setTextColor('#1e293b')
    pdf.text(`${fmt(amount)} XAF`, rightX - 5, ty, { align: 'right' })
    ty += rowH
  }

  if (nrcTotal > 0) totalRow('Non-Recurrent Charges', nrcTotal)
  if (mrcTotal > 0) totalRow('Monthly Recurrent Charges', mrcTotal)
  if (arcTotal > 0) totalRow('Annual Recurrent Charges', arcTotal)
  if (data.applyVat) totalRow('VAT (19.25%)', vatAmount)

  // Separator
  ty += 1
  pdf.setDrawColor('#1e3a5f')
  pdf.setLineWidth(0.4)
  pdf.line(totBoxLeft + 5, ty, rightX - 5, ty)
  ty += 4

  // Grand Total — bigger, bolder
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor('#1e3a5f')
  pdf.text('GRAND TOTAL', totBoxLeft + 5, ty)
  pdf.text(`${fmt(grandTotal)} XAF`, rightX - 5, ty, { align: 'right' })

  y = totStartY + totBoxH + 10

  // ═══════════════════════════════════════════════════════
  //  AMOUNT IN WORDS — clean single-line layout
  // ═══════════════════════════════════════════════════════
  if (grandTotal > 0) {
    checkPageBreak(14)

    // Subtle accent box
    pdf.setFillColor('#f0fdfa')
    pdf.setDrawColor('#0D9488')
    pdf.setLineWidth(0.3)
    pdf.roundedRect(M, y, contentW, 10, 1.5, 1.5, 'FD')

    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(8)
    pdf.setTextColor('#64748b')
    pdf.text('Amount in words:', M + 4, y + 6.5)

    pdf.setFont('helvetica', 'bolditalic')
    pdf.setFontSize(9)
    pdf.setTextColor('#0D9488')
    const wordsX = M + 4 + pdf.getTextWidth('Amount in words:  ')
    const remainingW = rightX - wordsX - 4
    const maxChars = Math.floor(remainingW / 1.8)
    const wordLines = wrapText(amountInWords, maxChars)

    // If it fits on one line, keep it in the box
    if (wordLines.length <= 1) {
      pdf.text(wordLines[0] || '', wordsX, y + 6.5)
      y += 16
    } else {
      // Multi-line: expand box
      const extraLines = wordLines.length - 1
      const boxH = 10 + extraLines * 5
      // Redraw box taller
      pdf.setFillColor('#f0fdfa')
      pdf.setDrawColor('#0D9488')
      pdf.setLineWidth(0.3)
      pdf.roundedRect(M, y, contentW, boxH, 1.5, 1.5, 'FD')
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(8)
      pdf.setTextColor('#64748b')
      pdf.text('Amount in words:', M + 4, y + 6.5)
      pdf.setFont('helvetica', 'bolditalic')
      pdf.setFontSize(9)
      pdf.setTextColor('#0D9488')
      for (let i = 0; i < wordLines.length; i++) {
        pdf.text(wordLines[i], i === 0 ? wordsX : M + 4, y + 6.5 + i * 5)
      }
      y += boxH + 6
    }
  }

  // ═══════════════════════════════════════════════════════
  //  TERMS & CONDITIONS — concise block format
  // ═══════════════════════════════════════════════════════
  if (data.terms) {
    checkPageBreak(24)
    y += 2

    // Section label
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7.5)
    pdf.setTextColor('#0D9488')
    pdf.text('TERMS & CONDITIONS', M, y)
    y += 5

    // Thin top border for the terms block
    pdf.setDrawColor('#e2e8f0')
    pdf.setLineWidth(0.2)
    pdf.line(M, y, rightX, y)
    y += 4

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor('#64748b')
    const tl = data.terms.split('\n').filter(l => l.trim() !== '')  // Skip blank lines
    for (const l of tl) {
      const trimmed = l.trim()
      // Wrap long lines with wider char limit for cleaner breaks
      const lines = wrapText(trimmed, 90)
      for (const wl of lines) {
        checkPageBreak(5)
        pdf.text('•  ' + wl, M + 1, y)
        y += 4.5
      }
      y += 1.5  // Small gap between terms for readability
    }
  }

  // Page footer on the final page
  addFooter()

  pdf.save(`${filename}.pdf`)
}
