'use client'

import { useState } from 'react'
import { Badge, Button, SlideOver } from '@/lib/ui'
import { toggleUserActive, resetUserPassword } from './users-actions'
import { UserForm } from './UserForm'

type User = {
  id: string
  email: string
  name: string
  role: string
  active: boolean
  userModules: { module: string; canRead: boolean; canWrite: boolean; canDelete: boolean }[]
}

export function UserList({ users: initialUsers }: { users: User[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [resetModal, setResetModal] = useState<{ userId: string; name: string } | null>(null)
  const [resetPassword, setResetPassword] = useState('')

  async function handleToggleActive(userId: string, active: boolean) {
    await toggleUserActive(userId, !active)
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, active: !active } : u)))
  }

  async function handleReset() {
    if (!resetModal) return
    const result = await resetUserPassword(resetModal.userId, resetPassword)
    if (result.success) {
      setResetModal(null)
      setResetPassword('')
    } else {
      alert((result as any).error || 'Reset failed')
    }
  }

  const roleBadge = (role: string) => {
    const variants: Record<string, 'purple' | 'blue' | 'green' | 'amber' | 'grey'> = {
      SUPERADMIN: 'purple',
      ADMIN: 'blue',
      MANAGER: 'green',
      ENGINEER: 'amber',
      VIEWER: 'grey',
    }
    return <Badge variant={variants[role] || 'grey'}>{role}</Badge>
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => {
            setEditingUser(null)
            setShowForm(true)
          }}
        >
          + Add User
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/60">
              <th className="py-2 px-3 font-medium">Name</th>
              <th className="py-2 px-3 font-medium">Email</th>
              <th className="py-2 px-3 font-medium">Role</th>
              <th className="py-2 px-3 font-medium">Modules</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-2 px-3 text-white">{user.name}</td>
                <td className="py-2 px-3 text-white/60">{user.email}</td>
                <td className="py-2 px-3">{roleBadge(user.role)}</td>
                <td className="py-2 px-3 text-white/60">
                  {user.userModules.length > 0
                    ? user.userModules.map((m) => m.module).join(', ')
                    : 'None'}
                </td>
                <td className="py-2 px-3">
                  <button
                    onClick={() => handleToggleActive(user.id, user.active)}
                    className={`text-xs px-2 py-1 rounded-full ${
                      user.active
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {user.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="py-2 px-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingUser(user)
                        setShowForm(true)
                      }}
                      className="text-teal hover:text-teal-dark text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setResetModal({ userId: user.id, name: user.name })}
                      className="text-amber-400 hover:text-amber-300 text-xs"
                    >
                      Reset PW
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SlideOver
        title={editingUser ? 'Edit User' : 'Add User'}
        open={showForm}
        onClose={() => setShowForm(false)}
      >
        <UserForm
          user={editingUser}
          onSaved={() => {
            setShowForm(false)
            window.location.reload()
          }}
          onCancel={() => setShowForm(false)}
        />
      </SlideOver>

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setResetModal(null)} />
          <div className="relative bg-dark-card border border-white/10 rounded-lg shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Reset Password: {resetModal.name}
            </h3>
            <input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white mb-4 focus:outline-none focus:border-teal"
              minLength={6}
            />
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setResetModal(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleReset}>
                Reset Password
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
