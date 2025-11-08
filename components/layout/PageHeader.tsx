'use client'

import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  badge?: {
    label: string
    variant?: 'blue' | 'purple' | 'green' | 'yellow' | 'gray'
  }
  actions?: React.ReactNode
  backLink?: {
    href: string
    label: string
  }
  className?: string
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  backLink,
  className,
}: PageHeaderProps) {
  const badgeColors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  }

  return (
    <div className={cn('mb-6', className)}>
      {/* Lien retour */}
      {backLink && (
        <div className="mb-3">
          <a
            href={backLink.href}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {backLink.label}
          </a>
        </div>
      )}

      {/* En-tête avec badge et actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {badge && (
            <div className="mb-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold',
                  badgeColors[badge.variant || 'gray']
                )}
              >
                {badge.label}
              </span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 truncate">{title}</h1>
          {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
        </div>

        {/* Actions */}
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  )
}

