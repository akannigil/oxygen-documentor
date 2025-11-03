'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ImprovedTemplateEditor } from '@/components/template-editor/ImprovedTemplateEditor'
import { CoordinateGuide } from '@/components/template-editor/CoordinateGuide'
import type { TemplateField } from '@/shared/types'

interface Template {
  id: string
  name: string
  templateType?: string
  fileUrl?: string
  filePath: string
  width?: number
  height?: number
  fields?: TemplateField[]
  variables?: Array<{ name: string; occurrences: number; context?: string }>
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
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              {fields.length > 0 && (
                <Link
                  href={`/projects/${projectId}/generate?templateId=${templateId}`}
                  className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Générer des documents
                </Link>
              )}
            </div>
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

        {/* Pour les templates DOCX : affichage des variables au lieu de l'éditeur */}
        {template.templateType === 'docx' ? (
          <div className="space-y-6">
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
              <div className="flex items-start">
                <svg className="h-6 w-6 text-blue-600 mt-1 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Template DOCX avec publipostage</h3>
                  <p className="text-sm text-blue-800 mb-4">
                    Pour les templates DOCX, les zones sont définies directement dans votre document Word avec des variables entre accolades <code className="bg-blue-100 px-1 rounded">{'{{nom}}'}</code>.
                    Vous n&apos;avez pas besoin d&apos;éditer les zones ici.
                  </p>
                  <p className="text-sm text-blue-800 font-medium">
                    Si vous souhaitez modifier les variables, éditionnez le fichier Word directement et ré-uploadez-le.
                  </p>
                </div>
              </div>
            </div>

            {/* Variables détectées */}
            {template.variables && template.variables.length > 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  Variables détectées ({template.variables.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {template.variables.map((variable, index) => (
                    <div key={`variable-${index}`} className="rounded-md border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm font-mono font-semibold text-blue-600">
                          {`{{${variable.name}}}`}
                        </code>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {variable.occurrences} occurrence{variable.occurrences > 1 ? 's' : ''}
                        </span>
                      </div>
                      {variable.context && (
                        <p className="text-xs text-gray-600 italic mt-1">
                          Contexte: {variable.context}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <Link
                    href={`/projects/${projectId}/generate?templateId=${templateId}`}
                    className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Générer des documents
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-6">
                <div className="flex items-start">
                  <svg className="h-6 w-6 text-yellow-600 mt-1 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-900 mb-2">Aucune variable détectée</h3>
                    <p className="text-sm text-yellow-800 mb-4">
                      Ce template DOCX ne contient pas de variables <code className="bg-yellow-100 px-1 rounded">{'{{...}}'}</code>.
                    </p>
                    <p className="text-sm text-yellow-800">
                      Pour utiliser le publipostage, ajoutez des variables dans votre document Word (ex: <code className="bg-yellow-100 px-1 rounded">{'{{nom}}'}</code>, <code className="bg-yellow-100 px-1 rounded">{'{{date}}'}</code>), puis ré-uploadez le fichier.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Instructions pour PDF/image */}
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
            <ImprovedTemplateEditor
              templateUrl={fileUrl}
              {...(template.width != null && { templateWidth: template.width })}
              {...(template.height != null && { templateHeight: template.height })}
              fields={fields || []}
              onFieldsChange={handleFieldsChange}
            />

            {/* Guide flottant */}
            <CoordinateGuide />
          </>
        )}
      </div>
    </div>
  )
}

