import { LoginForm } from '@/features/auth/LoginForm'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect('/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark px-4">
      <div className="w-full max-w-sm bg-dark-card border border-teal/20 rounded-xl p-8">
        <LoginForm />
      </div>
    </div>
  )
}
