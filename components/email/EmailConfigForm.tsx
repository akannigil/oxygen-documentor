'use client'

import { useState, useEffect } from 'react'

interface EmailConfig {
  organizationName?: string
  appName?: string
  contactEmail?: string
}

interface EmailConfigFormProps {
  projectId: string
  initialConfig?: EmailConfig | null | undefined
  onSave?: (config: EmailConfig | null) => void
}

export function EmailConfigForm({ projectId, initialConfig, onSave }: EmailConfigFormProps) {
  const [organizationName, setOrganizationName] = useState('')
  const [appName, setAppName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Charger la configuration initiale
  useEffect(() => {
    if (initialConfig) {
      setOrganizationName(initialConfig.organizationName || '')
      setAppName(initialConfig.appName || '')
      setContactEmail(initialConfig.contactEmail || '')
    }
  }, [initialConfig])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const config: EmailConfig = {
        ...(organizationName.trim() && { organizationName: organizationName.trim() }),
        ...(appName.trim() && { appName: appName.trim() }),
        ...(contactEmail.trim() && { contactEmail: contactEmail.trim() }),
      }

      const res = await fetch(`/api/projects/${projectId}/email-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde')
      }

      const data = await res.json()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      if (onSave) {
        onSave(data.config)
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      setSaveError(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Informations */}
      <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">Configuration système d'email</p>
        <p className="text-blue-700">
          Ces valeurs seront utilisées dans les templates d'email comme variables{' '}
          <code className="rounded bg-blue-100 px-1 py-0.5">{'{{organization_name}}'}</code>,{' '}
          <code className="rounded bg-blue-100 px-1 py-0.5">{'{{app_name}}'}</code> et{' '}
          <code className="rounded bg-blue-100 px-1 py-0.5">{'{{contact_email}}'}</code>.
        </p>
        <p className="text-blue-700 mt-2">
          Si non configuré, les valeurs par défaut des variables d'environnement seront utilisées.
        </p>
      </div>

      {/* Formulaire */}
      <div className="space-y-4">
        <div>
          <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-1">
            Nom de l'organisation
          </label>
          <input
            type="text"
            id="organizationName"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder={process.env['EMAIL_ORGANIZATION_NAME'] || 'Votre Organisation'}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Utilisé dans les templates comme <code>{'{{organization_name}}'}</code>
          </p>
        </div>

        <div>
          <label htmlFor="appName" className="block text-sm font-medium text-gray-700 mb-1">
            Nom de l'application
          </label>
          <input
            type="text"
            id="appName"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder={process.env['EMAIL_APP_NAME'] || 'Oxygen Document'}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Utilisé dans les templates comme <code>{'{{app_name}}'}</code>
          </p>
        </div>

        <div>
          <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">
            Email de contact
          </label>
          <input
            type="email"
            id="contactEmail"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder={process.env['EMAIL_CONTACT'] || process.env['EMAIL_FROM'] || 'contact@example.com'}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Utilisé dans les templates comme <code>{'{{contact_email}}'}</code>
          </p>
        </div>
      </div>

      {/* Messages d'erreur et de succès */}
      {saveError && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{saveError}</div>
      )}
      {saveSuccess && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
          Configuration sauvegardée avec succès
        </div>
      )}

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}

