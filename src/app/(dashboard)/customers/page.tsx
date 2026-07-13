import { CustomerList } from '@/features/customers/CustomerList'

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Customers</h2>
      <CustomerList />
    </div>
  )
}
