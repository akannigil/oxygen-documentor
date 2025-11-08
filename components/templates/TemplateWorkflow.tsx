'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { DeleteTemplateButton } from './DeleteTemplateButton'
import { DOCXQRCodeConfiguration } from '@/components/template-editor/DOCXQRCodeConfiguration'
import type { Template, Project } from '@prisma/client'
import type { TemplateField, DOCXQRCodeConfig, TemplateVariable } from '@/shared/types'

type TemplateWithProject = Template & {
  project: Pick<Project, 'id' | 'name'>
}

interface TemplateWorkflowProps {
  template: TemplateWithProject
}

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
      <div className="mb-8">
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
              <p className="mt-2 text-sm text-gray-700">{template.description}</p>
            )}
          </div>
          <DeleteTemplateButton templateId={template.id} projectId={template.projectId} />
        </div>
      </div>

      {/* Actions rapides */}
      <div className="mb-8 flex gap-3">
        <Link
          href={`/projects/${template.projectId}/generate?templateId=${template.id}`}
          className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          <svg
            className="-ml-0.5 mr-1.5 h-5 w-5"
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
          Générer des documents
        </Link>
        <Link
          href={`/projects/${template.projectId}/documents`}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg
            className="-ml-0.5 mr-1.5 h-5 w-5"
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
          Voir les documents
        </Link>
      </div>

      {/* Contenu de configuration */}
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
            {/* Informations du template */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Informations
              </h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-600">Type de template</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">{template.mimeType}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">
                    {templateType === 'docx' ? 'Variables détectées' : 'Champs définis'}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-semibold text-blue-800">
                      {templateType === 'docx' ? variables.length : fields.length}
                    </span>
                  </dd>
                </div>
                {templateType === 'docx' && variables.length > 0 && (
                  <div>
                    <dt className="text-sm font-medium text-gray-600">Variables disponibles</dt>
                    <dd className="mt-2 flex flex-wrap gap-1">
                      {variables.slice(0, 5).map((v) => (
                        <span
                          key={v.name}
                          className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700"
                        >
                          {`{{${v.name}}}`}
                        </span>
                      ))}
                      {variables.length > 5 && (
                        <span className="inline-flex items-center text-xs text-gray-500">
                          +{variables.length - 5} autres
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Configuration QR Codes */}
            {templateType === 'docx' && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
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
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                    />
                  </svg>
                  QR Codes
                </h2>
                <p className="mb-4 text-sm text-gray-600">
                  Configurez les QR codes à générer automatiquement dans vos documents.
                </p>
                <button
                  onClick={() => setIsEditingQRCodes(true)}
                  className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg
                    className="-ml-0.5 mr-1.5 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Configurer les QR Codes
                  {localQrcodeConfigs.length > 0 && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      {localQrcodeConfigs.length}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Configuration Mailing */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Configuration email par défaut
              </h2>
              <p className="mb-6 text-sm text-gray-600">
                Ces paramètres seront utilisés par défaut lors de l'envoi des documents par email.
              </p>
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
                    className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                    className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                    className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 font-mono text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                      className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                      className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                      className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                      className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                      className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                    &quot;email&quot; au lieu de &quot;recipient_email&quot;), indiquez le nom exact
                    de la colonne dans votre fichier CSV / Excel.
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
                        className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Laissez vide si votre colonne s&apos;appelle déjà &quot;recipient_name&quot;
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
                        className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                      Lors de la génération des documents, le système cherchera automatiquement les
                      colonnes CSV mappées ici pour remplir les variables{' '}
                      <code>recipient_name</code> et <code>recipient_email</code>. Si le mapping
                      n&apos;est pas configuré, il cherchera des colonnes nommées exactement
                      &quot;recipient_name&quot; et &quot;recipient_email&quot;.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 border-t pt-4">
                  <button
                    onClick={handleSaveMailDefaults}
                    disabled={isSavingMail}
                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isSavingMail ? (
                      <>
                        <svg
                          className="-ml-0.5 mr-1.5 h-4 w-4 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <svg
                          className="-ml-0.5 mr-1.5 h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Enregistrer la configuration
                      </>
                    )}
                  </button>
                </div>
                {saveMailError && (
                  <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
                    {saveMailError}
                  </div>
                )}
                {saveMailSuccess && (
                  <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-800">
                    ✓ Configuration enregistrée avec succès
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
