'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth/config'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'

async function requireSuperAdmin() {
  const session = await auth()
  const user = session?.user as any
  if (!user || user.role !== 'SUPERADMIN') throw new Error('Unauthorized')
  return user
}

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Minimum 6 characters'),
  name: z.string().min(1),
  role: z.enum(['SUPERADMIN', 'ADMIN', 'MANAGER', 'ENGINEER', 'VIEWER']),
})

export async function getUsers() {
  await requireSuperAdmin()
  return prisma.user.findMany({
    include: { userModules: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createUser(formData: FormData) {
  await requireSuperAdmin()

  const modulesJson = formData.get('modules') as string
  const modules = modulesJson ? JSON.parse(modulesJson) : []

  const parsed = createUserSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
    role: formData.get('role'),
  })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) return { success: false, error: 'Email already in use' }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name,
      role: parsed.data.role,
      userModules: {
        create: modules.map((m: { module: string; canRead?: boolean; canWrite?: boolean; canDelete?: boolean }) => ({
          module: m.module,
          canRead: m.canRead ?? true,
          canWrite: m.canWrite ?? false,
          canDelete: m.canDelete ?? false,
        })),
      },
    },
  })

  revalidatePath('/dashboard/users')
  return { success: true, data: { id: user.id } }
}

export async function updateUserModules(
  userId: string,
  modules: { module: string; canRead: boolean; canWrite: boolean; canDelete: boolean }[]
) {
  await requireSuperAdmin()
  await prisma.userModule.deleteMany({ where: { userId } })
  if (modules.length > 0) {
    await prisma.userModule.createMany({ data: modules.map((m) => ({ userId, module: m.module as any, canRead: m.canRead, canWrite: m.canWrite, canDelete: m.canDelete })) })
  }
  revalidatePath('/dashboard/users')
  return { success: true }
}

export async function toggleUserActive(userId: string, active: boolean) {
  await requireSuperAdmin()
  await prisma.user.update({ where: { id: userId }, data: { active } })
  revalidatePath('/dashboard/users')
  return { success: true }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  await requireSuperAdmin()
  if (newPassword.length < 6) return { success: false, error: 'Minimum 6 characters' }
  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
  return { success: true }
}
