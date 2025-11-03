import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { TemplateField } from '@/shared/types'
import { WorkflowSteps } from '@/components/ui/WorkflowSteps'
import { DeleteTemplateButton } from '@/components/templates/DeleteTemplateButton'

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
  const templateType = (template.templateType as string) || 'pdf'
  const variables = template.variables && typeof template.variables === 'object' && Array.isArray(template.variables) 
    ? (template.variables as Array<{ name: string; occurrences: number; context?: string }>)
    : []

  const qrcodeConfigs = (template.qrcodeConfigs as Array<unknown>) || []

  // Définir les étapes du workflow (différent pour DOCX)
  const workflowSteps = templateType === 'docx' 
    ? [
        {
          id: 'upload',
          name: 'Template uploadé',
          description: 'Fichier Word avec variables {{...}}',
          href: `/projects/${projectId}/templates/new`,
          status: 'complete' as const,
        },
        {
          id: 'configure-qrcodes',
          name: 'Configurer les QR Codes',
          description: 'Définir les QR Codes dynamiques (optionnel)',
          href: `/projects/${projectId}/templates/${templateId}/configure-qrcodes`,
          status: variables.length > 0 ? ('current' as const) : ('upcoming' as const),
        },
        {
          id: 'generate',
          name: 'Générer des documents',
          description: 'Importer des données et créer les documents Word',
          href: `/projects/${projectId}/generate?templateId=${templateId}`,
          status: variables.length > 0 ? ('upcoming' as const) : ('upcoming' as const),
        },
      ]
    : [
        {
          id: 'upload',
          name: 'Template uploadé',
          description: 'Fichier PDF ou image importé',
          href: `/projects/${projectId}/templates/new`,
          status: 'complete' as const,
        },
        {
          id: 'zones',
          name: 'Définir les zones',
          description: 'Créer les champs de texte et QR codes',
          href: `/projects/${projectId}/templates/${templateId}/edit`,
          status: fields.length > 0 ? ('complete' as const) : ('current' as const),
        },
        {
          id: 'generate',
          name: 'Générer des documents',
          description: 'Importer des données et créer les PDFs',
          href: `/projects/${projectId}/generate?templateId=${templateId}`,
          status: fields.length > 0 ? ('upcoming' as const) : ('upcoming' as const),
        },
      ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
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
          <div className="flex gap-3">
            {templateType === 'docx' ? (
              <>
                <Link
                  href={`/projects/${projectId}/templates/${templateId}/edit`}
                  className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Voir les variables
                </Link>
                {variables.length > 0 && (
                  <Link
                    href={`/projects/${projectId}/generate?templateId=${templateId}`}
                    className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Générer des documents
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  href={`/projects/${projectId}/templates/${templateId}/edit`}
                  className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Éditer les zones
                </Link>
                {fields.length > 0 && (
                  <Link
                    href={`/projects/${projectId}/generate?templateId=${templateId}`}
                    className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Générer des documents
                  </Link>
                )}
              </>
            )}
            <DeleteTemplateButton templateId={templateId} projectId={projectId} />
          </div>
        </div>

        {/* Workflow Steps */}
        <WorkflowSteps steps={workflowSteps} />

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
                <dt className="text-sm font-medium text-gray-500">
                  {templateType === 'docx' ? 'Variables détectées' : 'Champs définis'}
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {templateType === 'docx' ? variables.length : fields.length}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Créé le</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(template.createdAt).toLocaleDateString('fr-FR')}
                </dd>
              </div>
            </dl>
          </div>

          {/* Zone de travail / Variables DOCX */}
          {templateType === 'docx' ? (
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Variables du template</h2>
              {variables.length > 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Les variables suivantes ont été détectées dans votre document Word :
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {variables.map((variable, index) => (
                      <div key={`variable-${index}`} className="rounded-md border border-gray-200 bg-white p-3">
                        <code className="text-sm font-mono font-semibold text-blue-600">
                          {`{{${variable.name}}}`}
                        </code>
                        <span className="ml-2 text-xs text-gray-500">
                          ({variable.occurrences} occurrence{variable.occurrences > 1 ? 's' : ''})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-yellow-300 bg-yellow-50 p-12 text-center">
                  <p className="text-sm text-yellow-800">
                    Aucune variable détectées. Ajoutez des variables <code className="bg-yellow-100 px-1 rounded">{'{{nom}}'}</code> dans votre document Word.
                  </p>
                </div>
              )}

              {/* QR Codes DOCX */}
              {qrcodeConfigs.length > 0 && (
                <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      QR Codes configurés ({qrcodeConfigs.length})
                    </h2>
                    <Link
                      href={`/projects/${projectId}/templates/${templateId}/configure-qrcodes`}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      Modifier →
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {qrcodeConfigs.map((config: any, index: number) => (
                      <div key={index} className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                        <svg
                          className="h-5 w-5 flex-shrink-0 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                          />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono font-semibold text-gray-900">
                            {config.placeholder}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 truncate">
                            {config.contentPattern}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
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
          )}
        </div>

        {/* Liste des champs / Variables DOCX */}
        {templateType === 'docx' ? (
          variables.length > 0 && (
            <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Variables détectées ({variables.length})</h2>
                <Link
                  href={`/projects/${projectId}/generate?templateId=${templateId}`}
                  className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500"
                >
                  <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Générer des documents
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {variables.map((variable, index) => (
                  <div key={`variable-${index}`} className="rounded-lg border border-gray-200 p-4">
                    <code className="text-sm font-mono font-semibold text-blue-600">
                      {`{{${variable.name}}}`}
                    </code>
                    <div className="mt-2 text-xs text-gray-500">
                      {variable.occurrences} occurrence{variable.occurrences > 1 ? 's' : ''} dans le document
                    </div>
                    {variable.context && (
                      <div className="mt-1 text-xs text-gray-400 italic">
                        Contexte: {variable.context}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          fields.length > 0 && (
            <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Champs définis ({fields.length})</h2>
                <div className="flex gap-2">
                  <Link
                    href={`/projects/${projectId}/templates/${templateId}/edit`}
                    className="inline-flex items-center rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Modifier
                  </Link>
                  <Link
                    href={`/projects/${projectId}/generate?templateId=${templateId}`}
                    className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500"
                  >
                    <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Générer
                  </Link>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {fields.map((field, index) => (
                  <div key={`${field.key}-${index}`} className="rounded-lg border border-gray-200 p-4">
                    <div className="font-medium text-gray-900">{field.key}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      Type: {field.type} | Position: ({Math.round(field.x)}, {Math.round(field.y)})
                    </div>
                    {field.fontSize && (
                      <div className="mt-1 text-xs text-gray-400">Taille: {field.fontSize}px</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* État vide - pas de champs/variables définis */}
        {templateType === 'docx' ? (
          variables.length === 0 && (
            <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Aucune variable détectée</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Votre document Word ne contient pas de variables <code className="bg-gray-100 px-1 rounded">{'{{...}}'}</code>.
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  Pour utiliser le publipostage, ajoutez des variables dans votre document Word (ex: <code className="bg-gray-100 px-1 rounded">{'{{nom}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{date}}'}</code>), puis ré-uploadez le fichier.
                </p>
              </div>
            </div>
          )
        ) : (
          fields.length === 0 && (
            <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Aucune zone définie</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Commencez par définir les zones de texte et QR codes sur votre template.
                </p>
                <Link
                  href={`/projects/${projectId}/templates/${templateId}/edit`}
                  className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Définir les zones
                </Link>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

