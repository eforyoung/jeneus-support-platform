import { prisma } from '@/lib/db/prisma'

export type Module = 'invoices' | 'customers' | 'tickets' | 'assets' | 'projects' | 'dashboards'
export type AccessAction = 'read' | 'write' | 'delete'

export async function hasAccess(userId: string, module: Module, action: AccessAction): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.active) return false
  if (user.role === 'SUPERADMIN') return true

  const userModule = await prisma.userModule.findUnique({
    where: { userId_module: { userId, module } },
  })
  if (!userModule) return false

  switch (action) {
    case 'read':
      return userModule.canRead
    case 'write':
      return userModule.canWrite
    case 'delete':
      return userModule.canDelete
    default:
      return false
  }
}
