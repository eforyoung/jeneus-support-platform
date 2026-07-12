'use client'

import { useState } from 'react'
import { Button, Input } from '@/lib/ui'
import { createUser, updateUserModules } from './users-actions'

const ALL_MODULES = [
  'invoices', 'customers', 'tickets', 'assets',
  'projects', 'monitoring', 'field', 'dashboards',
] as const

export function UserForm({
  user,
  onSaved,
  onCancel,
}: {
  user: { id: string; email: string; name: string; role: string; userModules: { module: string; canRead: boolean; canWrite: boolean; canDelete: boolean }[] } | null
  onSaved: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(user?.role || 'VIEWER')
  const [modules, setModules] = useState<Record<string, { canRead: boolean; canWrite: boolean; canDelete: boolean }>>(
    () => {
      const mods: Record<string, { canRead: boolean; canWrite: boolean; canDelete: boolean }> = {}
      for (const m of ALL_MODULES) {
        const existing = user?.userModules.find((um) => um.module === m)
        mods[m] = existing
          ? { canRead: existing.canRead, canWrite: existing.canWrite, canDelete: existing.canDelete }
          : { canRead: true, canWrite: false, canDelete: false }
      }
      return mods
    }
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (user) {
      // Edit existing — update modules only
      const moduleList = Object.entries(modules).map(([module, perms]) => ({
        module,
        ...perms,
      }))
      const result = await updateUserModules(user.id, moduleList)
      setLoading(false)
      if (result.success) onSaved()
      else setError((result as any).error || 'Update failed')
    } else {
      // Create new
      const formData = new FormData()
      formData.set('name', name)
      formData.set('email', email)
      formData.set('password', password)
      formData.set('role', role)
      formData.set('modules', JSON.stringify(
        Object.entries(modules).map(([module, perms]) => ({ module, ...perms }))
      ))
      const result = await createUser(formData)
      setLoading(false)
      if (result.success) onSaved()
      else setError((result as any).error || 'Creation failed')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>
      )}

      {!user && (
        <>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 bg-dark border border-white/10 rounded-md text-white focus:outline-none focus:border-teal"
            >
              <option value="SUPERADMIN">SUPERADMIN</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="ENGINEER">ENGINEER</option>
              <option value="VIEWER">VIEWER</option>
            </select>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">Module Permissions</label>
        <div className="space-y-2 border border-white/10 rounded-lg p-3">
          {ALL_MODULES.map((mod) => (
            <div key={mod} className="flex items-center gap-4 py-1">
              <span className="w-24 text-sm text-white/80 capitalize">{mod}</span>
              <label className="flex items-center gap-1 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={modules[mod]?.canRead ?? true}
                  onChange={(e) =>
                    setModules((prev) => ({
                      ...prev,
                      [mod]: { ...prev[mod], canRead: e.target.checked },
                    }))
                  }
                  className="rounded border-white/20 bg-dark"
                />
                Read
              </label>
              <label className="flex items-center gap-1 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={modules[mod]?.canWrite ?? false}
                  onChange={(e) =>
                    setModules((prev) => ({
                      ...prev,
                      [mod]: { ...prev[mod], canWrite: e.target.checked },
                    }))
                  }
                  className="rounded border-white/20 bg-dark"
                />
                Write
              </label>
              <label className="flex items-center gap-1 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={modules[mod]?.canDelete ?? false}
                  onChange={(e) =>
                    setModules((prev) => ({
                      ...prev,
                      [mod]: { ...prev[mod], canDelete: e.target.checked },
                    }))
                  }
                  className="rounded border-white/20 bg-dark"
                />
                Delete
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? 'Saving...' : user ? 'Save Changes' : 'Create User'}
        </Button>
      </div>
    </form>
  )
}
