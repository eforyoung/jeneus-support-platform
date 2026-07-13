'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/lib/ui'
import { loginAction } from './actions'

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await loginAction(formData)
    setLoading(false)
    if (result.success) {
      router.push('/dashboard/dashboards')
      router.refresh()
    } else {
      setError(result.error || 'An error occurred')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold font-display text-white">JENEUS CO. LTD</h1>
        <p className="text-white/50 mt-1">Support Platform</p>
      </div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          className="w-full px-4 py-3 bg-dark border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/30 placeholder:text-white/30"
          placeholder="you@jeneustech.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full px-4 py-3 bg-dark border border-white/10 rounded-lg text-white focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/30"
        />
      </div>
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  )
}
