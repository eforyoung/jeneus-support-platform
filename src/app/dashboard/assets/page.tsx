import { AssetList } from '@/features/assets/AssetList'

export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Assets</h2>
      <AssetList />
    </div>
  )
}
