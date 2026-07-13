import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/features/shell/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as any

  return (
    <DashboardShell userId={user.id} userName={user.name || 'User'} userRole={user.role}>
      {children}
    </DashboardShell>
  )
}
