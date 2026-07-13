import { prisma } from '@/lib/db/prisma'

const PREFIXES: Record<string, string> = {
  INCIDENT: 'TKT',
  SERVICE_REQUEST: 'SRQ',
  CHANGE_REQUEST: 'CHG',
  PROBLEM: 'PRB',
}

export async function getNextTicketNumber(type: string): Promise<string> {
  const prefix = PREFIXES[type] || 'TKT'

  return prisma.$transaction(async (tx) => {
    const last = await tx.ticket.findFirst({
      where: { ticketNumber: { startsWith: prefix } },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    })

    let nextSeq = 1
    if (last) {
      const match = last.ticketNumber.match(/-(\d+)$/)
      if (match) nextSeq = parseInt(match[1], 10) + 1
    }

    return `${prefix}-${String(nextSeq).padStart(4, '0')}`
  })
}

export async function getNextContractNumber(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const last = await tx.contract.findFirst({
      orderBy: { contractNumber: 'desc' },
      select: { contractNumber: true },
    })
    let nextSeq = 1
    if (last) {
      const match = last.contractNumber.match(/CON-(\d+)/)
      if (match) nextSeq = parseInt(match[1], 10) + 1
    }
    return `CON-${String(nextSeq).padStart(4, '0')}`
  })
}
