import { FieldJobList } from '@/features/field/FieldJobList'

export default function FieldPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Field Engineer</h2>
      <FieldJobList />
    </div>
  )
}
