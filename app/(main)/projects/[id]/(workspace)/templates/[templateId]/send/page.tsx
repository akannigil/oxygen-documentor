import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SendCenter } from '@/components/send-center/SendCenter'

interface PageProps {
  params: Promise<{ id: string; templateId: string }>
}

export default async function SendCenterPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id: projectId, templateId } = await params

  const template = await prisma.template.findFirst({
    where: { id: templateId, project: { ownerId: session.user.id } },
    include: { project: { select: { id: true, name: true } } },
  })

  if (!template) {
    redirect(`/projects/${projectId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SendCenter
          templateId={template.id}
          projectId={template.projectId}
          templateName={template.name}
          projectName={template.project.name}
          mailDefaults={(template as any).mailDefaults ?? {}}
        />
      </div>
    </div>
  )
}


