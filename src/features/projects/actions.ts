'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'
import { getNextProjectNumber } from './counter'

// ─── Projects ───

export async function getProjects(filters?: { status?: string; customerId?: string }) {
  const where: any = {}
  if (filters?.status) where.status = filters.status
  if (filters?.customerId) where.customerId = filters.customerId
  return prisma.project.findMany({
    where,
    include: {
      customer: { select: { name: true } },
      projectManager: { select: { name: true } },
      tasks: true,
      _count: { select: { tasks: true, invoices: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true } },
      site: true,
      projectManager: { select: { name: true } },
      tasks: { orderBy: { sortOrder: 'asc' }, include: { assignedTo: { select: { name: true } }, subTasks: true } },
      documents: { orderBy: { createdAt: 'desc' } },
      acceptances: { orderBy: { createdAt: 'desc' } },
      invoices: { orderBy: { savedAt: 'desc' }, select: { id: true, invoiceNumber: true, grandTotal: true, savedAt: true } },
    },
  })
}

export async function saveProject(data: Record<string, any>, id?: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  const userId = (session.user as any).id

  const d = {
    name: data.name || '',
    type: data.type || 'OTHER',
    status: data.status || 'PLANNING',
    customerId: data.customerId,
    siteId: data.siteId || null,
    projectManagerId: data.projectManagerId || null,
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
    budget: data.budget ? parseFloat(data.budget) : null,
    description: data.description || null,
  }

  let result
  if (id) {
    result = await prisma.project.update({ where: { id }, data: d })
  } else {
    const projectNumber = await getNextProjectNumber()
    result = await prisma.project.create({ data: { ...d, projectNumber } })
  }
  revalidatePath('/dashboard/projects')
  return { success: true, data: { id: result.id } }
}

export async function deleteProject(id: string) {
  await prisma.project.delete({ where: { id } })
  revalidatePath('/dashboard/projects')
  return { success: true }
}

// ─── Tasks ───

export async function createTask(projectId: string, data: Record<string, any>) {
  const maxSort = await prisma.projectTask.findFirst({
    where: { projectId, status: data.status || 'TODO' },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })
  const task = await prisma.projectTask.create({
    data: {
      projectId,
      title: data.title,
      description: data.description || null,
      status: (data.status || 'TODO') as any,
      priority: data.priority || 'MEDIUM',
      assignedToId: data.assignedToId || null,
      parentTaskId: data.parentTaskId || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      estimatedHours: data.estimatedHours ? parseFloat(data.estimatedHours) : null,
      sortOrder: (maxSort?.sortOrder ?? -1) + 1,
    },
  })
  revalidatePath('/dashboard/projects')
  return { success: true, data: { id: task.id } }
}

export async function updateTask(id: string, data: Record<string, any>) {
  const updates: any = { title: data.title, description: data.description, priority: data.priority, assignedToId: data.assignedToId || null, dueDate: data.dueDate ? new Date(data.dueDate) : null, estimatedHours: data.estimatedHours ? parseFloat(data.estimatedHours) : null }
  if (data.status) {
    updates.status = data.status
    if (data.status === 'DONE') updates.completedAt = new Date()
  }
  await prisma.projectTask.update({ where: { id }, data: updates })
  revalidatePath('/dashboard/projects')
  return { success: true }
}

export async function updateTaskStatus(id: string, status: string) {
  await prisma.projectTask.update({
    where: { id },
    data: { status: status as any, completedAt: status === 'DONE' ? new Date() : null },
  })
  revalidatePath('/dashboard/projects')
  return { success: true }
}

export async function deleteTask(id: string) {
  await prisma.projectTask.delete({ where: { id } })
  revalidatePath('/dashboard/projects')
  return { success: true }
}

// ─── Acceptance ───

export async function submitAcceptance(projectId: string, data: Record<string, any>) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  const userId = (session.user as any).id

  await prisma.projectAcceptance.create({
    data: {
      projectId,
      customerName: data.customerName || '',
      siteName: data.siteName || '',
      date: data.date ? new Date(data.date) : new Date(),
      overallResult: data.overallResult || 'ACCEPTED',
      checklist: data.checklist || [],
      customerSignatureUrl: data.customerSignatureUrl || null,
      engineerSignatureUrl: data.engineerSignatureUrl || null,
      reportPdfUrl: data.reportPdfUrl || null,
      submittedById: userId,
    },
  })
  if (data.overallResult === 'ACCEPTED') {
    await prisma.project.update({ where: { id: projectId }, data: { status: 'COMPLETED' } })
  }
  revalidatePath('/dashboard/projects')
  return { success: true }
}

// ─── Helpers ───

export async function getCustomersForProject() {
  return prisma.customer.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
}

export async function getUsersForProject() {
  return prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
}

export async function getSitesForProject(customerId: string) {
  return prisma.site.findMany({ where: { customerId }, select: { id: true, name: true } })
}
