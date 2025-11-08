'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmailConfigForm } from '@/components/email/EmailConfigForm'

interface EmailConfig {
  organizationName?: string
  appName?: string
  contactEmail?: string
}

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
        description="Configurez les paramètres système d'email pour les templates (nom de l'organisation, nom de l'application, email de contact)"
      />

      {/* Formulaire de configuration */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="px-6 py-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
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
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Comment ça fonctionne ?</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            Les valeurs configurées ici seront utilisées dans les templates d'email comme variables :
          </p>
          <ul className="ml-4 list-disc list-inside space-y-1">
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5">{'{{organization_name}}'}</code> - Nom de
              l'organisation
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5">{'{{app_name}}'}</code> - Nom de
              l'application
            </li>
            <li>
              <code className="rounded bg-gray-100 px-1 py-0.5">{'{{contact_email}}'}</code> - Email de
              contact
            </li>
          </ul>
          <p className="pt-2">
            <strong>Note :</strong> Si ces valeurs ne sont pas configurées, les valeurs par défaut des
            variables d'environnement seront utilisées.
          </p>
        </div>
      </div>
    </div>
  )
}

