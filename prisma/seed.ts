import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 12)

  const superadmin = await prisma.user.upsert({
    where: { email: 'admin@jeneustech.com' },
    update: {},
    create: {
      email: 'admin@jeneustech.com',
      passwordHash,
      name: 'Super Admin',
      role: 'SUPERADMIN',
    },
  })

  await prisma.companySettings.upsert({
    where: { id: (await prisma.companySettings.findFirst())?.id || 'default' },
    update: {},
    create: {
      companyName: 'JENEUS CO. LTD',
      companyAddress: 'Immeuble Commercial Bank, 4th Floor, Rue Njo Njo Bonapriso',
      companyNiu: 'M092217601761D',
      companyRc: 'RC/DLA/2022/B/5078',
      vatRate: 19.25,
    },
  })

  console.log('Seed complete. Superadmin:', superadmin.email)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
