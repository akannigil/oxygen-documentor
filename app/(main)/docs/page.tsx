import Link from 'next/link'

export default function DocsPage() {
  const guides = [
    {
      title: 'Guide de Configuration du Stockage',
      description: 'Configurez votre système de stockage (S3, FTP, Local)',
      href: '/docs/storage',
      icon: '💾',
    },
    {
      title: 'Guide QR Codes',
      description: 'Intégrez des QR codes dans vos documents',
      href: '/docs/qrcodes',
      icon: '📱',
    },
    {
      title: 'Guide Email',
      description: 'Configuration de l\'envoi d\'emails',
      href: '/docs/email',
      icon: '📧',
    },
    {
      title: 'Authentification & Certificats',
      description: 'Sécurisez vos documents avec des certificats',
      href: '/docs/certificates',
      icon: '🔐',
    },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
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
          <h1 className="text-3xl font-bold text-gray-900">Documentation</h1>
          <p className="mt-2 text-sm text-gray-600">
            Guides et ressources pour utiliser Oxygen Document
          </p>
        </div>
      </div>

      {/* Guides */}
      <div className="mb-10">
        <h2 className="mb-6 text-xl font-semibold text-gray-900">Guides disponibles</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="block rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-500 hover:shadow-md"
            >
              <div className="mb-3 text-4xl">{guide.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900">{guide.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{guide.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Ressources rapides */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Ressources rapides</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-900">API Endpoints</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>
                <code className="rounded bg-gray-100 px-2 py-1">/api/health</code> - Statut de
                l&apos;API
              </li>
              <li>
                <code className="rounded bg-gray-100 px-2 py-1">/api/projects</code> - Gestion des
                projets
              </li>
              <li>
                <code className="rounded bg-gray-100 px-2 py-1">/api/templates</code> - Gestion des
                templates
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-900">Formats supportés</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>📄 PDF - Documents PDF personnalisables</li>
              <li>📝 DOCX - Documents Word avec variables</li>
              <li>🖼️ Images - PNG, JPG pour templates visuels</li>
              <li>📊 CSV/Excel - Import de données en masse</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

