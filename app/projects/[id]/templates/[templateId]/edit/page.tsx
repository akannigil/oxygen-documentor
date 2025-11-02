'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { TemplateEditor } from '@/components/template-editor'
import type { TemplateField } from '@/shared/types'

interface Template {
  id: string
  name: string
  fileUrl?: string
  filePath: string
  width?: number
  height?: number
  fields: TemplateField[]
}

export default function EditTemplatePage() {
  const params = useParams()
  const projectId = params['id'] as string
  const templateId = params['templateId'] as string

  const [template, setTemplate] = useState<Template | null>(null)
  const [fields, setFields] = useState<TemplateField[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await fetch(`/api/templates/${templateId}`)
        if (!res.ok) {
          throw new Error('Erreur lors du chargement du template')
        }
        const data = await res.json()
        setTemplate(data)
        setFields(Array.isArray(data.fields) ? data.fields : [])
        setLoading(false)
      } catch (err) {
        setError('Erreur lors du chargement du template')
        setLoading(false)
      }
    }

    fetchTemplate()
  }, [templateId])

  const handleFieldsChange = (newFields: TemplateField[]) => {
    setFields(newFields)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch(`/api/templates/${templateId}/fields`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }

      setMessage('Zones sauvegardées avec succès')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Chargement...</p>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-red-800">Template non trouvé</p>
          </div>
        </div>
      </div>
    )
  }

  // Construire l'URL du fichier
  const fileUrl = template.fileUrl || `/api/uploads/${template.filePath}`

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/projects/${projectId}/templates/${templateId}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← Retour au template
          </Link>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Éditeur de zones</h1>
              <p className="mt-2 text-sm text-gray-600">{template.name}</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">{message}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-blue-900">Instructions</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
            <li>Cliquez et glissez sur l&apos;image pour créer une nouvelle zone</li>
            <li>Cliquez sur une zone existante pour la sélectionner et la modifier</li>
            <li>Utilisez la molette de la souris pour zoomer</li>
            <li>Glissez pour déplacer la zone ou utilisez les poignées pour redimensionner</li>
            <li>Configurez les propriétés de la zone dans le panneau à droite</li>
          </ul>
        </div>

        {/* Éditeur */}
        <TemplateEditor
          templateUrl={fileUrl}
          {...(template.width != null && { templateWidth: template.width })}
          {...(template.height != null && { templateHeight: template.height })}
          fields={fields}
          onFieldsChange={handleFieldsChange}
        />
      </div>
    </div>
  )
}

