'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { GenerationWorkflow } from '@/components/generation/GenerationWorkflow'
import type { TemplateField } from '@/shared/types'

interface Template {
  id: string
  name: string
  description: string | null
  mimeType?: string
  templateType?: string
  fields: TemplateField[]
  variables?: Array<{ name: string; occurrences: number; context?: string }>
  fileUrl?: string
  width?: number
  height?: number
}

/**
 * Détermine le type de template à partir du templateType ou du MIME type
 */
function getTemplateType(template: Template): string {
  if (template.templateType) {
    return template.templateType
  }
  // Fallback basé sur le MIME type
  if (template.mimeType) {
    if (template.mimeType === 'application/pdf') return 'pdf'
    if (template.mimeType.startsWith('image/')) return 'image'
    if (
      template.mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
      return 'docx'
  }
  return 'pdf' // Par défaut
}

export default function GeneratePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params['id'] as string

  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Pré-sélectionner le template si passé en paramètre URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const templateIdFromUrl = urlParams.get('templateId')
    if (templateIdFromUrl && templates.length > 0) {
      const template = templates.find((t) => t.id === templateIdFromUrl)
      if (template) {
        const type = getTemplateType(template)
        const isDOCX = type === 'docx'
        const isValid = isDOCX
          ? template.variables && template.variables.length > 0
          : template.fields && template.fields.length > 0
        if (isValid) {
          setSelectedTemplateId(templateIdFromUrl)
        }
      }
    }
  }, [templates])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`)
        const data = await res.json()
        if (res.ok) {
          // Récupérer également les URLs des templates
          const templatesData = await Promise.all(
            (data.templates || []).map(
              async (t: {
                id: string
                name: string
                description: string | null
                fields: unknown
                templateType?: string
                variables?: unknown
                width?: number
                height?: number
              }) => {
                try {
                  const templateRes = await fetch(`/api/templates/${t.id}`)
                  if (templateRes.ok) {
                    const templateData = await templateRes.json()
                    // S'assurer que templateType et variables sont bien chargés
                    const loadedTemplate = {
                      id: t.id,
                      name: t.name,
                      description: t.description,
                      mimeType: templateData.mimeType || (t as any).mimeType,
                      templateType: templateData.templateType || (t as any).templateType,
                      fields: Array.isArray(templateData.fields || t.fields)
                        ? templateData.fields || t.fields
                        : [],
                      variables: Array.isArray(templateData.variables || (t as any).variables)
                        ? templateData.variables || (t as any).variables
                        : undefined,
                      fileUrl: templateData.fileUrl,
                      width: templateData.width || t.width,
                      height: templateData.height || t.height,
                    }

                    // Log pour déboguer (à retirer en production)
                    if (loadedTemplate.mimeType?.includes('wordprocessingml')) {
                      console.log('Template DOCX chargé:', {
                        id: loadedTemplate.id,
                        name: loadedTemplate.name,
                        templateType: loadedTemplate.templateType,
                        mimeType: loadedTemplate.mimeType,
                        variablesCount: loadedTemplate.variables?.length || 0,
                        variables: loadedTemplate.variables,
                      })
                    }

                    return loadedTemplate
                  }
                } catch (e) {
                  console.error('Error loading template:', e)
                }
                const fallbackTemplate = {
                  id: t.id,
                  name: t.name,
                  description: t.description,
                  mimeType: (t as any).mimeType,
                  templateType: (t as any).templateType,
                  fields: Array.isArray(t.fields) ? t.fields : [],
                  variables: Array.isArray((t as any).variables) ? (t as any).variables : undefined,
                }

                // Log pour déboguer (à retirer en production)
                if (fallbackTemplate.mimeType?.includes('wordprocessingml')) {
                  console.log('Template DOCX (fallback):', {
                    id: fallbackTemplate.id,
                    name: fallbackTemplate.name,
                    templateType: fallbackTemplate.templateType,
                    mimeType: fallbackTemplate.mimeType,
                    variablesCount: fallbackTemplate.variables?.length || 0,
                    rawData: t,
                  })
                }

                return fallbackTemplate
              }
            )
          )
          setTemplates(templatesData)
        } else {
          setError('Erreur lors du chargement des templates')
        }
      } catch (e) {
        setError('Erreur réseau')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  const handleGenerationComplete = () => {
    // Rediriger vers la page template pour voir la bannière "Envoyer par email"
    if (selectedTemplateId) {
      router.push(`/projects/${projectId}/templates/${selectedTemplateId}?generated=true`)
    } else {
      // Fallback si pas de template sélectionné
      router.push(`/projects/${projectId}/documents`)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">Chargement des templates...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/projects/${projectId}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← Retour au projet
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Génération de documents</h1>
          <p className="mt-2 text-sm text-gray-600">
            Créez vos documents personnalisés en 3 étapes simples
          </p>
        </div>

        {error && <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>}

        {/* Sélection du template */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <label className="block text-base font-semibold text-gray-900">
              Choisissez votre template
            </label>
            {selectedTemplate && (
              <Link
                href={`/projects/${projectId}/templates/${selectedTemplateId}`}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Voir les détails →
              </Link>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplateId(t.id)}
                className={`relative rounded-lg border-2 p-4 text-left transition-all ${
                  selectedTemplateId === t.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                {selectedTemplateId === t.id && (
                  <div className="absolute right-2 top-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600">
                      <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                )}
                <h3 className="font-semibold text-gray-900">{t.name}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {(() => {
                    const type = getTemplateType(t)
                    if (type === 'docx') {
                      const varCount = t.variables?.length || 0
                      return `${varCount} variable${varCount > 1 ? 's' : ''} détectée${varCount > 1 ? 's' : ''}`
                    }
                    const fieldCount = t.fields?.length || 0
                    return `${fieldCount} champ${fieldCount > 1 ? 's' : ''} défini${fieldCount > 1 ? 's' : ''}`
                  })()}
                </p>
                {(() => {
                  const type = getTemplateType(t)
                  if (type === 'docx') {
                    return (
                      (t.variables?.length || 0) === 0 && (
                        <div className="mt-2 text-xs text-yellow-600">
                          ⚠️ Aucune variable détectée
                        </div>
                      )
                    )
                  }
                  return (
                    (t.fields?.length || 0) === 0 && (
                      <div className="mt-2 text-xs text-yellow-600">⚠️ Aucune zone définie</div>
                    )
                  )
                })()}
              </button>
            ))}
          </div>

          {templates.length === 0 && (
            <div className="py-8 text-center">
              <p className="mb-4 text-sm text-gray-600">Aucun template disponible</p>
              <Link
                href={`/projects/${projectId}/templates/new`}
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Créer un template
              </Link>
            </div>
          )}
        </div>

        {/* Workflow de génération */}
        {selectedTemplate &&
          (() => {
            const templateType = getTemplateType(selectedTemplate)
            const isDOCX = templateType === 'docx'
            const hasVariables = selectedTemplate.variables && selectedTemplate.variables.length > 0
            const hasFields = selectedTemplate.fields && selectedTemplate.fields.length > 0

            if (isDOCX ? hasVariables : hasFields) {
              return (
                <GenerationWorkflow
                  template={selectedTemplate}
                  projectId={projectId}
                  onGenerationComplete={handleGenerationComplete}
                />
              )
            }

            return (
              <div className="rounded-lg border-2 border-dashed border-yellow-300 bg-yellow-50 p-8 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Template incomplet</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {isDOCX
                    ? 'Ce template DOCX ne contient pas de variables {{...}}. Ajoutez des variables dans votre document Word.'
                    : 'Ce template n&apos;a pas de zones définies. Définissez d&apos;abord les zones de texte et QR codes.'}
                </p>
                {!isDOCX && (
                  <Link
                    href={`/projects/${projectId}/templates/${selectedTemplateId}/edit`}
                    className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    Définir les zones maintenant
                  </Link>
                )}
              </div>
            )
          })()}
    </div>
  )
}
