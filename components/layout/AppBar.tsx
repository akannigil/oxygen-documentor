'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface AppBarProps {
  userEmail?: string | undefined
  userName?: string | null | undefined
  breadcrumb?: React.ReactNode
}

export function AppBar({ userEmail, userName, breadcrumb }: AppBarProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
      <nav className="mx-auto flex h-12 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo + Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-blue-700 shadow-sm">
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <span className="hidden sm:inline-block text-sm font-semibold text-gray-900">
              Oxygen
            </span>
          </Link>

          {/* Breadcrumb */}
          {breadcrumb && (
            <>
              <svg
                className="h-4 w-4 text-gray-400 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div className="min-w-0 flex-1">{breadcrumb}</div>
            </>
          )}
        </div>

        {/* Actions + User */}
        <div className="flex items-center gap-2">
          {/* Nouveau projet - Desktop uniquement */}
          {pathname === '/dashboard' && (
            <Link
              href="/projects/new"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau projet
            </Link>
          )}

          {/* User menu - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-blue-100 text-xs font-semibold text-blue-700 border border-blue-200">
              {userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden lg:block">
              <div className="text-xs font-medium text-gray-900 leading-tight">
                {userName || 'Utilisateur'}
              </div>
              <div className="text-[10px] text-gray-500 leading-tight">{userEmail}</div>
            </div>
          </div>

          {/* Déconnexion - Desktop */}
          <form action="/api/auth/signout" method="POST" className="hidden md:block">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title="Déconnexion"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="hidden lg:inline">Déconnexion</span>
            </button>
          </form>

          {/* Menu mobile */}
          <button
            type="button"
            className="inline-flex md:hidden items-center justify-center rounded-md p-1.5 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Menu</span>
            {mobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Menu mobile dropdown */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white px-4 py-3 md:hidden shadow-lg">
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-blue-100 text-sm font-semibold text-blue-700 border border-blue-200">
              {userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{userName || 'Utilisateur'}</div>
              <div className="text-xs text-gray-500">{userEmail}</div>
            </div>
          </div>
          {pathname === '/dashboard' && (
            <Link
              href="/projects/new"
              className="block w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 mb-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              + Nouveau projet
            </Link>
          )}
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Déconnexion
            </button>
          </form>
        </div>
      )}
    </header>
  )
}

