'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'
import { getNextAssetTag } from './counter'

// ─── Assets ───

export async function getAssets(filters?: { type?: string; status?: string; manufacturer?: string; customerId?: string; search?: string }) {
  const where: any = {}
  if (filters?.type) where.type = filters.type
  if (filters?.status) where.status = filters.status
  if (filters?.manufacturer) where.manufacturer = { contains: filters.manufacturer, mode: 'insensitive' }
  if (filters?.customerId) where.customerId = filters.customerId
  if (filters?.search) {
    where.OR = [
      { assetTag: { contains: filters.search, mode: 'insensitive' } },
      { serialNumber: { contains: filters.search, mode: 'insensitive' } },
      { model: { contains: filters.search, mode: 'insensitive' } },
      { hostname: { contains: filters.search, mode: 'insensitive' } },
    ]
  }
  return prisma.asset.findMany({
    where,
    include: {
      customer: { select: { name: true } },
      site: { select: { name: true } },
      licenses: { select: { id: true, endDate: true } },
      warranties: { select: { id: true, endDate: true } },
      _count: { select: { licenses: true, warranties: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getAsset(id: string) {
  return prisma.asset.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true } },
      site: { select: { name: true } },
      licenses: { orderBy: { endDate: 'asc' } },
      warranties: { orderBy: { endDate: 'asc' } },
      audits: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 50 },
    },
  })
}

export async function saveAsset(data: Record<string, any>, id?: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  const userId = (session.user as any).id

  const d = {
    type: data.type || 'OTHER',
    manufacturer: data.manufacturer || null,
    model: data.model || null,
    serialNumber: data.serialNumber || '',
    firmwareVersion: data.firmwareVersion || null,
    hostname: data.hostname || null,
    ipAddress: data.ipAddress || null,
    customerId: data.customerId || null,
    siteId: data.siteId || null,
    status: data.status || 'ACTIVE',
    purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
    purchaseCost: data.purchaseCost ? parseFloat(data.purchaseCost) : null,
    notes: data.notes || null,
  }

  if (id) {
    const old = await prisma.asset.findUnique({ where: { id } })
    await prisma.$transaction(async (tx) => {
      await tx.asset.update({ where: { id }, data: d })
      const fields = ['type', 'manufacturer', 'model', 'serialNumber', 'customerId', 'siteId', 'status']
      for (const field of fields) {
        const ov = String((old as any)?.[field] || '')
        const nv = String((d as any)[field] || '')
        if (ov !== nv) {
          await tx.assetAudit.create({ data: { assetId: id, userId, field, oldValue: ov, newValue: nv } })
        }
      }
    })
  } else {
    const assetTag = await getNextAssetTag()
    await prisma.asset.create({ data: { ...d, assetTag, serialNumber: d.serialNumber || `TBD-${assetTag}` } })
  }
  revalidatePath('/dashboard/assets')
  return { success: true }
}

export async function deleteAsset(id: string) {
  await prisma.asset.delete({ where: { id } })
  revalidatePath('/dashboard/assets')
  return { success: true }
}

// ─── Licenses ───

export async function saveLicense(data: Record<string, any>, id?: string) {
  const d = {
    assetId: data.assetId || null,
    softwareName: data.softwareName || '',
    licenseKey: data.licenseKey || null,
    seats: parseInt(data.seats) || 1,
    vendor: data.vendor || null,
    vendorContact: data.vendorContact || null,
    startDate: data.startDate ? new Date(data.startDate) : new Date(),
    endDate: data.endDate ? new Date(data.endDate) : new Date(),
  }
  if (id) await prisma.license.update({ where: { id }, data: d })
  else await prisma.license.create({ data: d as any })
  revalidatePath('/dashboard/assets')
  return { success: true }
}

export async function deleteLicense(id: string) {
  await prisma.license.delete({ where: { id } })
  revalidatePath('/dashboard/assets')
  return { success: true }
}

// ─── Warranties ───

export async function saveWarranty(data: Record<string, any>, id?: string) {
  const d = {
    assetId: data.assetId,
    type: data.type || null,
    provider: data.provider || null,
    coverage: data.coverage || null,
    contractNumber: data.contractNumber || null,
    startDate: data.startDate ? new Date(data.startDate) : new Date(),
    endDate: data.endDate ? new Date(data.endDate) : new Date(),
  }
  if (id) await prisma.warranty.update({ where: { id }, data: d })
  else await prisma.warranty.create({ data: d as any })
  revalidatePath('/dashboard/assets')
  return { success: true }
}

export async function deleteWarranty(id: string) {
  await prisma.warranty.delete({ where: { id } })
  revalidatePath('/dashboard/assets')
  return { success: true }
}

// ─── Helpers for dropdowns ───

export async function getCustomersForAsset() {
  return prisma.customer.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
}

export async function getSitesForAsset(customerId: string) {
  return prisma.site.findMany({ where: { customerId }, select: { id: true, name: true } })
}

// ─── Expiry ───

export async function getExpiringItems(daysThreshold: number = 30) {
  const threshold = new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000)
  const [licenses, warranties] = await Promise.all([
    prisma.license.findMany({
      where: { AND: [{ endDate: { lte: threshold } }, { endDate: { gte: new Date() } }] },
      include: { asset: { select: { assetTag: true, manufacturer: true, model: true } } },
      orderBy: { endDate: 'asc' },
    }),
    prisma.warranty.findMany({
      where: { AND: [{ endDate: { lte: threshold } }, { endDate: { gte: new Date() } }] },
      include: { asset: { select: { assetTag: true } } },
      orderBy: { endDate: 'asc' },
    }),
  ])
  return { licenses, warranties }
}

// ─── Import ───

export async function importAssetsCSV(formData: FormData) {
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
    if (row.serialnumber) {
      const exists = await prisma.asset.findUnique({ where: { serialNumber: row.serialnumber } })
      if (exists) continue
      const assetTag = await getNextAssetTag()
      await prisma.asset.create({
        data: {
          assetTag,
          type: (row.type || 'OTHER').toUpperCase(),
          manufacturer: row.manufacturer || null,
          model: row.model || null,
          serialNumber: row.serialnumber,
          firmwareVersion: row.firmwareversion || null,
          hostname: row.hostname || null,
          ipAddress: row.ipaddress || null,
          status: (row.status || 'ACTIVE').toUpperCase(),
          purchaseDate: row.purchasedate ? new Date(row.purchasedate) : null,
          purchaseCost: row.purchasecost ? parseFloat(row.purchasecost) : null,
        },
      })
      imported++
    }
  }
  revalidatePath('/dashboard/assets')
  return { success: true, data: { imported } }
}
