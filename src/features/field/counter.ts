import { prisma } from '@/lib/db/prisma'

export async function getNextJobNumber(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const last = await tx.fieldJob.findFirst({ orderBy: { jobNumber: 'desc' }, select: { jobNumber: true } })
    let nextSeq = 1
    if (last) { const m = last.jobNumber.match(/FLD-(\d+)/); if (m) nextSeq = parseInt(m[1], 10) + 1 }
    return `FLD-${String(nextSeq).padStart(4, '0')}`
  })
}
