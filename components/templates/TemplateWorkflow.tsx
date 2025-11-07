'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
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

type MailDefaults = {
  subject?: string
  html?: string
  from?: string
  fromName?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  attachmentNamePattern?: string
  columnMapping?: {
    recipient_name?: string // Nom de la colonne CSV pour recipient_name
    recipient_email?: string // Nom de la colonne CSV pour recipient_email
  }
}

export function TemplateWorkflow({ template: initialTemplate }: TemplateWorkflowProps) {
  const [template, setTemplate] = useState(initialTemplate)
  const [activeTab, setActiveTab] = useState<ActiveTab>('config')
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [emailSubjectDefault, setEmailSubjectDefault] = useState<string>('Votre document')
  const [emailHtmlDefault, setEmailHtmlDefault] = useState<string>('')
  const [emailFromDefault, setEmailFromDefault] = useState<string>('')
  const [emailFromNameDefault, setEmailFromNameDefault] = useState<string>('')
  const [emailReplyToDefault, setEmailReplyToDefault] = useState<string>('')
  const [emailCcDefault, setEmailCcDefault] = useState<string>('')
  const [emailBccDefault, setEmailBccDefault] = useState<string>('')
  const [attachmentNamePatternDefault, setAttachmentNamePatternDefault] = useState<string>('')
  const [columnMappingRecipientName, setColumnMappingRecipientName] = useState<string>('')
  const [columnMappingRecipientEmail, setColumnMappingRecipientEmail] = useState<string>('')

  const [isEditingQRCodes, setIsEditingQRCodes] = useState(false)
  const [localQrcodeConfigs, setLocalQrcodeConfigs] = useState<DOCXQRCodeConfig[]>(
    (template.qrcodeConfigs as unknown as DOCXQRCodeConfig[]) ?? []
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSavingMail, setIsSavingMail] = useState(false)
  const [saveMailError, setSaveMailError] = useState<string | null>(null)
  const [saveMailSuccess, setSaveMailSuccess] = useState<boolean>(false)

  const handleGenerationComplete = useCallback(() => {
    setRefreshCounter((prev) => prev + 1)
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
    setLocalQrcodeConfigs((template.qrcodeConfigs as unknown as DOCXQRCodeConfig[]) ?? [])
    setIsEditingQRCodes(false)
  }

  const tabs: Array<{ id: ActiveTab; name: string }> = [
    { id: 'config', name: '1. Configuration' },
    { id: 'generate', name: '2. Génération' },
    { id: 'documents', name: '3. Documents & Envoi' },
  ]

  const { templateType, fields, variables } = useMemo(
    () => ({
      templateType: (template.templateType as string) || 'pdf',
      fields: Array.isArray(template.fields) ? (template.fields as unknown as TemplateField[]) : [],
      variables: Array.isArray(template.variables)
        ? (template.variables as unknown as TemplateVariable[])
        : [],
    }),
    [template]
  )

  // Charger/enregistrer les préférences email locales, puis surcharger par DB si présent
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`templateEmailDefaults:${template.id}`)
      if (raw) {
        const parsed = JSON.parse(raw) as MailDefaults & {
          columnMapping?: { recipient_name?: string; recipient_email?: string }
        }
        if (parsed.subject) setEmailSubjectDefault(parsed.subject)
        if (parsed.html) setEmailHtmlDefault(parsed.html)
        if (parsed.from) setEmailFromDefault(parsed.from)
        if (parsed.fromName) setEmailFromNameDefault(parsed.fromName)
        if (parsed.replyTo) setEmailReplyToDefault(parsed.replyTo)
        if (parsed.cc)
          setEmailCcDefault(
            typeof parsed.cc === 'string'
              ? parsed.cc
              : Array.isArray(parsed.cc)
                ? parsed.cc.join(', ')
                : ''
          )
        if (parsed.bcc)
          setEmailBccDefault(
            typeof parsed.bcc === 'string'
              ? parsed.bcc
              : Array.isArray(parsed.bcc)
                ? parsed.bcc.join(', ')
                : ''
          )
        if (parsed.attachmentNamePattern)
          setAttachmentNamePatternDefault(parsed.attachmentNamePattern)
        if (parsed.columnMapping) {
          if (parsed.columnMapping.recipient_name)
            setColumnMappingRecipientName(parsed.columnMapping.recipient_name)
          if (parsed.columnMapping.recipient_email)
            setColumnMappingRecipientEmail(parsed.columnMapping.recipient_email)
        }
      }
      const serverDefaults = (template as unknown as { mailDefaults?: MailDefaults }).mailDefaults
      if (serverDefaults) {
        if (serverDefaults.subject) setEmailSubjectDefault(serverDefaults.subject)
        if (serverDefaults.html) setEmailHtmlDefault(serverDefaults.html)
        if (serverDefaults.from) setEmailFromDefault(serverDefaults.from)
        if (serverDefaults.fromName) setEmailFromNameDefault(serverDefaults.fromName)
        if (serverDefaults.replyTo) setEmailReplyToDefault(serverDefaults.replyTo)
        if (serverDefaults.cc)
          setEmailCcDefault(
            typeof serverDefaults.cc === 'string'
              ? serverDefaults.cc
              : Array.isArray(serverDefaults.cc)
                ? serverDefaults.cc.join(', ')
                : ''
          )
        if (serverDefaults.bcc)
          setEmailBccDefault(
            typeof serverDefaults.bcc === 'string'
              ? serverDefaults.bcc
              : Array.isArray(serverDefaults.bcc)
                ? serverDefaults.bcc.join(', ')
                : ''
          )
        if (serverDefaults.attachmentNamePattern)
          setAttachmentNamePatternDefault(serverDefaults.attachmentNamePattern)
        if (serverDefaults.columnMapping) {
          if (serverDefaults.columnMapping.recipient_name)
            setColumnMappingRecipientName(serverDefaults.columnMapping.recipient_name)
          if (serverDefaults.columnMapping.recipient_email)
            setColumnMappingRecipientEmail(serverDefaults.columnMapping.recipient_email)
        }
      }
    } catch {}
  }, [template])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `templateEmailDefaults:${template.id}`,
        JSON.stringify({
          subject: emailSubjectDefault,
          html: emailHtmlDefault,
          from: emailFromDefault,
          fromName: emailFromNameDefault,
          replyTo: emailReplyToDefault,
          cc: emailCcDefault || undefined,
          bcc: emailBccDefault || undefined,
          attachmentNamePattern: attachmentNamePatternDefault || undefined,
          columnMapping: {
            recipient_name: columnMappingRecipientName,
            recipient_email: columnMappingRecipientEmail,
          },
        })
      )
    } catch {}
  }, [
    template.id,
    emailSubjectDefault,
    emailHtmlDefault,
    emailFromDefault,
    emailFromNameDefault,
    emailReplyToDefault,
    emailCcDefault,
    emailBccDefault,
    attachmentNamePatternDefault,
    columnMappingRecipientName,
    columnMappingRecipientEmail,
  ])

  const handleSaveMailDefaults = async () => {
    setIsSavingMail(true)
    setSaveMailError(null)
    setSaveMailSuccess(false)
    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mailDefaults: {
            subject: emailSubjectDefault || undefined,
            html: emailHtmlDefault || undefined,
            from: emailFromDefault || undefined,
            fromName: emailFromNameDefault || undefined,
            replyTo: emailReplyToDefault || undefined,
            cc: emailCcDefault
              ? emailCcDefault
                  .split(',')
                  .map((e) => e.trim())
                  .filter((e) => e)
              : undefined,
            bcc: emailBccDefault
              ? emailBccDefault
                  .split(',')
                  .map((e) => e.trim())
                  .filter((e) => e)
              : undefined,
            attachmentNamePattern: attachmentNamePatternDefault || undefined,
            columnMapping: {
              recipient_name: columnMappingRecipientName || undefined,
              recipient_email: columnMappingRecipientEmail || undefined,
            },
          },
        }),
      })
      if (!res.ok) throw new Error('Impossible d’enregistrer la configuration mailing.')
      const updated = await res.json()
      setTemplate(updated)
      setSaveMailSuccess(true)
      try {
        window.localStorage.setItem(
          `templateEmailDefaults:${template.id}`,
          JSON.stringify({
            subject: emailSubjectDefault,
            html: emailHtmlDefault,
            from: emailFromDefault,
            fromName: emailFromNameDefault,
            replyTo: emailReplyToDefault,
            cc: emailCcDefault || undefined,
            bcc: emailBccDefault || undefined,
            attachmentNamePattern: attachmentNamePatternDefault || undefined,
            columnMapping: {
              recipient_name: columnMappingRecipientName,
              recipient_email: columnMappingRecipientEmail,
            },
          })
        )
      } catch {}
    } catch (e) {
      setSaveMailError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setIsSavingMail(false)
      setTimeout(() => setSaveMailSuccess(false), 2000)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/projects/${template.projectId}`}
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Retour au projet: {template.project.name}
        </Link>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{template.name}</h1>
            {template.description && (
              <p className="mt-2 text-sm text-gray-600">{template.description}</p>
            )}
          </div>
          <DeleteTemplateButton templateId={template.id} projectId={template.projectId} />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium`}
            >
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
              <div className="rounded-lg border-2 border-blue-500 bg-white p-6 shadow-lg">
                <DOCXQRCodeConfiguration
                  variables={variables}
                  qrcodeConfigs={localQrcodeConfigs}
                  onChange={setLocalQrcodeConfigs}
                />
                <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                  <button
                    onClick={handleCancelEditQRCodes}
                    className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveQRCodes}
                    disabled={isSaving}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {isSaving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                  </button>
                </div>
                {saveError && <p className="mt-2 text-sm text-red-500">{saveError}</p>}
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-lg bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-gray-900">Informations</h2>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Type</dt>
                      <dd className="mt-1 text-sm text-gray-900">{template.mimeType}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        {templateType === 'docx' ? 'Variables détectées' : 'Champs définis'}
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-800">
                          {templateType === 'docx' ? variables.length : fields.length}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-lg bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-gray-900">Actions</h2>
                  <div className="flex flex-col gap-3">
                    {templateType === 'docx' && (
                      <button
                        onClick={() => setIsEditingQRCodes(true)}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Configurer les QR Codes
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab('generate')}
                      className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                    >
                      Passer à la génération →
                    </button>
                  </div>
                </div>

                {/* Configuration Mailing (facultative) */}
                <div className="rounded-lg bg-white p-6 shadow-sm lg:col-span-2">
                  <h2 className="mb-4 text-lg font-semibold text-gray-900">
                    Mailing — Configuration par défaut
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Objet par défaut
                      </label>
                      <input
                        type="text"
                        value={emailSubjectDefault}
                        onChange={(e) => setEmailSubjectDefault(e.target.value)}
                        placeholder="Ex: Votre document est prêt"
                        className="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nom du fichier joint par défaut (optionnel)
                      </label>
                      <input
                        type="text"
                        value={attachmentNamePatternDefault}
                        onChange={(e) => setAttachmentNamePatternDefault(e.target.value)}
                        placeholder="Ex: {{template_name}}-{{recipient_name}}.pdf"
                        className="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Utilisez des variables comme <code>{'{{recipient_name}}'}</code>,{' '}
                        <code>{'{{created_at}}'}</code>, etc.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Template HTML par défaut (optionnel)
                      </label>
                      <textarea
                        value={emailHtmlDefault}
                        onChange={(e) => setEmailHtmlDefault(e.target.value)}
                        rows={5}
                        placeholder="Ex: <h1>Bonjour {{recipient_name}}</h1><p>Votre document est prêt.</p>"
                        className="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 font-mono text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Variables disponibles: <code>{'{{recipient_name}}'}</code>,{' '}
                        <code>{'{{recipient_email}}'}</code>, <code>{'{{template_name}}'}</code>,{' '}
                        <code>{'{{project_name}}'}</code>, etc.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Nom de l&apos;expéditeur par défaut
                        </label>
                        <input
                          type="text"
                          value={emailFromNameDefault}
                          onChange={(e) => setEmailFromNameDefault(e.target.value)}
                          placeholder="Ex: Support Client"
                          className="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Adresse d&apos;expédition par défaut (From)
                        </label>
                        <input
                          type="email"
                          value={emailFromDefault}
                          onChange={(e) => setEmailFromDefault(e.target.value)}
                          placeholder="ex: no-reply@exemple.com"
                          className="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Adresse de réponse par défaut (Reply-To)
                        </label>
                        <input
                          type="email"
                          value={emailReplyToDefault}
                          onChange={(e) => setEmailReplyToDefault(e.target.value)}
                          placeholder="ex: contact@exemple.com"
                          className="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Copie (CC) - optionnel
                        </label>
                        <input
                          type="text"
                          value={emailCcDefault}
                          onChange={(e) => setEmailCcDefault(e.target.value)}
                          placeholder="ex: archive@exemple.com, autre@exemple.com"
                          className="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Séparez plusieurs emails par des virgules
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Copie cachée (CCI/BCC) - optionnel
                        </label>
                        <input
                          type="text"
                          value={emailBccDefault}
                          onChange={(e) => setEmailBccDefault(e.target.value)}
                          placeholder="ex: archive@exemple.com, autre@exemple.com"
                          className="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Séparez plusieurs emails par des virgules
                        </p>
                      </div>
                    </div>
                    <div className="mb-4 rounded-md bg-blue-50 p-3 text-xs text-blue-900">
                      <p className="mb-2 font-semibold">Variables disponibles:</p>
                      <ul className="list-inside list-disc space-y-1">
                        <li>
                          <code>{'{{recipient_name}}'}</code> — Nom du destinataire
                        </li>
                        <li>
                          <code>{'{{recipient_email}}'}</code> — Email du destinataire
                        </li>
                        <li>
                          <code>{'{{template_name}}'}</code> — Nom du template
                        </li>
                        <li>
                          <code>{'{{project_name}}'}</code> — Nom du projet
                        </li>
                      </ul>
                    </div>
                    <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
                      <h3 className="mb-3 text-sm font-semibold text-yellow-900">
                        Mapping des colonnes CSV vers les variables mailing
                      </h3>
                      <p className="mb-3 text-xs text-yellow-800">
                        Configurez ici le mapping des colonnes de votre fichier CSV/Excel vers les
                        variables mailing. Si vos colonnes CSV ont des noms différents (ex:
                        &quot;email&quot; au lieu de &quot;recipient_email&quot;), indiquez le nom
                        exact de la colonne dans votre fichier CSV / Excel.
                      </p>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Colonne CSV pour{' '}
                            <code className="rounded bg-gray-100 px-1 text-xs">
                              {'{{recipient_name}}'}
                            </code>
                          </label>
                          <input
                            type="text"
                            value={columnMappingRecipientName}
                            onChange={(e) => setColumnMappingRecipientName(e.target.value)}
                            placeholder="Ex: nom, prenom, nom_complet..."
                            className="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Laissez vide si votre colonne s&apos;appelle déjà
                            &quot;recipient_name&quot;
                          </p>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Colonne CSV pour{' '}
                            <code className="rounded bg-gray-100 px-1 text-xs">
                              {'{{recipient_email}}'}
                            </code>
                            <span className="ml-1 text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={columnMappingRecipientEmail}
                            onChange={(e) => setColumnMappingRecipientEmail(e.target.value)}
                            placeholder="Ex: email, mail, courriel..."
                            className="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            <strong>Important:</strong> Entrez le nom exact de la colonne dans votre
                            fichier CSV/Excel (ex: &quot;email&quot;, &quot;mail&quot;,
                            &quot;courriel&quot;).
                            <br />
                            Ne pas mettre{' '}
                            <code className="rounded bg-gray-100 px-1 text-xs">
                              {'{{recipient_email}}'}
                            </code>{' '}
                            ici, mais le nom de votre colonne CSV.
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Laissez vide si votre colonne s&apos;appelle déjà exactement
                            &quot;recipient_email&quot;
                          </p>
                          <p className="mt-1 text-xs text-red-600">
                            * Obligatoire pour l&apos;envoi d&apos;emails
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 rounded-md bg-blue-50 p-2 text-xs text-blue-900">
                        <p className="mb-1 font-semibold">Comment ça fonctionne ?</p>
                        <p>
                          Lors de la génération des documents, le système cherchera automatiquement
                          les colonnes CSV mappées ici pour remplir les variables{' '}
                          <code>recipient_name</code> et <code>recipient_email</code>. Si le mapping
                          n&apos;est pas configuré, il cherchera des colonnes nommées exactement
                          &quot;recipient_name&quot; et &quot;recipient_email&quot;.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Link
                        href={`/projects/${template.projectId}/templates/${template.id}/send`}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Configurer l’envoi en masse →
                      </Link>
                      <span className="text-gray-400">
                        (utilise les valeurs par défaut ci-dessus si non précisé)
                      </span>
                      <button
                        onClick={handleSaveMailDefaults}
                        disabled={isSavingMail}
                        className="ml-auto inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                      >
                        {isSavingMail ? 'Enregistrement...' : 'Enregistrer dans le template'}
                      </button>
                    </div>
                    {saveMailError && <p className="mt-1 text-sm text-red-600">{saveMailError}</p>}
                    {saveMailSuccess && (
                      <p className="mt-1 text-sm text-green-700">Configuration enregistrée</p>
                    )}
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
              fields,
              variables,
              templateType: template.templateType,
            }}
            onGenerationComplete={handleGenerationComplete}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentList
            templateId={template.id}
            refreshCounter={refreshCounter}
            defaultSubject={emailSubjectDefault}
            defaultHtmlTemplate={emailHtmlDefault}
            defaultFromName={emailFromNameDefault}
            defaultFrom={emailFromDefault}
            defaultReplyTo={emailReplyToDefault}
            {...(emailCcDefault
              ? {
                  defaultCc: emailCcDefault
                    .split(',')
                    .map((e) => e.trim())
                    .filter((e) => e),
                }
              : {})}
            {...(emailBccDefault
              ? {
                  defaultBcc: emailBccDefault
                    .split(',')
                    .map((e) => e.trim())
                    .filter((e) => e),
                }
              : {})}
          />
        )}
      </div>
    </div>
  )
}
