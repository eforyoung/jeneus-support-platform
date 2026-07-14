'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'

function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export async function getNextInvoiceNumber(): Promise<string> {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()

  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { endsWith: `/JE/${dd}/${mm}/${yyyy}` } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })

  let nextSeq = 1000
  if (last?.invoiceNumber) {
    const match = last.invoiceNumber.match(/^(\d+)\//)
    if (match) nextSeq = Math.max(parseInt(match[1], 10) + 1, 1000)
  }

  return `${String(nextSeq).padStart(4, '0')}/JE/${dd}/${mm}/${yyyy}`
}

export async function saveInvoice(data: Record<string, unknown>, existingId?: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false as const, error: 'Not authenticated' }
    const userId = (session.user as { id: string }).id

    const type = (data.type as string) || 'proforma'
    const applyVat = data.applyVat !== false
    const accountOwner = (data.accountOwner as string) || ''
    const terms = (data.terms as string) || ''
    const customerId = (data.customerId as string) || ''
    const customerName = (data.customerName as string || '').trim()
    const customerAddress = (data.customerAddress as string) || ''
    const customerBp = (data.customerBp as string) || ''
    const customerNiu = (data.customerNiu as string) || ''
    const customerRc = (data.customerRc as string) || ''
    const catsRaw = (data.categories as Record<string, { heading?: string; items?: { description?: string; qty?: number; unitPrice?: number }[] }[]>) || { nrc: [], mrc: [], arc: [] }

    if (!customerName) {
      return { success: false as const, error: 'Client name is required.' }
    }

    // Compute totals from items
    let nrc = 0, mrc = 0, arc = 0
    const allItems: { cat: string; heading: string; description: string; qty: number; unitPrice: number; total: number }[] = []

    for (const cat of ['nrc', 'mrc', 'arc'] as const) {
      const subs = catsRaw[cat] || []
      for (const sub of subs) {
        const heading = sub.heading || ''
        const items = sub.items || []
        for (const item of items) {
          const qty = num(item.qty, 1)
          const unitPrice = num(item.unitPrice)
          const total = qty * unitPrice
          allItems.push({ cat, heading, description: item.description || '', qty, unitPrice, total })
          if (cat === 'nrc') nrc += total
          else if (cat === 'mrc') mrc += total
          else arc += total
        }
      }
    }

    // VAT calculation
    const settings = await prisma.companySettings.findFirst()
    const vatRate = settings ? num(settings.vatRate) / 100 : 0.1925
    const subtotal = nrc + mrc + arc
    const vatAmount = applyVat ? Math.round(subtotal * vatRate) : 0
    const grandTotal = subtotal + vatAmount

    // Resolve customer — auto-create if needed
    let resolvedCustomerId = customerId
    if (!resolvedCustomerId) {
      const existing = await prisma.customer.findFirst({
        where: { name: { equals: customerName, mode: 'insensitive' } },
      })
      if (existing) {
        resolvedCustomerId = existing.id
      } else {
        const c = await prisma.customer.create({
          data: {
            name: customerName,
            address: customerAddress || null,
            bp: customerBp || null,
            niu: customerNiu || null,
            rc: customerRc || null,
          },
        })
        resolvedCustomerId = c.id
      }
    }

    if (existingId) {
      // Update existing
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: existingId } })
      await prisma.invoice.update({
        where: { id: existingId },
        data: {
          type: type === 'final' ? 'FINAL' : 'PROFORMA',
          customerId: resolvedCustomerId,
          applyVat,
          vatRate: vatRate * 100,
          nonRecurrentTotal: nrc, monthlyRecurrentTotal: mrc, annualRecurrentTotal: arc,
          vatAmount, grandTotal, accountOwner, terms, createdById: userId,
        },
      })
      if (allItems.length > 0) {
        await prisma.invoiceItem.createMany({
          data: allItems.map((it, i) => ({
            invoiceId: existingId,
            category: it.cat.toUpperCase() as any,
            heading: it.heading,
            description: it.description,
            qty: it.qty,
            unitPrice: it.unitPrice,
            total: it.total,
            sortOrder: i,
          })),
        })
      }
      revalidatePath('/dashboard/invoices')
      const inv = await prisma.invoice.findUnique({ where: { id: existingId }, select: { invoiceNumber: true } })
      return { success: true as const, data: { id: existingId, number: inv?.invoiceNumber || '' } }
    }

    // Create new
    const invoiceNumber = await getNextInvoiceNumber()
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        type: type === 'final' ? 'FINAL' : 'PROFORMA',
        customerId: resolvedCustomerId,
        applyVat,
        vatRate: vatRate * 100,
        nonRecurrentTotal: nrc, monthlyRecurrentTotal: mrc, annualRecurrentTotal: arc,
        vatAmount, grandTotal, accountOwner, terms,
        createdById: userId,
        savedAt: new Date(),
      },
    })
    if (allItems.length > 0) {
      await prisma.invoiceItem.createMany({
        data: allItems.map((it, i) => ({
          invoiceId: invoice.id,
          category: it.cat.toUpperCase() as any,
          heading: it.heading,
          description: it.description,
          qty: it.qty,
          unitPrice: it.unitPrice,
          total: it.total,
          sortOrder: i,
        })),
      })
    }

    revalidatePath('/dashboard/invoices')
    return { success: true as const, data: { id: invoice.id, number: invoice.invoiceNumber } }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error saving invoice'
    console.error('saveInvoice error:', message)
    return { success: false as const, error: message }
  }
}

export async function deleteInvoice(id: string) {
  try {
    await prisma.invoice.delete({ where: { id } })
    revalidatePath('/dashboard/invoices')
    return { success: true }
  } catch {
    return { success: false, error: 'Delete failed' }
  }
}

export async function getInvoices() {
  try {
    const session = await auth()
    if (!session?.user) return []
    const user = session.user as { id: string; role: string }
    const where = (user.role === 'SUPERADMIN' || user.role === 'ADMIN') ? {} : { createdById: user.id }

    const invoices = await prisma.invoice.findMany({
      where,
      include: { customer: { select: { name: true } } },
      orderBy: { savedAt: 'desc' },
    })
    return invoices.map(inv => ({ ...inv, grandTotal: num(inv.grandTotal) }))
  } catch {
    return []
  }
}

export async function getInvoice(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      customer: { select: { name: true, address: true, bp: true, niu: true, rc: true } },
    },
  })
}

export async function getCustomersForDropdown() {
  return prisma.customer.findMany({
    select: { id: true, name: true, address: true, bp: true, niu: true, rc: true },
    orderBy: { name: 'asc' },
  })
}

export async function getCompanySettings() {
  const s = await prisma.companySettings.findFirst()
  return s ? { ...s, vatRate: num(s.vatRate) } : null
}

export async function exportInvoicesJSON(): Promise<string> {
  const invoices = await prisma.invoice.findMany({
    include: { items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { savedAt: 'desc' },
  })
  return JSON.stringify(invoices, null, 2)
}

export async function importInvoicesJSON(formData: FormData) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'Not authenticated' }
    const file = formData.get('file') as File
    if (!file) return { success: false, error: 'No file provided' }
    const text = await file.text()
    const data = JSON.parse(text)
    if (!Array.isArray(data)) return { success: false, error: 'Expected array' }
    let imported = 0
    for (const inv of data) {
      if (!inv.id || !inv.invoiceNumber) continue
      const exists = await prisma.invoice.findUnique({ where: { id: inv.id } })
      if (exists) continue
      await prisma.invoice.create({
        data: {
          id: inv.id, invoiceNumber: inv.invoiceNumber,
          type: inv.type || 'PROFORMA', customerId: inv.customerId || '',
          applyVat: inv.applyVat ?? true, vatRate: inv.vatRate ?? 19.25,
          nonRecurrentTotal: inv.nonRecurrentTotal ?? 0,
          monthlyRecurrentTotal: inv.monthlyRecurrentTotal ?? 0,
          annualRecurrentTotal: inv.annualRecurrentTotal ?? 0,
          vatAmount: inv.vatAmount ?? 0, grandTotal: inv.grandTotal ?? 0,
          accountOwner: inv.accountOwner || '', terms: inv.terms || '',
          createdById: (session.user as { id: string }).id,
          savedAt: inv.savedAt ? new Date(inv.savedAt) : new Date(),
        },
      })
      imported++
    }
    revalidatePath('/dashboard/invoices')
    return { success: true, data: { imported, skipped: data.length - imported } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Import failed' }
  }
}
