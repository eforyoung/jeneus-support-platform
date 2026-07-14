import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const steps: string[] = []
  try {
    steps.push('1. DB connected')

    // Test counter
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yyyy = now.getFullYear()
    const number = `1000/JE/${dd}/${mm}/${yyyy}`
    steps.push(`2. Invoice number: ${number}`)

    // Test customer lookup
    let cust = await prisma.customer.findFirst({ where: { name: { contains: 'Test' } } })
    if (!cust) {
      cust = await prisma.customer.create({ data: { name: 'Test Client ' + Date.now() } })
      steps.push(`3a. Created customer: ${cust.id}`)
    } else {
      steps.push(`3b. Found customer: ${cust.id}`)
    }

    // Test settings
    const settings = await prisma.companySettings.findFirst()
    steps.push(`4. Settings: ${settings ? 'found' : 'MISSING'}`)

    // Test invoice create
    const inv = await prisma.invoice.create({
      data: {
        invoiceNumber: number,
        type: 'PROFORMA',
        customerId: cust.id,
        applyVat: true,
        vatRate: 19.25,
        nonRecurrentTotal: 1000,
        monthlyRecurrentTotal: 0,
        annualRecurrentTotal: 0,
        vatAmount: 193,
        grandTotal: 1193,
        createdById: 'seed',
      },
    })
    steps.push(`5. Invoice created: ${inv.id}`)

    // Test item create
    await prisma.invoiceItem.create({
      data: {
        invoiceId: inv.id,
        category: 'NRC',
        heading: 'Equipment',
        description: 'Test item',
        qty: 1,
        unitPrice: 1000,
        total: 1000,
        sortOrder: 0,
      },
    })
    steps.push('6. Item created')

    // Test find
    const found = await prisma.invoice.findFirst({
      where: { id: inv.id },
      include: { items: true },
    })
    steps.push(`7. Found invoice with ${found?.items?.length || 0} items`)

    // Cleanup
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: inv.id } })
    await prisma.invoice.delete({ where: { id: inv.id } })
    steps.push('8. Cleaned up test data')

    return NextResponse.json({ success: true, steps })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, stack: err.stack, steps }, { status: 500 })
  }
}
