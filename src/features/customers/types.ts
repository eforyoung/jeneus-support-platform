export type CustomerInfo = {
  id: string
  name: string
  customerType: string
  address: string | null
  bp: string | null
  niu: string | null
  rc: string | null
  phone: string | null
  email: string | null
  website: string | null
  accountManagerId: string | null
  accountManager?: { name: string } | null
  createdAt: string
  updatedAt: string
  _count?: { contacts: number; contracts: number; sites: number; tickets: number }
}

export type ContactInfo = {
  id: string
  customerId: string
  firstName: string
  lastName: string
  title: string | null
  phone: string | null
  email: string | null
  isPrimary: boolean
}

export type ContractInfo = {
  id: string
  customerId: string
  contractNumber: string
  contractType: string
  status: string
  startDate: string
  endDate: string
  value: number | null
  currency: string
  slaTarget: any
  maintenanceSchedule: any
}

export type SiteInfo = {
  id: string
  customerId: string
  name: string
  address: string | null
  city: string | null
  gpsLat: number | null
  gpsLong: number | null
  siteType: string
}
