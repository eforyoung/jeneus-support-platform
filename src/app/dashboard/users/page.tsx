import { getUsers } from '@/features/auth/users-actions'
import { UserList } from '@/features/auth/UserList'
import { Card } from '@/lib/ui'

export default async function UsersPage() {
  const users = await getUsers()

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">User Management</h2>
      <Card title="All Users">
        <UserList users={users} />
      </Card>
    </div>
  )
}
