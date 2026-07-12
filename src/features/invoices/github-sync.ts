'use server'

import { prisma } from '@/lib/db/prisma'

// Phase I: basic GitHub sync skeleton. The full implementation
// (like the existing HTML app) requires per-user token/repo settings
// stored in a dedicated table or localStorage. For Phase I we provide
// the server action interface; the client can drive it when the user
// configures GitHub settings in the UI.

export async function githubSyncPush(token: string, repo: string, branch: string, filepath: string) {
  const invoices = await prisma.invoice.findMany({
    include: { items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { savedAt: 'desc' },
  })

  const content = Buffer.from(JSON.stringify(invoices, null, 2)).toString('base64')

  const url = `https://api.github.com/repos/${repo}/contents/${filepath}`

  // Get existing file SHA if it exists
  let sha = ''
  try {
    const getRes = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })
    if (getRes.ok) {
      const data = await getRes.json()
      sha = data.sha
    }
  } catch {
    // File doesn't exist yet — that's fine
  }

  const body: any = {
    message: `Update invoices ${new Date().toISOString()}`,
    content,
    branch,
  }
  if (sha) body.sha = sha

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    return { success: false, error: `GitHub API error: ${(err as any).message || res.status}` }
  }

  return { success: true }
}

export async function githubSyncPull(token: string, repo: string, branch: string, filepath: string) {
  const url = `https://api.github.com/repos/${repo}/contents/${filepath}?ref=${branch}`

  const res = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })

  if (!res.ok) {
    return { success: false, error: `GitHub API error: ${res.status}` }
  }

  const data = await res.json()
  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  const invoices = JSON.parse(content)

  let imported = 0
  if (Array.isArray(invoices)) {
    for (const inv of invoices) {
      const exists = inv.id ? await prisma.invoice.findUnique({ where: { id: inv.id } }) : null
      if (exists) continue

      if (inv.id && inv.invoiceNumber && inv.customerId) {
        await prisma.invoice.create({
          data: {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            type: inv.type || 'PROFORMA',
            customerId: inv.customerId,
            applyVat: inv.applyVat ?? true,
            vatRate: inv.vatRate ?? 19.25,
            nonRecurrentTotal: inv.nonRecurrentTotal ?? 0,
            monthlyRecurrentTotal: inv.monthlyRecurrentTotal ?? 0,
            annualRecurrentTotal: inv.annualRecurrentTotal ?? 0,
            vatAmount: inv.vatAmount ?? 0,
            grandTotal: inv.grandTotal ?? 0,
            accountOwner: inv.accountOwner || '',
            terms: inv.terms || '',
            createdById: '',
            savedAt: inv.savedAt ? new Date(inv.savedAt) : new Date(),
          },
        })
        imported++
      }
    }
  }

  return { success: true, data: { imported } }
}
