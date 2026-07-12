import { prisma } from '@/lib/db/prisma'

export async function getNextInvoiceNumber(): Promise<string> {
  const today = new Date()
  const dd = String(today.getDate()).padStart(2, '0')
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const yyyy = today.getFullYear()

  const result = await prisma.$transaction(async (tx) => {
    const last = await tx.invoice.findFirst({
      where: { invoiceNumber: { endsWith: `/JE/${dd}/${mm}/${yyyy}` } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    })

    let nextSeq = 1
    if (last) {
      const match = last.invoiceNumber.match(/^(\d+)\//)
      if (match) nextSeq = parseInt(match[1], 10) + 1
    }

    const number = `${String(nextSeq).padStart(4, '0')}/JE/${dd}/${mm}/${yyyy}`
    return number
  })

  return result
}
