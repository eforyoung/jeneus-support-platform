import { prisma } from '@/lib/db/prisma'

export async function getNextProjectNumber(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const last = await tx.project.findFirst({
      orderBy: { projectNumber: 'desc' },
      select: { projectNumber: true },
    })
    let nextSeq = 1
    if (last) {
      const match = last.projectNumber.match(/PRJ-(\d+)/)
      if (match) nextSeq = parseInt(match[1], 10) + 1
    }
    return `PRJ-${String(nextSeq).padStart(4, '0')}`
  })
}
