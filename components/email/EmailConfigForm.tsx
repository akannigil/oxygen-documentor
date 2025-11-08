'use client'

import { useState, useEffect } from 'react'
import type { EmailConfig, EmailProviderType } from '@/lib/email/config'

interface EmailConfigFormProps {
  projectId: string
  initialConfig?: EmailConfig | null | undefined
  onSave?: (config: EmailConfig | null) => void
}

export function EmailConfigForm({ projectId, initialConfig, onSave }: EmailConfigFormProps) {
  const [provider, setProvider] = useState<EmailProviderType>(initialConfig?.provider || 'resend')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Test de connexion
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // Informations optionnelles
  const [organizationName, setOrganizationName] = useState('')
  const [appName, setAppName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [from, setFrom] = useState('')
  const [fromName, setFromName] = useState('')
  const [replyTo, setReplyTo] = useState('')

  // Configuration Resend
  const [resendApiKey, setResendApiKey] = useState('')
  const [resendFrom, setResendFrom] = useState('')

  // Configuration SMTP
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpSecure, setSmtpSecure] = useState(false)
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpFrom, setSmtpFrom] = useState('')

  // Charger la configuration initiale
  useEffect(() => {
    if (initialConfig) {
      setProvider(initialConfig.provider || 'resend')
      setOrganizationName(initialConfig.organizationName || '')
      setAppName(initialConfig.appName || '')
      setContactEmail(initialConfig.contactEmail || '')
      setFrom(initialConfig.from || '')
      setFromName(initialConfig.fromName || '')
      setReplyTo(initialConfig.replyTo || '')

      if (initialConfig.provider === 'resend') {
        const cfg = initialConfig as import('@/lib/email/config').ResendEmailConfig
        setResendApiKey(cfg.apiKey || '')
        setResendFrom(cfg.from || '')
      } else if (initialConfig.provider === 'smtp') {
        const cfg = initialConfig as import('@/lib/email/config').SMTPEmailConfig
        setSmtpHost(cfg.host || '')
        setSmtpPort(String(cfg.port || 587))
        setSmtpSecure(cfg.secure || false)
        setSmtpUser(cfg.user || '')
        setSmtpPassword(cfg.password || '')
        setSmtpFrom(cfg.from || '')
      }
    }
  }, [initialConfig])

  const buildConfig = (): EmailConfig | null => {
    const baseConfig = {
      organizationName: organizationName.trim() || undefined,
      appName: appName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      from: from.trim() || undefined,
      fromName: fromName.trim() || undefined,
      replyTo: replyTo.trim() || undefined,
    }

    switch (provider) {
      case 'resend': {
        if (!resendApiKey.trim() || !resendFrom.trim()) {
          throw new Error('La clé API Resend et l\'adresse email from sont requises')
        }
        return {
          provider: 'resend',
          apiKey: resendApiKey.trim(),
          from: resendFrom.trim(),
          ...baseConfig,
        }
      }

      case 'smtp': {
        if (!smtpHost.trim() || !smtpPort.trim() || !smtpUser.trim() || !smtpPassword.trim()) {
          throw new Error('L\'hôte, le port, l\'utilisateur et le mot de passe SMTP sont requis')
        }
        return {
          provider: 'smtp',
          host: smtpHost.trim(),
          port: parseInt(smtpPort, 10),
          secure: smtpSecure,
          user: smtpUser.trim(),
          password: smtpPassword.trim(),
          ...(smtpFrom.trim() ? { from: smtpFrom.trim() } : {}),
          ...baseConfig,
        }
      }

      default:
        return null
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      const config = buildConfig()

      const response = await fetch(`/api/projects/${projectId}/email-config/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })

      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Erreur lors du test de connexion : ' + (error instanceof Error ? error.message : 'Erreur inconnue'),
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const config = buildConfig()

      const response = await fetch(`/api/projects/${projectId}/email-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la sauvegarde')
      }

      const data = await response.json()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      if (onSave) {
        onSave(data.config)
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
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
          Configuration de l'envoi d'emails
        </h3>

        {/* Sélection du provider */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Provider email
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as EmailProviderType)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="resend">Resend (recommandé)</option>
            <option value="smtp">SMTP (Nodemailer)</option>
          </select>
        </div>

        {/* Configuration Resend */}
        {provider === 'resend' && (
          <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clé API Resend <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                placeholder="re_xxxxxxxxxxxxx"
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Obtenez votre clé API sur{' '}
                <a
                  href="https://resend.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  resend.com/api-keys
                </a>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email expéditeur <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={resendFrom}
                onChange={(e) => setResendFrom(e.target.value)}
                placeholder="noreply@votredomaine.com"
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                L&apos;adresse email doit être vérifiée dans votre compte Resend
              </p>
            </div>
          </div>
        )}

        {/* Configuration SMTP */}
        {provider === 'smtp' && (
          <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hôte SMTP <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                  required
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="smtp-secure"
                    checked={smtpSecure}
                    onChange={(e) => setSmtpSecure(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="smtp-secure" className="ml-2 block text-sm text-gray-700">
                    SSL/TLS (port 465)
                  </label>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utilisateur <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="votre-email@gmail.com"
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder="votre-mot-de-passe"
                required
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Pour Gmail, utilisez un{' '}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  mot de passe d&apos;application
                </a>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email expéditeur (optionnel)
              </label>
              <input
                type="email"
                value={smtpFrom}
                onChange={(e) => setSmtpFrom(e.target.value)}
                placeholder="noreply@example.com"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Informations optionnelles */}
        <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Informations optionnelles</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l&apos;organisation
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Votre Organisation"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Utilisé dans les templates comme <code>{'{{organization_name}}'}</code>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l&apos;application
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Oxygen Document"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Utilisé dans les templates comme <code>{'{{app_name}}'}</code>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email de contact
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@example.com"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Utilisé dans les templates comme <code>{'{{contact_email}}'}</code>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email expéditeur par défaut
              </label>
              <input
                type="email"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="noreply@example.com"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l&apos;expéditeur
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Oxygen Document"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email de réponse (Reply-To)
              </label>
              <input
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder="contact@example.com"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Résultat du test de connexion */}
        {testResult && (
          <div
            className={`rounded-md p-4 ${
              testResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <svg
                className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  testResult.success ? 'text-green-600' : 'text-red-600'
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {testResult.success ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                )}
              </svg>
              <div className="flex-1">
                <h4
                  className={`text-sm font-medium ${
                    testResult.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {testResult.success ? 'Test réussi !' : 'Échec du test'}
                </h4>
                <p
                  className={`mt-1 text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'}`}
                >
                  {testResult.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages d'erreur et de succès */}
        {saveError && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{saveError}</p>
          </div>
        )}

        {saveSuccess && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">Configuration sauvegardée avec succès !</p>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || isSaving}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isTesting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
                Test en cours...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Tester la connexion
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isTesting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
          </button>
        </div>
      </div>
    </div>
  )
}

