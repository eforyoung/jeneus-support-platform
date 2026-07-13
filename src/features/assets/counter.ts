import { prisma } from '@/lib/db/prisma'

export async function getNextAssetTag(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const last = await tx.asset.findFirst({
      orderBy: { assetTag: 'desc' },
      select: { assetTag: true },
    })
    let nextSeq = 1
    if (last) {
      const match = last.assetTag.match(/AST-(\d+)/)
      if (match) nextSeq = parseInt(match[1], 10) + 1
    }
    return `AST-${String(nextSeq).padStart(4, '0')}`
  })
}
