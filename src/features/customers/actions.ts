'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ─── Customers ───

export async function getCustomers(search?: string, customerType?: string) {
  const session = await auth()
  if (!session?.user) return []

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { niu: { contains: search, mode: 'insensitive' } },
      { rc: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (customerType) where.customerType = customerType

  return prisma.customer.findMany({
    where,
    include: {
      accountManager: { select: { name: true } },
      _count: { select: { contacts: true, contracts: true, sites: true, tickets: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getCustomer(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      accountManager: { select: { name: true } },
      contacts: { orderBy: { isPrimary: 'desc' } },
      contracts: { orderBy: { startDate: 'desc' } },
      sites: { orderBy: { createdAt: 'desc' } },
      invoices: { orderBy: { savedAt: 'desc' }, include: { items: false } },
      tickets: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  })
}

export async function saveCustomer(data: any, id?: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const d = {
    name: data.name || '',
    customerType: data.customerType || 'BUSINESS',
    address: data.address || null,
    bp: data.bp || null,
    niu: data.niu || null,
    rc: data.rc || null,
    phone: data.phone || null,
    email: data.email || null,
    website: data.website || null,
    accountManagerId: data.accountManagerId || null,
  }

  if (id) {
    await prisma.customer.update({ where: { id }, data: d })
  } else {
    await prisma.customer.create({ data: d })
  }
  revalidatePath('/dashboard/customers')
  return { success: true }
}

export async function deleteCustomer(id: string) {
  await prisma.customer.delete({ where: { id } })
  revalidatePath('/dashboard/customers')
  return { success: true }
}

// ─── Contacts ───

export async function saveContact(data: any, id?: string) {
  if (id) {
    await prisma.contactPerson.update({ where: { id }, data })
  } else {
    await prisma.contactPerson.create({ data })
  }
  revalidatePath('/dashboard/customers')
  return { success: true }
}

export async function deleteContact(id: string) {
  await prisma.contactPerson.delete({ where: { id } })
  revalidatePath('/dashboard/customers')
  return { success: true }
}

// ─── Contracts ───

export async function saveContract(data: any, id?: string) {
  if (id) {
    await prisma.contract.update({ where: { id }, data })
  } else {
    await prisma.contract.create({ data })
  }
  revalidatePath('/dashboard/customers')
  return { success: true }
}

export async function deleteContract(id: string) {
  await prisma.contract.delete({ where: { id } })
  revalidatePath('/dashboard/customers')
  return { success: true }
}

// ─── Sites ───

export async function saveSite(data: any, id?: string) {
  if (id) {
    await prisma.site.update({ where: { id }, data })
  } else {
    await prisma.site.create({ data })
  }
  revalidatePath('/dashboard/customers')
  return { success: true }
}

export async function deleteSite(id: string) {
  await prisma.site.delete({ where: { id } })
  revalidatePath('/dashboard/customers')
  return { success: true }
}

// ─── Import ───

export async function importCustomersCSV(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) return { success: false, error: 'No file' }
  const text = await file.text()
  const lines = text.split('\n').filter(Boolean)
  if (lines.length < 2) return { success: false, error: 'Empty file' }

  const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase())
  let imported = 0
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c: string) => c.trim())
    const row: any = {}
    headers.forEach((h: string, idx: number) => { row[h] = cols[idx] || null })
    if (row.name) {
      await prisma.customer.create({
        data: {
          name: row.name,
          customerType: row.customertype || row.customer_type || 'BUSINESS',
          address: row.address || null,
          bp: row.bp || null,
          niu: row.niu || null,
          rc: row.rc || null,
          phone: row.phone || null,
          email: row.email || null,
          website: row.website || null,
        },
      })
      imported++
    }
  }
  revalidatePath('/dashboard/customers')
  return { success: true, data: { imported } }
}
