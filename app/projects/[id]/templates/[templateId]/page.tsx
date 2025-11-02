import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { TemplateField } from '@/shared/types'

interface PageProps {
  params: Promise<{ id: string; templateId: string }>
}

export default async function TemplatePage({ params }: PageProps) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const { id: projectId, templateId } = await params

  const template = await prisma.template.findUnique({
    where: { id: templateId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    },
  })

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-red-800">Template non trouvé</p>
          </div>
          <Link
            href={`/projects/${projectId}`}
            className="mt-6 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← Retour au projet
          </Link>
        </div>
      </div>
    )
  }

  if (template.project.ownerId !== session.user.id) {
    redirect('/dashboard')
  }

  const fields = Array.isArray(template.fields) ? (template.fields as unknown as TemplateField[]) : []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href={`/projects/${projectId}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← Retour au projet
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">{template.name}</h1>
          {template.description && (
            <p className="mt-2 text-sm text-gray-600">{template.description}</p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Informations du template */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Informations</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{template.mimeType}</dd>
              </div>
              {template.width && template.height && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Largeur</dt>
                    <dd className="mt-1 text-sm text-gray-900">{template.width}px</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Hauteur</dt>
                    <dd className="mt-1 text-sm text-gray-900">{template.height}px</dd>
                  </div>
                </>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Champs définis</dt>
                <dd className="mt-1 text-sm text-gray-900">{fields.length}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Créé le</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(template.createdAt).toLocaleDateString('fr-FR')}
                </dd>
              </div>
            </dl>
          </div>

          {/* Zone de travail */}
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Éditeur</h2>
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
              <p className="text-sm text-gray-500">
                L&apos;éditeur visuel sera implémenté dans la Phase 3
              </p>
              <Link
                href={`/projects/${projectId}/templates/${templateId}/edit`}
                className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Éditer les zones
              </Link>
            </div>
          </div>
        </div>

        {/* Liste des champs */}
        {fields.length > 0 && (
          <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Champs définis</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {fields.map((field, index) => (
                <div key={`${field.key}-${index}`} className="rounded-lg border border-gray-200 p-4">
                  <div className="font-medium text-gray-900">{field.key}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    Type: {field.type} | Position: ({Math.round(field.x)}, {Math.round(field.y)})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

