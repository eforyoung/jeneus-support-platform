import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const now = new Date()

  const [licenses, warranties] = await Promise.all([
    prisma.license.findMany({
      where: { endDate: { lte: thirtyDays, gt: now } },
      include: { asset: { select: { assetTag: true, manufacturer: true, model: true } } },
      orderBy: { endDate: 'asc' },
    }),
    prisma.warranty.findMany({
      where: { endDate: { lte: thirtyDays, gt: now } },
      include: { asset: { select: { assetTag: true } } },
      orderBy: { endDate: 'asc' },
    }),
  ])

  return NextResponse.json({
    expiringLicenses: licenses.length,
    expiringWarranties: warranties.length,
    items: {
      licenses: licenses.map((l) => ({
        asset: l.asset?.assetTag,
        software: l.softwareName,
        expiry: l.endDate,
      })),
      warranties: warranties.map((w) => ({
        asset: w.asset?.assetTag,
        type: w.type,
        provider: w.provider,
        expiry: w.endDate,
      })),
    },
  })
}
