'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmailConfigForm } from '@/components/email/EmailConfigForm'
import type { EmailConfig } from '@/lib/email/config'

export default function ProjectEmailSettingsPage() {
  const params = useParams()
  const projectId = params['id'] as string

  const [config, setConfig] = useState<EmailConfig | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const configResponse = await fetch(`/api/projects/${projectId}/email-config`)
        if (configResponse.ok) {
          const configData = await configResponse.json()
          setConfig(configData.config)
        }
      } catch (error) {
        console.error('Erreur lors du chargement:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [projectId])

  return (
    <div>
      <PageHeader
        title="Configuration Email"
        description="Configurez le provider email (Resend ou SMTP) et les paramètres d'envoi pour ce projet"
        badge={{ label: 'Paramètres', variant: 'purple' }}
      />

      {/* Section informative */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900">À propos de la configuration email</h3>
            <div className="mt-2 text-sm text-blue-800 space-y-2">
              <p>
                <strong>Configuration par projet :</strong> Chaque projet peut avoir sa propre configuration
                email (provider, identifiants, etc.). Si aucune configuration n&apos;est définie, l&apos;envoi
                d&apos;emails sera désactivé pour ce projet.
              </p>
              <p>
                <strong>Provider Resend :</strong> Recommandé pour la production. Nécessite une clé API Resend
                et un domaine vérifié.
              </p>
              <p>
                <strong>Provider SMTP :</strong> Compatible avec Gmail, Outlook, et tout serveur SMTP
                personnalisé.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire de configuration */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="px-6 py-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <EmailConfigForm
              projectId={projectId}
              initialConfig={config}
              onSave={(newConfig) => setConfig(newConfig)}
            />
          )}
        </div>
      </div>

      {/* Section aide supplémentaire */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Besoin d&apos;aide ?</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>Où trouver mes identifiants ?</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              Resend :{' '}
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                resend.com/api-keys
              </a>
            </li>
            <li>Gmail : Activez l&apos;authentification à deux facteurs et générez un mot de passe d&apos;application</li>
            <li>SMTP personnalisé : Contactez votre administrateur système</li>
          </ul>
          <p className="pt-2">
            <strong>Sécurité :</strong> Les identifiants sont stockés de manière sécurisée dans la base de
            données et ne sont jamais exposés côté client.
          </p>
        </div>
      </div>
    </div>
  )
}

