import { Card } from '@/lib/ui'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/config'

export default async function DashboardsPage() {
  const session: any = await auth()

  let openCount = 0
  let projectCount = 0
  let assetCount = 0

  try { openCount = await prisma.ticket.count() } catch {}
  try { projectCount = await prisma.project.count() } catch {}
  try { assetCount = await prisma.asset.count() } catch {}

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Dashboards</h2>
      <p className="text-white/40 text-sm">Welcome, {session?.user?.name || 'User'}.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Tickets">
          <div className="text-3xl font-bold text-white">{openCount}</div>
          <div className="text-white/50 text-sm">Total tickets</div>
        </Card>
        <Card title="Projects">
          <div className="text-3xl font-bold text-white">{projectCount}</div>
          <div className="text-white/50 text-sm">Total projects</div>
        </Card>
        <Card title="Assets">
          <div className="text-3xl font-bold text-white">{assetCount}</div>
          <div className="text-white/50 text-sm">Total assets</div>
        </Card>
      </div>
    </div>
  )
}
