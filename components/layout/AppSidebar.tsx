'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface AppSidebarProps {
  projectId: string
  projectName?: string | null
}

export function AppSidebar({ projectId, projectName }: AppSidebarProps) {
  const pathname = usePathname()

  const isInWorkspace = pathname?.includes('/projects/') && !pathname?.includes('/settings')
  const isInSettings = pathname?.includes('/settings')

  const workspaceLinks = [
    {
      href: `/projects/${projectId}`,
      label: 'Aperçu',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: `/projects/${projectId}/documents`,
      label: 'Documents',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      href: `/projects/${projectId}/generate`,
      label: 'Générer',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      href: `/projects/${projectId}/templates/new`,
      label: 'Nouveau template',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ]

  const settingsLinks = [
    {
      href: `/projects/${projectId}/settings/storage`,
      label: 'Stockage',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
      ),
    },
    {
      href: `/projects/${projectId}/settings/email`,
      label: 'Email',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ]

  return (
    <aside className="w-64 border-r border-gray-200 bg-white h-[calc(100vh-3rem)] sticky top-12 overflow-y-auto">
      <div className="p-4">
        {/* En-tête projet */}
        <div className="mb-6">
          <div className="mb-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                isInSettings
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              )}
            >
              {isInSettings ? 'Paramètres' : 'Workspace'}
            </span>
          </div>
          <h2 className="text-sm font-bold text-gray-900 truncate" title={projectName || undefined}>
            {projectName || 'Projet'}
          </h2>
        </div>

        {/* Navigation Workspace */}
        {isInWorkspace && (
          <nav className="space-y-1">
            <div className="mb-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Navigation
            </div>
            {workspaceLinks.map((link) => {
              const isActive = pathname === link.href || pathname?.startsWith(link.href + '/')
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  {link.icon}
                  {link.label}
                </Link>
              )
            })}
          </nav>
        )}

        {/* Navigation Settings */}
        {isInSettings && (
          <nav className="space-y-1">
            <div className="mb-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Configuration
            </div>
            {settingsLinks.map((link) => {
              const isActive = pathname === link.href || pathname?.startsWith(link.href + '/')
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  {link.icon}
                  {link.label}
                </Link>
              )
            })}
            <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-600">
                Bientôt : Sécurité, Webhooks, Branding...
              </p>
            </div>
          </nav>
        )}

        {/* Divider + Lien paramètres si dans workspace */}
        {isInWorkspace && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link
              href={`/projects/${projectId}/settings/storage`}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Paramètres
            </Link>
          </div>
        )}

        {/* Divider + Lien workspace si dans settings */}
        {isInSettings && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link
              href={`/projects/${projectId}`}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour au workspace
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}

