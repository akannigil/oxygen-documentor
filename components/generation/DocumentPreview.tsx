'use client'

import { useState, useEffect, useMemo } from 'react'

interface DocumentPreviewProps {
  templateId: string
  previewData: Record<string, string | number | Date>
  outputFormat?: 'docx' | 'pdf'
  pdfOptions?: any
  styleOptions?: any
  className?: string
}

export function DocumentPreview({
  templateId,
  previewData,
  outputFormat = 'pdf',
  pdfOptions,
  styleOptions,
  className = '',
}: DocumentPreviewProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Extraire les dépendances complexes pour la vérification statique
  const previewDataKey = useMemo(() => JSON.stringify(previewData), [previewData])
  const pdfOptionsKey = useMemo(() => JSON.stringify(pdfOptions), [pdfOptions])
  const styleOptionsKey = useMemo(() => JSON.stringify(styleOptions), [styleOptions])

  // Générer la prévisualisation
  const generatePreview = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/templates/${templateId}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: previewData,
          outputFormat,
          pdfOptions,
          styleOptions,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la génération de la prévisualisation')
      }

      // Créer un blob URL pour afficher le document
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      // Révoquer l'ancienne URL si elle existe
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      setPreviewUrl(url)
    } catch (err) {
      console.error('Preview error:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  // Générer automatiquement au chargement et quand les données changent
  useEffect(() => {
    if (previewData && Object.keys(previewData).length > 0) {
      generatePreview()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, outputFormat, previewDataKey, pdfOptionsKey, styleOptionsKey])

  // Cleanup: révoquer l'URL quand le composant est démonté ou quand previewUrl change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleDownload = () => {
    if (previewUrl) {
      const a = document.createElement('a')
      a.href = previewUrl
      a.download = `preview.${outputFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (isLoading) {
    return (
      <div className={`rounded-lg border-2 border-gray-200 bg-white p-8 ${className}`}>
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <p className="text-sm text-gray-600">Génération de la prévisualisation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`rounded-lg border-2 border-red-200 bg-red-50 p-6 ${className}`}>
        <div className="flex items-start space-x-3">
          <svg
            className="h-6 w-6 flex-shrink-0 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-900">Erreur de prévisualisation</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={generatePreview}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!previewUrl) {
    return (
      <div
        className={`rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 ${className}`}
      >
        <div className="flex flex-col items-center justify-center space-y-3 text-center">
          <svg
            className="h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-gray-900">Aucune prévisualisation</p>
            <p className="text-sm text-gray-500">
              Fournissez des données pour générer une prévisualisation
            </p>
          </div>
          <button
            onClick={generatePreview}
            className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Générer la prévisualisation
          </button>
        </div>
      </div>
    )
  }

  const fullscreenContent = (
    <div className="relative h-full w-full bg-gray-900">
      {/* Barre d'outils en haut */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gray-800 px-4 py-2">
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span className="text-sm font-medium text-white">Prévisualisation</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownload}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Télécharger
          </button>
          <button
            onClick={toggleFullscreen}
            className="rounded-md bg-gray-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-600"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Viewer */}
      <iframe src={previewUrl} className="h-full w-full" title="Document Preview" />
    </div>
  )

  if (isFullscreen) {
    return <div className="fixed inset-0 z-50">{fullscreenContent}</div>
  }

  return (
    <div className={`overflow-hidden rounded-lg border-2 border-gray-200 bg-white ${className}`}>
      {/* Barre d'outils */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center space-x-2">
          <svg
            className="h-5 w-5 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span className="text-sm font-medium text-gray-700">Prévisualisation</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={generatePreview}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="Actualiser"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            onClick={handleDownload}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="Télécharger"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
          <button
            onClick={toggleFullscreen}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="Plein écran"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div className="h-[600px] w-full bg-gray-100">
        <iframe src={previewUrl} className="h-full w-full" title="Document Preview" />
      </div>
    </div>
  )
}

