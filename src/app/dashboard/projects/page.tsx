import { ProjectList } from '@/features/projects/ProjectList'

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Projects</h2>
      <ProjectList />
    </div>
  )
}
