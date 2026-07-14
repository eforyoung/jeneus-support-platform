'use client'

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export async function generatePDF(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId)
  if (!element) {
    alert('Preview element not found.')
    return
  }

  try {
    // Temporarily fix element width to A4 proportions (210mm × 297mm)
    const originalWidth = element.style.width
    const originalMaxWidth = element.style.maxWidth
    element.style.maxWidth = '700px'
    element.style.width = '700px'

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    })

    // Restore original styles
    element.style.width = originalWidth
    element.style.maxWidth = originalMaxWidth

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth() - 16 // 8mm margin each side
    const pageHeight = pdf.internal.pageSize.getHeight() - 16
    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // Scale to fit single page if needed
    const scale = Math.min(1, pageHeight / imgHeight)
    const finalWidth = imgWidth * scale
    const finalHeight = imgHeight * scale
    const x = (pdf.internal.pageSize.getWidth() - finalWidth) / 2
    const y = 8

    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight)

    // If it's still slightly over, add pages — but the compact design should fit
    let remainingHeight = imgHeight - pageHeight
    let offset = -pageHeight
    while (remainingHeight > 0) {
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', x, offset + y, imgWidth, imgHeight)
      remainingHeight -= pageHeight
      offset -= pageHeight
    }

    pdf.save(`${filename}.pdf`)
  } catch (err) {
    console.error('PDF generation failed:', err)
    alert('PDF generation failed. Check the console for details.')
  }
}
