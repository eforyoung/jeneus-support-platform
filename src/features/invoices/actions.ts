'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'
import { getNextInvoiceNumber } from './counter'
import { z } from 'zod'

// ─── Validation schemas ───

const itemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description required'),
  qty: z.number().min(1),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
})

const subSectionSchema = z.object({
  id: z.string().optional(),
  heading: z.string().optional().default(''),
  items: z.array(itemSchema).optional().default([]),
})

const invoiceSchema = z.object({
  type: z.enum(['proforma', 'final']),
  customerId: z.string().optional().default(''),
  customerName: z.string().optional().default(''),
  customerAddress: z.string().optional().default(''),
  customerBp: z.string().optional().default(''),
  customerNiu: z.string().optional().default(''),
  customerRc: z.string().optional().default(''),
  applyVat: z.boolean(),
  accountOwner: z.string().optional().default(''),
  terms: z.string().optional().default(''),
  categories: z.object({
    nrc: z.array(subSectionSchema).optional().default([]),
    mrc: z.array(subSectionSchema).optional().default([]),
    arc: z.array(subSectionSchema).optional().default([]),
  }),
})

// ─── CRUD ───

export async function saveInvoice(rawData: unknown, existingId?: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  const userId = (session.user as any).id

  const parsed = invoiceSchema.safeParse(rawData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }
  const data = parsed.data

  const nrc = data.categories.nrc.reduce(
    (s, sub) => s + sub.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0), 0)
  const mrc = data.categories.mrc.reduce(
    (s, sub) => s + sub.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0), 0)
  const arc = data.categories.arc.reduce(
    (s, sub) => s + sub.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0), 0)
  const subtotal = nrc + mrc + arc

  const settings = await prisma.companySettings.findFirst()
  const vatRate = settings ? Number(settings.vatRate) / 100 : 0.1925
  const vatAmount = data.applyVat ? Math.round(subtotal * vatRate) : 0
  const grandTotal = subtotal + vatAmount

  // Auto-create customer if name provided but no customerId
  let customerId = data.customerId
  if (!customerId && data.customerName) {
    const existing = await prisma.customer.findFirst({
      where: { name: { equals: data.customerName, mode: 'insensitive' } },
    })
    if (existing) {
      customerId = existing.id
    } else {
      const newCustomer = await prisma.customer.create({
        data: {
          name: data.customerName,
          address: data.customerAddress || null,
          bp: data.customerBp || null,
          niu: data.customerNiu || null,
          rc: data.customerRc || null,
        },
      })
      customerId = newCustomer.id
    }
  }

  const invoiceData = {
    type: data.type as any,
    customerId: customerId || '',
    applyVat: data.applyVat,
    vatRate: vatRate * 100,
    nonRecurrentTotal: nrc,
    monthlyRecurrentTotal: mrc,
    annualRecurrentTotal: arc,
    vatAmount,
    grandTotal,
    accountOwner: data.accountOwner,
    terms: data.terms,
    createdById: userId,
    savedAt: new Date(),
  }

  if (existingId) {
    await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: existingId } })
      await tx.invoice.update({ where: { id: existingId }, data: invoiceData })

      const allItems: any[] = []
      let sortOrder = 0
      for (const cat of ['nrc', 'mrc', 'arc'] as const) {
        for (const sub of data.categories[cat]) {
          for (const item of sub.items) {
            allItems.push({
              invoiceId: existingId,
              category: cat.toUpperCase(),
              heading: sub.heading,
              description: item.description,
              qty: item.qty,
              unitPrice: item.unitPrice,
              total: item.qty * item.unitPrice,
              sortOrder: sortOrder++,
            })
          }
        }
      }
      if (allItems.length > 0) {
        await (tx.invoiceItem as any).createMany({ data: allItems })
      }
    })

    revalidatePath('/dashboard/invoices')
    const invoice = await prisma.invoice.findUnique({ where: { id: existingId } })
    return { success: true, data: { id: existingId, number: invoice?.invoiceNumber || '' } }
  }

  // Create new
  const invoiceNumber = await getNextInvoiceNumber()

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: { ...invoiceData, invoiceNumber },
    })

    const allItems: any[] = []
    let sortOrder = 0
    for (const cat of ['nrc', 'mrc', 'arc'] as const) {
      for (const sub of data.categories[cat]) {
        for (const item of sub.items) {
          allItems.push({
            invoiceId: inv.id,
            category: cat.toUpperCase(),
            heading: sub.heading,
            description: item.description,
            qty: item.qty,
            unitPrice: item.unitPrice,
            total: item.qty * item.unitPrice,
            sortOrder: sortOrder++,
          })
        }
      }
    }
    if (allItems.length > 0) {
      await (tx.invoiceItem as any).createMany({ data: allItems })
    }

    return inv
  })

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

  // SUPERADMIN and ADMIN see all invoices; others see only their own
  const where = (user.role === 'SUPERADMIN' || user.role === 'ADMIN')
    ? {}
    : { createdById: user.id }

  return prisma.invoice.findMany({
    where,
    include: { customer: { select: { name: true } } },
    orderBy: { savedAt: 'desc' },
  })
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
  return prisma.companySettings.findFirst()
}

// ─── Export/Import ───

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
        data: {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          type: inv.type || 'PROFORMA',
          customerId: inv.customerId,
          applyVat: inv.applyVat ?? true,
          vatRate: inv.vatRate ?? 19.25,
          nonRecurrentTotal: inv.nonRecurrentTotal ?? 0,
          monthlyRecurrentTotal: inv.monthlyRecurrentTotal ?? 0,
          annualRecurrentTotal: inv.annualRecurrentTotal ?? 0,
          vatAmount: inv.vatAmount ?? 0,
          grandTotal: inv.grandTotal ?? 0,
          accountOwner: inv.accountOwner || '',
          terms: inv.terms || '',
          createdById: (session.user as any).id,
          savedAt: inv.savedAt ? new Date(inv.savedAt) : new Date(),
        },
      })
      imported++
    }
  }

  revalidatePath('/dashboard/invoices')
  return { success: true, data: { imported, skipped: data.length - imported } }
}
