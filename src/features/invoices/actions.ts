'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'
import { getNextInvoiceNumber } from './counter'

// ─── Helpers ───

function num(v: any, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

// ─── CRUD ───

export async function saveInvoice(data: Record<string, any>, existingId?: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  const userId = (session.user as any).id

  const type = data.type || 'proforma'
  const applyVat = data.applyVat !== false
  const accountOwner = data.accountOwner || ''
  const terms = data.terms || ''
  const customerId = data.customerId || ''
  let customerName = data.customerName || ''
  const customerAddress = data.customerAddress || ''
  const customerBp = data.customerBp || ''
  const customerNiu = data.customerNiu || ''
  const customerRc = data.customerRc || ''

  if (!customerName.trim()) {
    return { success: false, error: 'Client name is required.' }
  }

  // Parse categories
  const catsRaw = data.categories || { nrc: [], mrc: [], arc: [] }
  const categories = {
    nrc: Array.isArray(catsRaw.nrc) ? catsRaw.nrc : [],
    mrc: Array.isArray(catsRaw.mrc) ? catsRaw.mrc : [],
    arc: Array.isArray(catsRaw.arc) ? catsRaw.arc : [],
  }

  // Compute totals
  function itemsTotal(items: any[]): number {
    return (items || []).reduce((s: number, it: any) => s + num(it.qty) * num(it.unitPrice), 0)
  }
  const nrc = categories.nrc.reduce((s: number, sub: any) => s + itemsTotal(sub.items), 0)
  const mrc = categories.mrc.reduce((s: number, sub: any) => s + itemsTotal(sub.items), 0)
  const arc = categories.arc.reduce((s: number, sub: any) => s + itemsTotal(sub.items), 0)
  const subtotal = nrc + mrc + arc

  const settings = await prisma.companySettings.findFirst()
  const vatRate = settings ? num(settings.vatRate) / 100 : 0.1925
  const vatAmount = applyVat ? Math.round(subtotal * vatRate) : 0
  const grandTotal = subtotal + vatAmount

  // Resolve customer ID
  let resolvedCustomerId = customerId
  if (!resolvedCustomerId && customerName) {
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

  function flattenItems(invoiceId: string): any[] {
    const result: any[] = []
    let so = 0
    for (const cat of ['nrc', 'mrc', 'arc'] as const) {
      for (const sub of categories[cat]) {
        for (const item of sub.items || []) {
          result.push({
            invoiceId,
            category: cat.toUpperCase(),
            heading: sub.heading || '',
            description: item.description || '',
            qty: num(item.qty, 1),
            unitPrice: num(item.unitPrice),
            total: num(item.qty, 1) * num(item.unitPrice),
            sortOrder: so++,
          })
        }
      }
    }
    return result
  }

  const invoiceData = {
    type: type as any,
    customerId: resolvedCustomerId || '',
    applyVat,
    vatRate: vatRate * 100,
    nonRecurrentTotal: nrc,
    monthlyRecurrentTotal: mrc,
    annualRecurrentTotal: arc,
    vatAmount,
    grandTotal,
    accountOwner,
    terms,
    createdById: userId,
    savedAt: new Date(),
  }

  if (existingId) {
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: existingId } })
    await prisma.invoice.update({ where: { id: existingId }, data: invoiceData })
    const items = flattenItems(existingId)
    if (items.length > 0) await (prisma.invoiceItem as any).createMany({ data: items })

    revalidatePath('/dashboard/invoices')
    const inv = await prisma.invoice.findUnique({ where: { id: existingId } })
    return { success: true, data: { id: existingId, number: inv?.invoiceNumber || '' } }
  }

  // Create new
  const invoiceNumber = await getNextInvoiceNumber()
  const invoice = await prisma.invoice.create({ data: { ...invoiceData, invoiceNumber } })
  const items = flattenItems(invoice.id)
  if (items.length > 0) await (prisma.invoiceItem as any).createMany({ data: items })

  revalidatePath('/dashboard/invoices')
  return { success: true, data: { id: invoice.id, number: invoice.invoiceNumber } }
}

export async function deleteInvoice(id: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  await prisma.invoice.delete({ where: { id } })
  revalidatePath('/dashboard/invoices')
  return { success: true }
}

export async function getInvoices() {
  const session = await auth()
  if (!session?.user) return []
  const user = session.user as any
  const where = (user.role === 'SUPERADMIN' || user.role === 'ADMIN') ? {} : { createdById: user.id }

  const invoices = await prisma.invoice.findMany({
    where,
    include: { customer: { select: { name: true } } },
    orderBy: { savedAt: 'desc' },
  })
  return invoices.map(inv => ({
    ...inv,
    grandTotal: num(inv.grandTotal),
    vatAmount: num(inv.vatAmount),
  }))
}

export async function getInvoice(id: string) {
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      customer: { select: { name: true, address: true, bp: true, niu: true, rc: true } },
    },
  })
  if (!inv) return null
  return {
    ...inv,
    grandTotal: num(inv.grandTotal),
    vatAmount: num(inv.vatAmount),
    vatRate: num(inv.vatRate),
    items: inv.items.map(it => ({ ...it, qty: num(it.qty), unitPrice: num(it.unitPrice), total: num(it.total) })),
  }
}

export async function getCustomersForDropdown() {
  return prisma.customer.findMany({
    select: { id: true, name: true, address: true, bp: true, niu: true, rc: true },
    orderBy: { name: 'asc' },
  })
}

export async function getCompanySettings() {
  const s = await prisma.companySettings.findFirst()
  if (!s) return null
  return { ...s, vatRate: num(s.vatRate) }
}

export async function exportInvoicesJSON(): Promise<string> {
  const invoices = await prisma.invoice.findMany({
    include: { items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { savedAt: 'desc' },
  })
  return JSON.stringify(invoices, null, 2)
}

export async function importInvoicesJSON(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  const file = formData.get('file') as File
  if (!file) return { success: false, error: 'No file provided' }
  const text = await file.text()
  let data: any[]
  try { data = JSON.parse(text) } catch { return { success: false, error: 'Invalid JSON' } }
  if (!Array.isArray(data)) return { success: false, error: 'Expected array of invoices' }
  let imported = 0
  for (const inv of data) {
    const exists = inv._id ? await prisma.invoice.findUnique({ where: { id: inv._id } }) : null
    if (exists) continue
    if (inv.id && inv.invoiceNumber && inv.customerId) {
      await prisma.invoice.create({
        data: { id: inv.id, invoiceNumber: inv.invoiceNumber, type: inv.type || 'PROFORMA', customerId: inv.customerId, applyVat: inv.applyVat ?? true, vatRate: inv.vatRate ?? 19.25, nonRecurrentTotal: inv.nonRecurrentTotal ?? 0, monthlyRecurrentTotal: inv.monthlyRecurrentTotal ?? 0, annualRecurrentTotal: inv.annualRecurrentTotal ?? 0, vatAmount: inv.vatAmount ?? 0, grandTotal: inv.grandTotal ?? 0, accountOwner: inv.accountOwner || '', terms: inv.terms || '', createdById: (session.user as any).id, savedAt: inv.savedAt ? new Date(inv.savedAt) : new Date() },
      })
      imported++
    }
  }
  revalidatePath('/dashboard/invoices')
  return { success: true, data: { imported, skipped: data.length - imported } }
}
