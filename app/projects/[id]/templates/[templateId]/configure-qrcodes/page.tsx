import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DOCXQRCodeConfigurationClient } from './DOCXQRCodeConfigurationClient'
import type { TemplateVariable, DOCXQRCodeConfig } from '@/shared/types'

interface PageProps {
  params: Promise<{
    id: string
    templateId: string
  }>
}

export default async function ConfigureQRCodesPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const { id: projectId, templateId } = await params

  // Récupérer le projet et le template
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      templates: {
        where: { id: templateId },
      },
    },
  })

  if (!project || project.ownerId !== session.user.id) {
    notFound()
  }

  const template = project.templates[0]
  if (!template) {
    notFound()
  }

  // Vérifier que c'est bien un template DOCX
  if (template.templateType !== 'docx') {
    redirect(`/projects/${projectId}/templates/${templateId}`)
  }

  // Parser les variables et configurations
  const variables = (template.variables as unknown as TemplateVariable[]) || []
  const qrcodeConfigs = (template.qrcodeConfigs as unknown as DOCXQRCodeConfig[]) || []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="mb-8">
          <div className="mb-4">
            <a
              href={`/projects/${projectId}/templates/${templateId}`}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              ← Retour au template
            </a>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{template.name}</h1>
          <p className="mt-2 text-sm text-gray-600">
            Configuration des QR Codes pour le template DOCX
          </p>
        </div>

        {/* Composant client */}
        <DOCXQRCodeConfigurationClient
          projectId={projectId}
          templateId={templateId}
          variables={variables}
          initialConfigs={qrcodeConfigs}
        />
      </div>
    </div>
  )
}
