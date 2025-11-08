import { prisma } from '@/lib/prisma'
import { AppSidebar } from '@/components/layout/AppSidebar'

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const projectId = params.id
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  })

  return (
    <div className="flex min-h-[calc(100vh-3rem)] bg-gray-50">
      <AppSidebar projectId={projectId} projectName={project?.name ?? null} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">{children}</div>
      </main>
    </div>
  )
}


