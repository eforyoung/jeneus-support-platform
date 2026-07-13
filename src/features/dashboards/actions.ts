'use server'

import { prisma } from '@/lib/db/prisma'

export async function getDashboardData(_period?: string, _customerId?: string) {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)

  const [openTickets, slaData, engineers, revenue, expiringAssets, projects] = await Promise.all([
    prisma.ticket.groupBy({ by: ['priority', 'status'], where: { status: { notIn: ['CLOSED', 'RESOLVED'] } }, _count: true }),
    prisma.ticket.findMany({ where: { resolvedAt: { gte: thirtyDaysAgo }, slaDeadline: { not: null } }, select: { slaDeadline: true, resolvedAt: true, priority: true }, take: 500 }),
    prisma.ticket.groupBy({ by: ['assignedToId'], where: { status: { notIn: ['CLOSED', 'RESOLVED'] } }, _count: true }),
    prisma.invoice.groupBy({ by: ['customerId'], where: { savedAt: { gte: thirtyDaysAgo } }, _sum: { grandTotal: true }, orderBy: { _sum: { grandTotal: 'desc' } }, take: 10 }),
    prisma.$transaction([
      prisma.license.findMany({ where: { endDate: { lte: new Date(now.getTime() + 90 * 86400000), gte: now } }, orderBy: { endDate: 'asc' }, take: 20, include: { asset: { select: { assetTag: true } } } }),
      prisma.warranty.findMany({ where: { endDate: { lte: new Date(now.getTime() + 90 * 86400000), gte: now } }, orderBy: { endDate: 'asc' }, take: 20, include: { asset: { select: { assetTag: true } } } }),
    ]),
    prisma.project.groupBy({ by: ['status'], _count: true }),
  ])

  // SLA compliance
  const resolved = slaData.filter((t: any) => t.resolvedAt)
  const met = resolved.filter((t: any) => new Date(t.resolvedAt!) <= new Date(t.slaDeadline!))
  const slaCompliance = resolved.length > 0 ? Math.round((met.length / resolved.length) * 100) : 100
  const avgMttr = resolved.length > 0 ? resolved.reduce((s: number, t: any) => s + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt!).getTime()), 0) / resolved.length / 3600000 : 0

  // Engineer workload
  const userIds = [...new Set(engineers.filter((e: any) => e.assignedToId).map((e: any) => e.assignedToId))]
  const userNames = userIds.length > 0
    ? Object.fromEntries((await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })).map((u: any) => [u.id, u.name]))
    : {}

  const engineerWorkload = engineers.filter((e: any) => e.assignedToId).map((e: any) => ({ name: userNames[e.assignedToId!] || e.assignedToId, count: e._count })).sort((a: any, b: any) => b.count - a.count)

  // Revenue by customer
  const customerIds = revenue.map((r: any) => r.customerId)
  const customerNames = customerIds.length > 0
    ? Object.fromEntries((await prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true } })).map((c: any) => [c.id, c.name]))
    : {}
  const revenueByCustomer = revenue.map((r: any) => ({ name: customerNames[r.customerId] || r.customerId, total: Number(r._sum.grandTotal || 0) }))

  // Ticket volume (created vs resolved per day last 30 days)
  const [createdDaily, resolvedDaily] = await Promise.all([
    prisma.ticket.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true }, orderBy: { createdAt: 'asc' } }),
    prisma.ticket.findMany({ where: { resolvedAt: { gte: thirtyDaysAgo } }, select: { resolvedAt: true }, orderBy: { resolvedAt: 'asc' } }),
  ])

  const ticketVolume: { date: string; created: number; resolved: number }[] = []
  for (let d = 0; d < 30; d++) {
    const date = new Date(now.getTime() - (29 - d) * 86400000)
    const ds = date.toISOString().split('T')[0]
    ticketVolume.push({
      date: ds,
      created: createdDaily.filter((t: any) => t.createdAt.toISOString().startsWith(ds)).length,
      resolved: resolvedDaily.filter((t: any) => t.resolvedAt?.toISOString().startsWith(ds)).length,
    })
  }

  // Project health
  const projHealth = { onTrack: 0, atRisk: 0, overdue: 0 }
  const allProjects = await prisma.project.findMany({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } }, include: { tasks: true } })
  for (const p of allProjects) {
    const done = p.tasks.filter((t: any) => t.status === 'DONE').length
    const total = p.tasks.length
    const pct = total > 0 ? done / total : 0
    if (p.endDate && new Date(p.endDate) < now) projHealth.overdue++
    else if (p.endDate && new Date(p.endDate).getTime() - now.getTime() < 7 * 86400000 && pct < 0.8) projHealth.atRisk++
    else projHealth.onTrack++
  }

  return {
    openTickets,
    slaCompliance,
    avgMttr: Math.round(avgMttr * 10) / 10,
    engineerWorkload,
    revenueByCustomer,
    ticketVolume,
    expiringAssets: { licenses: expiringAssets[0], warranties: expiringAssets[1] },
    projectHealth: projHealth,
  }
}
