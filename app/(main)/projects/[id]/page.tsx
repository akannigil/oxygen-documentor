import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { DeleteProjectButton } from '@/components/projects/DeleteProjectButton'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: PageProps) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      templates: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      _count: {
        select: {
          documents: true,
        },
      },
    },
  })

  if (!project) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-red-800">Projet non trouvé</p>
          </div>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-500"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Retour au dashboard
          </Link>
      </div>
    )
  }

  if (project.ownerId !== session.user.id) {
    redirect('/dashboard')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header amélioré */}
        <div className="mb-10">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <Link
                href="/dashboard"
                className="mb-4 inline-flex items-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Retour au dashboard
              </Link>
            </div>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                {project.description && (
                  <p className="mt-2 text-sm text-gray-600">{project.description}</p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Templates</div>
                  <div className="text-2xl font-bold text-blue-600">{project.templates.length}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Documents</div>
                  <div className="text-2xl font-bold text-blue-600">{project._count.documents}</div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/projects/${project.id}/templates/new`}
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    <svg
                      className="mr-1 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Nouveau template
                  </Link>
                  {project.templates.length > 0 && (
                    <Link
                      href={`/projects/${project.id}/documents`}
                      className="inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                    >
                      <svg
                        className="mr-1 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Voir documents
                    </Link>
                  )}
                  <DeleteProjectButton projectId={project.id} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section des templates */}
        {project.templates.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <svg
                className="h-8 w-8 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Aucun template pour le moment
            </h3>
            <p className="mb-6 text-sm text-gray-600">Commencez par créer votre premier template</p>
            <Link
              href={`/projects/${project.id}/templates/new`}
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Créer un template
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Templates</h2>
              <Link
                href={`/projects/${project.id}/templates/new`}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Nouveau template
              </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Carte de création de template */}
              <Link
                href={`/projects/${project.id}/templates/new`}
                className="group flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-6 text-center transition-all hover:border-blue-500 hover:bg-blue-50 hover:shadow-md"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-200">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <div className="font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
                  Nouveau template
                </div>
                <div className="mt-1 text-xs text-gray-500">Créer un nouveau template</div>
              </Link>

              {/* Liste des templates */}
              {project.templates.map((template) => (
                <Link
                  key={template.id}
                  href={`/projects/${project.id}/templates/${template.id}`}
                  className="block rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-500 hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                  {template.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                      {template.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                    <span>Template</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
    </div>
  )
}
