import { TicketDetail } from '@/features/tickets/TicketDetail'

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TicketDetail id={id} />
}
