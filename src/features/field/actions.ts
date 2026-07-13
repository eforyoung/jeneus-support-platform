'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'
import { getNextJobNumber } from './counter'

export async function createFieldJob(data: Record<string, any>) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  const jobNumber = await getNextJobNumber()
  const job = await prisma.fieldJob.create({
    data: {
      jobNumber, type: data.type || 'INSTALLATION', status: 'ASSIGNED',
      customerId: data.customerId, siteId: data.siteId,
      assignedEngineerId: data.assignedEngineerId,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : new Date(),
      ticketId: data.ticketId || null, projectId: data.projectId || null,
      notes: data.notes || null,
    },
  })
  revalidatePath('/dashboard/field')
  return { success: true, data: { id: job.id, number: job.jobNumber } }
}

export async function getMyJobs() {
  const session = await auth()
  if (!session?.user) return []
  const userId = (session.user as any).id
  return prisma.fieldJob.findMany({
    where: { assignedEngineerId: userId },
    include: { customer: { select: { name: true } }, site: { select: { name: true, address: true, gpsLat: true, gpsLong: true } }, photos: true },
    orderBy: { scheduledDate: 'desc' },
  })
}

export async function getAllJobs() {
  return prisma.fieldJob.findMany({
    include: { customer: { select: { name: true } }, site: { select: { name: true, address: true } }, assignedEngineer: { select: { name: true } }, photos: true },
    orderBy: { scheduledDate: 'desc' },
  })
}

export async function acceptJob(id: string) {
  await prisma.fieldJob.update({ where: { id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } })
  revalidatePath('/dashboard/field')
  return { success: true }
}

export async function declineJob(id: string, reason: string) {
  await prisma.fieldJob.update({ where: { id }, data: { status: 'CANCELLED', notes: reason } })
  revalidatePath('/dashboard/field')
  return { success: true }
}

export async function enRoute(id: string) {
  await prisma.fieldJob.update({ where: { id }, data: { status: 'EN_ROUTE' } })
  revalidatePath('/dashboard/field')
  return { success: true }
}

export async function checkIn(id: string, lat: number, lng: number) {
  await prisma.fieldJob.update({ where: { id }, data: { status: 'ON_SITE', checkInAt: new Date(), checkInLat: lat, checkInLng: lng } })
  revalidatePath('/dashboard/field')
  return { success: true }
}

export async function completeJob(id: string, findings: string, recommendations: string, partsUsed: any) {
  await prisma.fieldJob.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: new Date(), checkOutAt: new Date(), findings, recommendations, partsUsed },
  })
  revalidatePath('/dashboard/field')
  return { success: true }
}

export async function getCustomersForField() {
  return prisma.customer.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
}

export async function getSitesForField(customerId: string) {
  return prisma.site.findMany({ where: { customerId }, select: { id: true, name: true, address: true } })
}

export async function getEngineersForField() {
  return prisma.user.findMany({ where: { active: true, role: { in: ['ENGINEER', 'MANAGER', 'ADMIN', 'SUPERADMIN'] } }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
}
