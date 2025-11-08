import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
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
    <div>
      <PageHeader
        title={template.name}
        description="Configuration des QR Codes pour le template DOCX"
        badge={{ label: 'Template DOCX', variant: 'blue' }}
        backLink={{
          href: `/projects/${projectId}/templates/${templateId}`,
          label: 'Retour au template',
        }}
      />

      {/* Composant client */}
      <DOCXQRCodeConfigurationClient
        projectId={projectId}
        templateId={templateId}
        variables={variables}
        initialConfigs={qrcodeConfigs}
      />
    </div>
  )
}


