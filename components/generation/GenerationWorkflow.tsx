'use client'

import { useState, useMemo, useEffect } from 'react'
import type { TemplateField } from '@/shared/types'
import CSVExcelImport from '@/components/data-import/CSVExcelImport'
import { VisualPreview } from './VisualPreview'
import { DocumentPreview } from './DocumentPreview'
import { StorageConfigForm } from '@/components/storage/StorageConfigForm'
import type { StorageConfig } from '@/lib/storage/config'

// ... (Existing imports)

interface GenerationWorkflowProps {
  template: {
    id: string
    name: string
    templateType?: string
    fields?: TemplateField[]
    variables?: Array<{ name: string; occurrences: number; context?: string }>
    fileUrl?: string
    width?: number
    height?: number
  }
  projectId: string
  onGenerationComplete: () => void
}

type Step = 'import' | 'storage' | 'style' | 'confirm' | 'monitoring'

interface JobStatus {
  status: 'queued' | 'active' | 'completed' | 'failed' | 'unknown'
  progress: number
  result: { documentIds?: string[]; errors?: Array<{ row: number; error: string }> } | null
  error?: string
}

export function GenerationWorkflow({
  template,
  projectId,
  onGenerationComplete,
}: GenerationWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('import')
  const [mappedRows, setMappedRows] = useState<Record<string, string | number>[]>([])
  const [error, setError] = useState('')
  const [validationIssues, setValidationIssues] = useState<
    Array<{ row: number; missingKeys: string[] }>
  >([])
  const [validationRequiredKeys, setValidationRequiredKeys] = useState<string[]>([])
  const [validationTotalInvalid, setValidationTotalInvalid] = useState<number>(0)

  const [outputFormat, setOutputFormat] = useState<'docx' | 'pdf'>(
    template.templateType === 'docx' ? 'docx' : 'pdf'
  )
  const [pdfFormat, setPdfFormat] = useState<'A4' | 'A3' | 'Letter' | 'Legal' | 'Tabloid'>('A4')
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [pdfMethod, setPdfMethod] = useState<'libreoffice' | 'puppeteer'>('libreoffice')
  const [customMargins, setCustomMargins] = useState(false)
  const [pdfMargins, setPdfMargins] = useState({
    top: '10mm',
    right: '10mm',
    bottom: '10mm',
    left: '10mm',
  })

  // Styles pour les variables DOCX
  const [variableStyleEnabled, setVariableStyleEnabled] = useState(false)
  const [defaultFontFamily, setDefaultFontFamily] = useState('Arial')
  const [defaultFontSize, setDefaultFontSize] = useState<number>(12)
  const [defaultFontColor, setDefaultFontColor] = useState('#000000')
  const [defaultBold, setDefaultBold] = useState(false)
  const [defaultItalic, setDefaultItalic] = useState(false)
  const [defaultUnderline, setDefaultUnderline] = useState(false)

  const [monitoringJobId, setMonitoringJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [storageConfig, setStorageConfig] = useState<StorageConfig | null>(null)
  const [showDocumentPreview, setShowDocumentPreview] = useState(false)

  const templateFieldKeys = useMemo(() => {
    if (template.templateType === 'docx' && template.variables) {
      return template.variables.map((v) => v.name)
    }
    return template.fields?.map((f) => f.key) || []
  }, [template.fields, template.variables, template.templateType])

  // Charger la configuration de stockage du projet
  useEffect(() => {
    const loadStorageConfig = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/storage-config`)
        if (res.ok) {
          const data = await res.json()
          setStorageConfig(data.config)
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la configuration de stockage:', error)
      }
    }
    loadStorageConfig()
  }, [projectId])

  useEffect(() => {
    if (!monitoringJobId) return

    // Tentative 1: SSE
    let es: EventSource | null = null
    let pollInterval: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/jobs/${monitoringJobId}`)
          if (!res.ok) {
            setError('Impossible de récupérer le statut du job.')
            setMonitoringJobId(null)
            return
          }
          const data = await res.json()
          setJobStatus({
            status: data.state,
            progress: data.progress,
            result: data.returnValue,
            error: data.failedReason,
          })
          if (data.state === 'completed' || data.state === 'failed') {
            setMonitoringJobId(null)
          }
        } catch (e) {
          setError('Erreur réseau lors du suivi du job.')
          setMonitoringJobId(null)
        }
      }, 2000)
    }

    try {
      es = new EventSource(`/api/jobs/${monitoringJobId}/events`)
      es.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data) as {
            state?: string
            progress?: number
            current?: number
            total?: number
            returnValue?: {
              documentIds?: string[]
              errors?: Array<{ row: number; error: string }>
            } | null
            failedReason?: string
          }
          if (!payload || !payload.state) return
          const state = payload.state as JobStatus['status']
          const progress =
            typeof payload.progress === 'number'
              ? payload.progress
              : state === 'completed'
                ? 100
                : 0
          setJobStatus({
            status: state,
            progress,
            result: payload.returnValue ?? null,
            error: payload.failedReason ?? '',
          })
          if (state === 'completed' || state === 'failed') {
            setMonitoringJobId(null)
            es?.close()
          }
        } catch {}
      }
      es.onerror = () => {
        // Fallback au polling si SSE indisponible
        es?.close()
        startPolling()
      }
    } catch {
      startPolling()
    }

    return () => {
      if (es) es.close()
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [monitoringJobId])

  const handleDataMapped = (rows: Record<string, string | number>[]) => {
    setMappedRows(rows)
    if (rows.length > 0) {
      setCurrentStep('storage')
    }
  }

  const handleGenerate = async () => {
    setError('')
    setValidationIssues([])
    setValidationRequiredKeys([])
    setValidationTotalInvalid(0)

    // Pré-validation côté client: vérifier que chaque ligne contient les clés requises
    const requiredKeys = templateFieldKeys
    if (requiredKeys.length > 0) {
      const issues: Array<{ row: number; missingKeys: string[] }> = []
      for (let i = 0; i < mappedRows.length; i++) {
        const row = mappedRows[i] || {}
        const rowKeys = new Set(Object.keys(row))
        const missing = requiredKeys.filter((k) => !rowKeys.has(k))
        if (missing.length > 0) {
          issues.push({ row: i + 1, missingKeys: missing })
          if (issues.length >= 10) break
        }
      }
      if (issues.length > 0) {
        setError('Certaines lignes ne contiennent pas toutes les clés requises par le template')
        setValidationIssues(issues)
        setValidationRequiredKeys(requiredKeys)
        setValidationTotalInvalid(issues.length)
        return // Ne pas lancer l'appel API si erreurs locales
      }
    }

    setCurrentStep('monitoring') // Switch to monitoring view seulement si la pré-validation passe
    setJobStatus({ status: 'queued', progress: 0, result: null }) // Initial status

    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          rows: mappedRows,
          outputFormat: template.templateType === 'docx' ? outputFormat : undefined,
          pdfOptions:
            template.templateType === 'docx' && outputFormat === 'pdf'
              ? {
                  format: pdfFormat,
                  orientation: pdfOrientation,
                  method: pdfMethod,
                  ...(customMargins && { margins: pdfMargins }),
                }
              : undefined,
          styleOptions:
            template.templateType === 'docx' && variableStyleEnabled
              ? {
                  defaultStyle: {
                    fontFamily: defaultFontFamily,
                    fontSize: defaultFontSize,
                    color: defaultFontColor,
                    bold: defaultBold,
                    italic: defaultItalic,
                    underline: defaultUnderline,
                  },
                }
              : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'VALIDATION_ERROR') {
          setValidationIssues(Array.isArray(data.issues) ? data.issues.slice(0, 10) : [])
          setValidationRequiredKeys(Array.isArray(data.requiredKeys) ? data.requiredKeys : [])
          setValidationTotalInvalid(typeof data.totalInvalid === 'number' ? data.totalInvalid : 0)
        }
        setError(data.error || 'Erreur lors du lancement de la génération')
        setJobStatus({ status: 'failed', progress: 0, result: null, error: data.error })
        return
      }

      setMonitoringJobId(data.jobId)
    } catch (e) {
      const errorMessage = 'Erreur réseau lors du lancement de la génération'
      setError(errorMessage)
      setJobStatus({ status: 'failed', progress: 0, result: null, error: errorMessage })
    }
  }

  const isStepComplete = (step: Step) => {
    const stepOrder: Step[] = ['import', 'storage', 'style', 'confirm', 'monitoring']
    return stepOrder.indexOf(currentStep) > stepOrder.indexOf(step)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <StepIndicator
            number={1}
            label="Import"
            isActive={currentStep === 'import'}
            isComplete={isStepComplete('import')}
          />
          <div
            className={`h-0.5 w-12 ${isStepComplete('import') ? 'bg-blue-600' : 'bg-gray-300'}`}
          />
          <StepIndicator
            number={2}
            label="Stockage"
            isActive={currentStep === 'storage'}
            isComplete={isStepComplete('storage')}
          />
          <div
            className={`h-0.5 w-12 ${isStepComplete('storage') ? 'bg-blue-600' : 'bg-gray-300'}`}
          />
          <StepIndicator
            number={3}
            label="Style"
            isActive={currentStep === 'style'}
            isComplete={isStepComplete('style')}
          />
          <div
            className={`h-0.5 w-12 ${isStepComplete('style') ? 'bg-blue-600' : 'bg-gray-300'}`}
          />
          <StepIndicator
            number={4}
            label="Confirmation"
            isActive={currentStep === 'confirm'}
            isComplete={isStepComplete('confirm')}
          />
          <div
            className={`h-0.5 w-12 ${isStepComplete('confirm') ? 'bg-blue-600' : 'bg-gray-300'}`}
          />
          <StepIndicator
            number={5}
            label="Génération"
            isActive={currentStep === 'monitoring'}
            isComplete={jobStatus?.status === 'completed'}
          />
        </div>
      </div>

      {error && !monitoringJobId && (
        <div className="space-y-3 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
          {validationIssues.length > 0 && (
            <div className="text-xs text-red-800">
              <p className="font-semibold">Clés requises:</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {validationRequiredKeys.map((k) => (
                  <span key={k} className="inline-flex items-center rounded bg-red-100 px-2 py-0.5">
                    {k}
                  </span>
                ))}
              </div>
              <p className="mt-2">Exemples d’erreurs (max 10):</p>
              <ul className="mt-1 list-inside list-disc space-y-1">
                {validationIssues.map((iss, idx) => (
                  <li key={idx}>
                    Ligne {iss.row}: manquants → {iss.missingKeys.join(', ')}
                  </li>
                ))}
              </ul>
              {validationTotalInvalid > validationIssues.length && (
                <p className="mt-1">
                  … et {validationTotalInvalid - validationIssues.length} autres lignes invalides.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {currentStep === 'import' && (
        <CSVExcelImport templateFieldKeys={templateFieldKeys} onDataMapped={handleDataMapped} />
      )}

      {currentStep === 'storage' && (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Étape 2 : Configuration du stockage
            </h2>
            <p className="mb-6 text-sm text-gray-600">
              Choisissez où les fichiers générés seront stockés. Par défaut, ils sont stockés
              localement.
            </p>

            <StorageConfigForm
              projectId={projectId}
              initialConfig={storageConfig}
              onSave={(config) => setStorageConfig(config)}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setCurrentStep('import')}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Retour
            </button>
            <button
              onClick={() => setCurrentStep('style')}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {currentStep === 'style' && (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Étape 3 : Personnalisation du style
            </h2>
            <p className="mb-6 text-sm text-gray-600">
              Configurez l'apparence et le format de sortie de vos documents.
            </p>

            {/* Options de configuration du document de sortie */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
                <svg
                  className="h-5 w-5 text-blue-600"
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
                Format de sortie
              </h3>

              {/* Styles pour les variables DOCX */}
              {template.templateType === 'docx' && (
                <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
                  <label className="mb-3 flex items-center">
                    <input
                      type="checkbox"
                      checked={variableStyleEnabled}
                      onChange={(e) => setVariableStyleEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Personnaliser le style des variables
                    </span>
                  </label>

                  {variableStyleEnabled && (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Police
                          </label>
                          <select
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={defaultFontFamily}
                            onChange={(e) => setDefaultFontFamily(e.target.value)}
                          >
                            <optgroup label="Polices système">
                              <option value="Arial">Arial</option>
                              <option value="Times New Roman">Times New Roman</option>
                              <option value="Calibri">Calibri</option>
                              <option value="Cambria">Cambria</option>
                              <option value="Courier New">Courier New</option>
                              <option value="Georgia">Georgia</option>
                              <option value="Verdana">Verdana</option>
                            </optgroup>
                            <optgroup label="Google Fonts (téléchargées automatiquement)">
                              <option value="Roboto">Roboto</option>
                              <option value="Open Sans">Open Sans</option>
                              <option value="Lato">Lato</option>
                              <option value="Montserrat">Montserrat</option>
                              <option value="Roboto Condensed">Roboto Condensed</option>
                              <option value="Source Sans Pro">Source Sans Pro</option>
                              <option value="Raleway">Raleway</option>
                              <option value="Oswald">Oswald</option>
                              <option value="PT Sans">PT Sans</option>
                              <option value="Merriweather">Merriweather</option>
                              <option value="Playfair Display">Playfair Display</option>
                              <option value="Lora">Lora</option>
                              <option value="Noto Sans">Noto Sans</option>
                            </optgroup>
                          </select>
                          <p className="mt-1 text-xs text-gray-500">
                            {[
                              'Roboto',
                              'Open Sans',
                              'Lato',
                              'Montserrat',
                              'Roboto Condensed',
                              'Source Sans Pro',
                              'Raleway',
                              'Oswald',
                              'PT Sans',
                              'Merriweather',
                              'Playfair Display',
                              'Lora',
                              'Noto Sans',
                            ].includes(defaultFontFamily) && (
                              <span className="text-blue-600">
                                ✨ Cette police sera téléchargée et intégrée automatiquement dans le
                                document
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Taille (pt)
                          </label>
                          <input
                            type="number"
                            min="8"
                            max="72"
                            step="1"
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={defaultFontSize}
                            onChange={(e) => setDefaultFontSize(parseInt(e.target.value) || 12)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Couleur
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            className="h-10 w-20 cursor-pointer rounded border border-gray-300"
                            value={defaultFontColor}
                            onChange={(e) => setDefaultFontColor(e.target.value)}
                          />
                          <input
                            type="text"
                            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={defaultFontColor}
                            onChange={(e) => setDefaultFontColor(e.target.value)}
                            placeholder="#000000"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={defaultBold}
                            onChange={(e) => setDefaultBold(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm font-bold text-gray-700">Gras</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={defaultItalic}
                            onChange={(e) => setDefaultItalic(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm italic text-gray-700">Italique</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={defaultUnderline}
                            onChange={(e) => setDefaultUnderline(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 underline">Souligné</span>
                        </label>
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        💡 Ces styles seront appliqués à toutes les variables insérées dans le
                        document DOCX.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Sélecteur de format de sortie pour DOCX */}
              {template.templateType === 'docx' && (
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Format de sortie
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="outputFormat"
                        value="docx"
                        checked={outputFormat === 'docx'}
                        onChange={(e) => setOutputFormat(e.target.value as 'docx')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">DOCX (format original)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="outputFormat"
                        value="pdf"
                        checked={outputFormat === 'pdf'}
                        onChange={(e) => setOutputFormat(e.target.value as 'pdf')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">PDF (conversion)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Options PDF (pour DOCX → PDF ou templates PDF) */}
              {template.templateType === 'docx' && outputFormat === 'pdf' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Format de page
                      </label>
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={pdfFormat}
                        onChange={(e) =>
                          setPdfFormat(
                            e.target.value as 'A4' | 'A3' | 'Letter' | 'Legal' | 'Tabloid'
                          )
                        }
                      >
                        <option value="A4">A4 (210 × 297 mm)</option>
                        <option value="A3">A3 (297 × 420 mm)</option>
                        <option value="Letter">Letter (8.5 × 11 in)</option>
                        <option value="Legal">Legal (8.5 × 14 in)</option>
                        <option value="Tabloid">Tabloid (11 × 17 in)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Orientation
                      </label>
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={pdfOrientation}
                        onChange={(e) =>
                          setPdfOrientation(e.target.value as 'portrait' | 'landscape')
                        }
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Paysage</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Moteur de conversion
                      </label>
                      <select
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={pdfMethod}
                        onChange={(e) =>
                          setPdfMethod(e.target.value as 'libreoffice' | 'puppeteer')
                        }
                      >
                        <option value="libreoffice">LibreOffice (fidèle recommandé)</option>
                        <option value="puppeteer">Puppeteer (fallback)</option>
                      </select>
                    </div>
                  </div>

                  {/* Marges personnalisables */}
                  <div>
                    <label className="mb-2 flex items-center">
                      <input
                        type="checkbox"
                        checked={customMargins}
                        onChange={(e) => setCustomMargins(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        Marges personnalisées
                      </span>
                    </label>
                    {customMargins && (
                      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-xs text-gray-600">Haut</label>
                          <input
                            type="text"
                            value={pdfMargins.top}
                            onChange={(e) => setPdfMargins({ ...pdfMargins, top: e.target.value })}
                            placeholder="10mm"
                            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-600">Droite</label>
                          <input
                            type="text"
                            value={pdfMargins.right}
                            onChange={(e) =>
                              setPdfMargins({ ...pdfMargins, right: e.target.value })
                            }
                            placeholder="10mm"
                            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-600">Bas</label>
                          <input
                            type="text"
                            value={pdfMargins.bottom}
                            onChange={(e) =>
                              setPdfMargins({ ...pdfMargins, bottom: e.target.value })
                            }
                            placeholder="10mm"
                            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-600">Gauche</label>
                          <input
                            type="text"
                            value={pdfMargins.left}
                            onChange={(e) => setPdfMargins({ ...pdfMargins, left: e.target.value })}
                            placeholder="10mm"
                            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                    {customMargins && (
                      <p className="mt-2 text-xs text-gray-500">
                        Format accepté : valeur + unité (ex: 10mm, 0.5in, 20px). Par défaut : 10mm.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Info pour templates PDF/image */}
              {template.templateType !== 'docx' && (
                <div className="rounded-md bg-blue-100 p-3 text-sm text-blue-800">
                  <p className="font-medium">Format de sortie : PDF</p>
                  <p className="mt-1 text-xs">
                    Les documents seront générés au format PDF avec les dimensions du template.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setCurrentStep('storage')}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Retour
            </button>
            <button
              onClick={() => {
                setCurrentStep('confirm')
                setShowDocumentPreview(true)
              }}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {currentStep === 'confirm' && (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Étape 4 : Confirmation et aperçu
            </h2>
            <p className="mb-6 text-sm text-gray-600">
              Vérifiez l'aperçu de votre document et confirmez les paramètres avant génération.
            </p>

            {/* Résumé de la configuration */}
            <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Résumé de la génération</h3>
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div>
                  <span className="text-gray-600">Nombre de documents :</span>
                  <span className="ml-2 font-medium text-gray-900">{mappedRows.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Template :</span>
                  <span className="ml-2 font-medium text-gray-900">{template.name}</span>
                </div>
                {template.templateType === 'docx' && (
                  <>
                    <div>
                      <span className="text-gray-600">Format de sortie :</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {outputFormat.toUpperCase()}
                      </span>
                    </div>
                    {outputFormat === 'pdf' && (
                      <>
                        <div>
                          <span className="text-gray-600">Format de page :</span>
                          <span className="ml-2 font-medium text-gray-900">{pdfFormat}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Orientation :</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {pdfOrientation === 'portrait' ? 'Portrait' : 'Paysage'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Moteur :</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {pdfMethod === 'libreoffice' ? 'LibreOffice' : 'Puppeteer'}
                          </span>
                        </div>
                        {customMargins && (
                          <div className="col-span-2">
                            <span className="text-gray-600">Marges :</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {pdfMargins.top} / {pdfMargins.right} / {pdfMargins.bottom} /{' '}
                              {pdfMargins.left}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
                {storageConfig && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Stockage :</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {storageConfig.type === 'local'
                        ? 'Local'
                        : storageConfig.type === 's3'
                          ? 'Amazon S3'
                          : storageConfig.type === 'ftp'
                            ? 'FTP'
                            : storageConfig.type === 'google-drive'
                              ? 'Google Drive'
                              : 'Configuré'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Aperçu du document */}
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Aperçu du document</h3>
                <button
                  onClick={() => setShowDocumentPreview(!showDocumentPreview)}
                  className={`flex items-center space-x-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    showDocumentPreview
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <span>{showDocumentPreview ? 'Masquer' : 'Afficher'}</span>
                </button>
              </div>

              {showDocumentPreview ? (
                <DocumentPreview
                  templateId={template.id}
                  previewData={mappedRows[0] || {}}
                  outputFormat={outputFormat}
                  pdfOptions={
                    outputFormat === 'pdf' && template.templateType === 'docx'
                      ? {
                          format: pdfFormat,
                          orientation: pdfOrientation,
                          method: pdfMethod,
                          margins: customMargins ? pdfMargins : undefined,
                        }
                      : undefined
                  }
                  styleOptions={
                    variableStyleEnabled && template.templateType === 'docx'
                      ? {
                          defaultFontFamily,
                          defaultFontSize,
                          defaultFontColor,
                          defaultBold,
                          defaultItalic,
                          defaultUnderline,
                        }
                      : undefined
                  }
                  className="mt-4"
                />
              ) : (
                <VisualPreview template={template} previewData={mappedRows[0] || {}} />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setCurrentStep('style')}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Retour
            </button>
            <button
              onClick={handleGenerate}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <svg
                className="-ml-0.5 mr-1.5 inline-block h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Lancer la Génération
            </button>
          </div>
        </div>
      )}

      {currentStep === 'monitoring' && jobStatus && (
        <JobMonitor
          status={jobStatus}
          onComplete={onGenerationComplete}
          totalDocs={mappedRows.length}
        />
      )}
    </div>
  )
}

function JobMonitor({
  status,
  onComplete,
  totalDocs,
}: {
  status: JobStatus
  onComplete: () => void
  totalDocs: number
}) {
  const { status: jobState, progress, result, error } = status

  const getStatusText = () => {
    switch (jobState) {
      case 'queued':
        return "Mise en file d'attente..."
      case 'active':
        return `Génération en cours... (${progress}%)`
      case 'completed':
        return 'Génération terminée !'
      case 'failed':
        return 'La génération a échoué.'
      default:
        return 'En attente...'
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 text-center shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Étape 5 : Génération en cours</h2>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{getStatusText()}</p>
        <div className="h-2.5 w-full rounded-full bg-gray-200">
          <div className="h-2.5 rounded-full bg-blue-600" style={{ width: `${progress}%` }}></div>
        </div>

        {jobState === 'completed' && (
          <div className="rounded-md bg-green-50 p-4 text-green-800">
            <p>
              <strong>Succès :</strong> {result?.documentIds?.length ?? 0} sur {totalDocs} documents
              ont été générés.
            </p>
            {result?.errors && result.errors.length > 0 && (
              <p className="mt-2 text-xs">{result.errors.length} erreurs rencontrées.</p>
            )}
          </div>
        )}

        {jobState === 'failed' && (
          <div className="rounded-md bg-red-50 p-4 text-red-800">
            <p>
              <strong>Erreur :</strong> {error || 'Une erreur inconnue est survenue.'}
            </p>
          </div>
        )}

        {(jobState === 'completed' || jobState === 'failed') && (
          <div className="mt-6">
            <button
              onClick={onComplete}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ... (StepIndicator component remains the same)
interface StepIndicatorProps {
  number: number
  label: string
  isActive: boolean
  isComplete: boolean
}

function StepIndicator({ number, label, isActive, isComplete }: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold ${
          isComplete
            ? 'border-blue-600 bg-blue-600 text-white'
            : isActive
              ? 'border-blue-600 bg-white text-blue-600'
              : 'border-gray-300 bg-white text-gray-400'
        }`}
      >
        {isComplete ? (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          number
        )}
      </div>
      <span className={`mt-2 text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  )
}
