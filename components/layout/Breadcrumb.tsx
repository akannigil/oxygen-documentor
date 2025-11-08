'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) return null

  return (
    <nav className="flex items-center min-w-0" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 min-w-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={index} className="flex items-center gap-2 min-w-0">
              {index > 0 && (
                <svg
                  className="h-4 w-4 text-gray-400 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors truncate"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    'text-sm font-medium truncate',
                    isLast ? 'text-gray-900' : 'text-gray-600'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

