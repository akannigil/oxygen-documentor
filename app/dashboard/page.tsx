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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header amélioré */}
        <div className="mb-10">
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Bienvenue, <span className="font-semibold text-gray-900">{session.user.name || session.user.email}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Projets</div>
                  <div className="text-2xl font-bold text-blue-600">{projects.length}</div>
                </div>
                <form action="/api/auth/signout" method="POST">
                  <button
                    type="submit"
                    className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    Déconnexion
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Section des projets */}
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun projet pour le moment</h3>
            <p className="text-sm text-gray-600 mb-6">Commencez par créer votre premier projet</p>
            <Link
              href="/projects/new"
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouveau projet
              </Link>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Carte de création de projet */}
              <Link
                href="/projects/new"
                className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-6 text-center transition-all hover:border-blue-500 hover:bg-blue-50 hover:shadow-md group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Nouveau projet
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Créer un nouveau projet
                </div>
              </Link>

              {/* Afficher les projets existants */}
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-12 rounded-xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Connecté en tant que <span className="font-semibold text-gray-900">{session.user.email}</span>
            </div>
            <div className="text-xs text-gray-500">
              Oxygen Document — Gestion d&apos;attestations
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

