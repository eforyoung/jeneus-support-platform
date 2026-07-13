import { TicketList } from '@/features/tickets/TicketList'

export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Tickets</h2>
      <TicketList />
    </div>
  )
}
