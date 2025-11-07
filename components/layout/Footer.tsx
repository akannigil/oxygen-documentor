'use client'

import Link from 'next/link'

interface FooterProps {
  userEmail?: string | undefined
}

export function Footer({ userEmail }: FooterProps) {
  const currentYear = new Date().getFullYear()

  const footerLinks = [
    {
      title: 'Ressources',
      links: [
        { name: 'Documentation', href: '/docs', external: false },
        { name: 'Guides', href: '/docs', external: false },
        { name: 'API', href: '/api/health', external: false },
      ],
    },
    {
      title: 'Configuration',
      links: [
        { name: 'Projets', href: '/dashboard', external: false },
        { name: 'Profil', href: '/dashboard', external: false },
      ],
    },
    {
      title: 'Support',
      links: [
        { name: 'Aide', href: '/docs', external: false },
        { name: 'Contact', href: 'mailto:support@oxygen-document.com', external: true },
      ],
    },
  ]

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Logo et description */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
                <svg
                  className="h-5 w-5 text-white"
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
              <span className="text-lg font-bold text-gray-900">Oxygen</span>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Génération et gestion d&apos;attestations personnalisées en masse.
            </p>
            {userEmail && (
              <p className="mt-2 text-xs text-gray-500">
                Connecté : <span className="font-medium">{userEmail}</span>
              </p>
            )}
          </div>

          {/* Liens */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
                {section.title}
              </h3>
              <ul className="mt-4 space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-600 transition-colors hover:text-blue-600"
                      >
                        {link.name}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-gray-600 transition-colors hover:text-blue-600"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Séparateur */}
        <div className="mt-8 border-t border-gray-200 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-gray-500">
              © {currentYear} Oxygen Document. Tous droits réservés.
            </p>
            <div className="flex items-center space-x-6">
              <Link
                href="/docs"
                className="text-sm text-gray-500 transition-colors hover:text-gray-900"
              >
                Confidentialité
              </Link>
              <Link
                href="/docs"
                className="text-sm text-gray-500 transition-colors hover:text-gray-900"
              >
                Conditions
              </Link>
              <a
                href="/api/health"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-900"
              >
                <span className="mr-1.5 h-2 w-2 rounded-full bg-green-500"></span>
                Statut
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

