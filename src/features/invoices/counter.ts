import { prisma } from '@/lib/db/prisma'

export async function getNextInvoiceNumber(): Promise<string> {
  const today = new Date()
  const dd = String(today.getDate()).padStart(2, '0')
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const yyyy = today.getFullYear()

  // Use raw query to avoid Prisma 6 nested transaction issue
  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { endsWith: `/JE/${dd}/${mm}/${yyyy}` } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })

  let nextSeq = 1000
  if (last) {
    const match = last.invoiceNumber.match(/^(\d+)\//)
    if (match) nextSeq = Math.max(parseInt(match[1], 10) + 1, 1000)
  }

  return `${String(nextSeq).padStart(4, '0')}/JE/${dd}/${mm}/${yyyy}`
}
