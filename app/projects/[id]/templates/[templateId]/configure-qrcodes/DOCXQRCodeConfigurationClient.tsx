'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DOCXQRCodeConfiguration } from '@/components/template-editor/DOCXQRCodeConfiguration'
import type { TemplateVariable, DOCXQRCodeConfig } from '@/shared/types'

interface DOCXQRCodeConfigurationClientProps {
  projectId: string
  templateId: string
  variables: TemplateVariable[]
  initialConfigs: DOCXQRCodeConfig[]
}

export function DOCXQRCodeConfigurationClient({
  projectId,
  templateId,
  variables,
  initialConfigs,
}: DOCXQRCodeConfigurationClientProps) {
  const router = useRouter()
  const [configs, setConfigs] = useState<DOCXQRCodeConfig[]>(initialConfigs)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetch(`/api/projects/${projectId}/templates/${templateId}/qrcode-configs`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrcodeConfigs: configs,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }

      setSuccess(true)
      
      // Rediriger après 1 seconde
      setTimeout(() => {
        router.push(`/projects/${projectId}/templates/${templateId}`)
        router.refresh()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Configuration sauvegardée avec succès !
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Composant de configuration */}
      <div className="rounded-lg bg-white p-6 shadow">
        <DOCXQRCodeConfiguration
          variables={variables}
          qrcodeConfigs={configs}
          onChange={setConfigs}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow">
        <div className="text-sm text-gray-600">
          {configs.length === 0
            ? 'Aucun QR Code configuré'
            : `${configs.length} QR Code${configs.length > 1 ? 's' : ''} configuré${configs.length > 1 ? 's' : ''}`}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/projects/${projectId}/templates/${templateId}`)}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            disabled={saving}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-gray-400"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}

