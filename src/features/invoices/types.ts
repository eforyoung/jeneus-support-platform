export type InvoiceFormData = {
  type: 'proforma' | 'final'
  invoiceNumber: string
  customerId: string
  customerName: string
  customerAddress: string
  customerBp: string
  customerNiu: string
  customerRc: string
  applyVat: boolean
  accountOwner: string
  terms: string
  categories: {
    nrc: SubSection[]
    mrc: SubSection[]
    arc: SubSection[]
  }
}

export type SubSection = {
  id: string
  heading: string
  items: InvoiceItemData[]
}

export type InvoiceItemData = {
  id: string
  description: string
  qty: number
  unitPrice: number
  total: number
}

export function createEmptyItem(): InvoiceItemData {
  return { id: crypto.randomUUID(), description: '', qty: 1, unitPrice: 0, total: 0 }
}

export function createEmptySubSection(): SubSection {
  return { id: crypto.randomUUID(), heading: '', items: [createEmptyItem()] }
}

export function computeItemTotal(item: InvoiceItemData): number {
  return (item.qty || 0) * (item.unitPrice || 0)
}

export function computeSubSectionTotal(sub: SubSection): number {
  return sub.items.reduce((sum, item) => sum + computeItemTotal(item), 0)
}

export function computeCategoryTotal(subs: SubSection[]): number {
  return subs.reduce((sum, sub) => sum + computeSubSectionTotal(sub), 0)
}

export function getTodayFormatted(): string {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
