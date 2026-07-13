'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'
import { getNextTicketNumber } from './counter'

// ─── CRUD ───

export async function createTicket(data: {
  type: string; priority: string; subject: string; description?: string
  customerId: string; siteId?: string; contactId?: string; contractId?: string
}) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  const userId = (session.user as any).id

  const ticketNumber = await getNextTicketNumber(data.type)

  // Calculate SLA deadline if contract is set
  let slaDeadline: Date | undefined
  if (data.contractId) {
    const contract = await prisma.contract.findUnique({ where: { id: data.contractId } })
    if (contract?.slaTarget) {
      const sla = contract.slaTarget as any
      const resolutionTime = sla.resolutionTime || 240 // default 4h
      const multipliers: Record<string, number> = { P1_CRITICAL: 0.5, P2_HIGH: 1, P3_MEDIUM: 2, P4_LOW: 4 }
      const multiplier = multipliers[data.priority] || 1
      slaDeadline = new Date(Date.now() + resolutionTime * multiplier * 60 * 1000)
    }
  }

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      type: data.type as any,
      priority: data.priority as any,
      status: 'NEW',
      subject: data.subject,
      description: data.description || '',
      customerId: data.customerId,
      siteId: data.siteId || null,
      contactId: data.contactId || null,
      assignedToId: null,
      createdById: userId,
      contractId: data.contractId || null,
      slaDeadline,
    },
  })

  revalidatePath('/dashboard/tickets')
  return { success: true, data: { id: ticket.id, number: ticket.ticketNumber } }
}

export async function updateTicketStatus(id: string, newStatus: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  const userId = (session.user as any).id

  const ticket = await prisma.ticket.findUnique({ where: { id } })
  if (!ticket) return { success: false, error: 'Ticket not found' }

  const now = new Date()
  const updates: any = { status: newStatus as any }
  if (newStatus === 'RESOLVED') updates.resolvedAt = now
  if (newStatus === 'CLOSED') updates.closedAt = now

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({ where: { id }, data: updates })
    await tx.ticketAudit.create({
      data: { ticketId: id, userId, field: 'status', oldValue: ticket.status, newValue: newStatus },
    })
  })

  revalidatePath('/dashboard/tickets')
  return { success: true }
}

export async function assignTicket(id: string, assignedToId: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  const userId = (session.user as any).id

  const ticket = await prisma.ticket.findUnique({ where: { id } })
  if (!ticket) return { success: false, error: 'Ticket not found' }

  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({ where: { id }, data: { assignedToId, status: ticket.status === 'NEW' ? ('ASSIGNED' as any) : undefined } })
    await tx.ticketAudit.create({
      data: { ticketId: id, userId, field: 'assignedTo', oldValue: ticket.assignedToId || '', newValue: assignedToId },
    })
  })

  revalidatePath('/dashboard/tickets')
  return { success: true }
}

export async function addComment(ticketId: string, body: string, isInternal: boolean) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  const userId = (session.user as any).id

  await prisma.ticketComment.create({
    data: { ticketId, userId, body, isInternal },
  })

  revalidatePath('/dashboard/tickets')
  return { success: true }
}

export async function getTickets(filters?: {
  type?: string; priority?: string; status?: string; customerId?: string;
  assignedToId?: string; search?: string
}) {
  const where: any = {}
  if (filters?.type) where.type = filters.type
  if (filters?.priority) where.priority = filters.priority
  if (filters?.status) where.status = filters.status
  if (filters?.customerId) where.customerId = filters.customerId
  if (filters?.assignedToId) where.assignedToId = filters.assignedToId
  if (filters?.search) {
    where.OR = [
      { subject: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  return prisma.ticket.findMany({
    where,
    include: {
      customer: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
}

export async function getTicket(id: string) {
  return prisma.ticket.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true } },
      site: true,
      contract: true,
      assignedTo: { select: { name: true } },
      createdBy: { select: { name: true } },
      comments: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
      attachments: { orderBy: { createdAt: 'desc' } },
      links: true,
      audits: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
    },
  })
}

export async function getUsersForAssignment() {
  return prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  })
}

export async function getCustomersForTicket() {
  return prisma.customer.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

export async function getSitesForCustomer(customerId: string) {
  return prisma.site.findMany({
    where: { customerId },
    select: { id: true, name: true },
  })
}

export async function escalateTicket(id: string) {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  const userId = (session.user as any).id
  const ticket = await prisma.ticket.findUnique({ where: { id } })
  if (!ticket) return { success: false, error: 'Not found' }
  await prisma.$transaction(async (tx) => {
    await tx.ticket.update({ where: { id }, data: { priority: 'P1_CRITICAL' as any } })
    await tx.ticketAudit.create({ data: { ticketId: id, userId, field: 'priority', oldValue: ticket.priority, newValue: 'P1_CRITICAL' } })
  })
  revalidatePath('/dashboard/tickets')
  return { success: true }
}

export async function getContractsForCustomer(customerId: string) {
  return prisma.contract.findMany({
    where: { customerId, status: 'ACTIVE' },
    select: { id: true, contractNumber: true, slaTarget: true },
  })
}
