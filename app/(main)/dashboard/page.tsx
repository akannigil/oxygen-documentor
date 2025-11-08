import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ProjectCard } from '@/components/projects/ProjectCard'

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          templates: true,
          documents: true,
        },
      },
    },
  })

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
      {/* Header amélioré */}
      <div className="mb-8">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600">
                Bienvenue,{' '}
                <span className="font-semibold text-gray-900">
                  {session.user.name || session.user.email}
                </span>
              </p>
            </div>
            <div className="hidden text-right sm:block">
              <div className="text-xs uppercase tracking-wide text-gray-500">Projets</div>
              <div className="text-2xl font-bold text-blue-600">{projects.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section des projets */}
      {projects.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-blue-200 bg-blue-50">
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
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Aucun projet pour le moment</h3>
          <p className="mb-6 text-sm text-gray-600">Commencez par créer votre premier projet</p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Créer un projet
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Mes projets</h2>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Nouveau projet
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Carte de création de projet */}
            <Link
              href="/projects/new"
              className="group flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 text-center transition-all hover:border-blue-500 hover:bg-blue-50"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <div className="font-semibold text-gray-900 transition-colors group-hover:text-blue-700">
                Nouveau projet
              </div>
              <div className="mt-1 text-xs text-gray-500">Créer un nouveau projet</div>
            </Link>

            {/* Afficher les projets existants */}
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="mt-12 rounded-lg border border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-sm text-gray-600">
            Connecté en tant que{' '}
            <span className="font-semibold text-gray-900">{session.user.email}</span>
          </div>
          <div className="text-xs text-gray-500">Oxygen Document — Gestion d&apos;attestations</div>
        </div>
      </div>
    </div>
  )
}
