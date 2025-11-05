'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { GenerationWorkflow } from '@/components/generation/GenerationWorkflow'
import { DeleteTemplateButton } from './DeleteTemplateButton'
import { DocumentList } from './DocumentList'
import { DOCXQRCodeConfiguration } from '@/components/template-editor/DOCXQRCodeConfiguration'
import type { Template, Project } from '@prisma/client'
import type { TemplateField, DOCXQRCodeConfig, TemplateVariable } from '@/shared/types'


type TemplateWithProject = Template & {
  project: Pick<Project, 'id' | 'name'>
}

interface TemplateWorkflowProps {
  template: TemplateWithProject
}

type ActiveTab = 'config' | 'generate' | 'documents'

export function TemplateWorkflow({ template: initialTemplate }: TemplateWorkflowProps) {
  const [template, setTemplate] = useState(initialTemplate)
  const [activeTab, setActiveTab] = useState<ActiveTab>('config')
  const [refreshCounter, setRefreshCounter] = useState(0)

  const [isEditingQRCodes, setIsEditingQRCodes] = useState(false)
  const [localQrcodeConfigs, setLocalQrcodeConfigs] = useState<DOCXQRCodeConfig[]>((template.qrcodeConfigs as DOCXQRCodeConfig[]) ?? [])
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleGenerationComplete = useCallback(() => {
    setRefreshCounter(prev => prev + 1)
    setActiveTab('documents')
  }, [])

  const handleSaveQRCodes = async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrcodeConfigs: localQrcodeConfigs }),
      })
      if (!res.ok) throw new Error('Impossible de sauvegarder les modifications.')
      const updatedTemplate = await res.json()
      setTemplate(updatedTemplate) // Update local template state
      setIsEditingQRCodes(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEditQRCodes = () => {
    setLocalQrcodeConfigs((template.qrcodeConfigs as DOCXQRCodeConfig[]) ?? [])
    setIsEditingQRCodes(false)
  }

  const tabs = [
    { id: 'config', name: '1. Configuration' },
    { id: 'generate', name: '2. Génération' },
    { id: 'documents', name: '3. Documents & Envoi' },
  ]

  const { templateType, fields, variables } = useMemo(() => ({
    templateType: (template.templateType as string) || 'pdf',
    fields: (Array.isArray(template.fields) ? template.fields : []) as TemplateField[],
    variables: (Array.isArray(template.variables) ? template.variables : []) as TemplateVariable[],
  }), [template])

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
         <Link href={`/projects/${template.projectId}`} className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500">
           <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
           Retour au projet: {template.project.name}
         </Link>
         <div className="mt-4 flex items-start justify-between">
           <div>
             <h1 className="text-3xl font-bold text-gray-900">{template.name}</h1>
             {template.description && <p className="mt-2 text-sm text-gray-600">{template.description}</p>}
           </div>
           <DeleteTemplateButton templateId={template.id} projectId={template.projectId} />
         </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'config' && (
          <div className="space-y-6">
            {isEditingQRCodes ? (
                <div className="rounded-lg bg-white p-6 shadow-lg border-2 border-blue-500">
                    <DOCXQRCodeConfiguration 
                        variables={variables}
                        qrcodeConfigs={localQrcodeConfigs}
                        onChange={setLocalQrcodeConfigs}
                    />
                    <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                        <button onClick={handleCancelEditQRCodes} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Annuler</button>
                        <button onClick={handleSaveQRCodes} disabled={isSaving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
                            {isSaving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                        </button>
                    </div>
                    {saveError && <p className="text-sm text-red-500 mt-2">{saveError}</p>}
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations</h2>
                        <dl className="space-y-3">
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Type</dt>
                                <dd className="mt-1 text-sm text-gray-900">{template.mimeType}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">{templateType === 'docx' ? 'Variables détectées' : 'Champs définis'}</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-800">
                                    {templateType === 'docx' ? variables.length : fields.length}
                                </span>
                                </dd>
                            </div>
                        </dl>
                    </div>
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
                        <div className="flex flex-col gap-3">
                            {templateType === 'docx' && (
                                <button onClick={() => setIsEditingQRCodes(true)} className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                                    Configurer les QR Codes
                                </button>
                            )}
                            <button onClick={() => setActiveTab('generate')} className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500">
                                Passer à la génération →
                            </button>
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}

        {activeTab === 'generate' && (
          <GenerationWorkflow
            projectId={template.projectId}
            template={{
              id: template.id,
              name: template.name,
              fields: (template.fields as any) ?? [],
              variables: (template.variables as any) ?? [],
              templateType: template.templateType,
            }}
            onGenerationComplete={handleGenerationComplete}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentList templateId={template.id} refreshCounter={refreshCounter} />
        )}
      </div>
    </div>
  )
}
