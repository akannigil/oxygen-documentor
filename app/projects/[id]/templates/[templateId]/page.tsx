import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { TemplateWorkflow } from '@/components/templates/TemplateWorkflow'

interface PageProps {
  params: Promise<{ id: string; templateId: string }>
}

export default async function TemplatePage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id: projectId, templateId } = await params

  const template = await prisma.template.findUnique({
    where: { id: templateId, project: { ownerId: session.user.id } },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!template) {
    return (
      <div className="p-8">
        <p>Template non trouvé ou accès non autorisé.</p>
        <Link href={`/projects/${projectId}`} className="text-blue-600 hover:underline">
          Retour au projet
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <TemplateWorkflow template={template} />
      </div>
    </div>
  )
}


