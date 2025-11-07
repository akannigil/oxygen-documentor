import Link from 'next/link'
import type { Project } from '@prisma/client'

interface ProjectCardProps {
  project: Project & {
    _count?: {
      templates: number
      documents: number
    }
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-500 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
          {project.description && (
            <p className="mt-2 line-clamp-2 text-sm text-gray-600">{project.description}</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
        <span>
          {project._count?.templates ?? 0} template{project._count?.templates !== 1 ? 's' : ''}
        </span>
        <span>
          {project._count?.documents ?? 0} document{project._count?.documents !== 1 ? 's' : ''}
        </span>
      </div>
    </Link>
  )
}
