'use client'

import { useState } from 'react'
import type { TemplateField } from '@/shared/types'

interface QRCodeConfigurationProps {
  field: TemplateField
  index: number
  onUpdate: (index: number, updates: Partial<TemplateField>) => void
}

/**
 * Composant pour configurer les options des QR codes
 */
export function QRCodeConfiguration({ field, index, onUpdate }: QRCodeConfigurationProps) {
  const [showOptions, setShowOptions] = useState(!!field.qrcodeOptions)
  const [showAuth, setShowAuth] = useState(field.qrcodeAuth?.enabled ?? false)
  const [showStorageUrl, setShowStorageUrl] = useState(field.qrcodeStorageUrl?.enabled ?? false)

  const updateQRCodeOptions = (updates: Partial<TemplateField['qrcodeOptions']>) => {
    onUpdate(index, {
      qrcodeOptions: {
        ...field.qrcodeOptions,
        ...updates,
      },
    })
  }

  const updateColor = (type: 'dark' | 'light', color: string) => {
    onUpdate(index, {
      qrcodeOptions: {
        ...field.qrcodeOptions,
        color: {
          ...field.qrcodeOptions?.color,
          [type]: color,
        },
      },
    })
  }

  const updateAuth = (updates: Partial<TemplateField['qrcodeAuth']>) => {
    onUpdate(index, {
      qrcodeAuth: {
        ...field.qrcodeAuth,
        enabled: true,
        ...updates,
      },
    })
  }

  const updateStorageUrl = (updates: Partial<TemplateField['qrcodeStorageUrl']>) => {
    onUpdate(index, {
      qrcodeStorageUrl: {
        ...field.qrcodeStorageUrl,
        enabled: true,
        ...updates,
      },
    })
  }

  const updateCertificateFields = (key: string, value: string) => {
    onUpdate(index, {
      qrcodeAuth: {
        ...field.qrcodeAuth,
        enabled: true,
        certificateFields: {
          ...field.qrcodeAuth?.certificateFields,
          [key]: value || undefined,
        },
      },
    })
  }

  return (
    <div className="space-y-4 pt-3 border-t border-gray-200">
      {/* Options de personnalisation */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-gray-700">Personnalisation</label>
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {showOptions ? 'Masquer' : 'Afficher'}
          </button>
        </div>
        
        {showOptions && (
          <div className="space-y-3 pl-2 border-l-2 border-gray-200">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Niveau de correction d'erreur</label>
              <select
                value={field.qrcodeOptions?.errorCorrectionLevel || 'M'}
                onChange={(e) => updateQRCodeOptions({ errorCorrectionLevel: e.target.value as 'L' | 'M' | 'Q' | 'H' })}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs"
              >
                <option value="L">L (7%)</option>
                <option value="M">M (15%) - Recommandé</option>
                <option value="Q">Q (25%)</option>
                <option value="H">H (30%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Marge (modules)</label>
              <input
                type="number"
                value={field.qrcodeOptions?.margin ?? 1}
                onChange={(e) => updateQRCodeOptions({ margin: parseInt(e.target.value) })}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs"
                min={0}
                max={10}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Couleur foncée</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={field.qrcodeOptions?.color?.dark || '#000000'}
                  onChange={(e) => updateColor('dark', e.target.value)}
                  className="h-8 w-12 rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={field.qrcodeOptions?.color?.dark || '#000000'}
                  onChange={(e) => updateColor('dark', e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs"
                  placeholder="#000000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Couleur claire</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={field.qrcodeOptions?.color?.light || '#FFFFFF'}
                  onChange={(e) => updateColor('light', e.target.value)}
                  className="h-8 w-12 rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={field.qrcodeOptions?.color?.light || '#FFFFFF'}
                  onChange={(e) => updateColor('light', e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Authentification de certificat */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showAuth}
              onChange={(e) => {
                setShowAuth(e.target.checked)
                updateAuth({ enabled: e.target.checked })
              }}
              className="rounded border-gray-300 text-blue-600"
            />
            <span className="text-xs font-medium text-gray-700">Authentification de certificat</span>
          </label>
        </div>
        
        {showAuth && (
          <div className="space-y-3 pl-2 border-l-2 border-blue-200 bg-blue-50 p-3 rounded">
            <div>
              <label className="block text-xs text-gray-600 mb-1">URL de vérification de base</label>
              <input
                type="text"
                value={field.qrcodeAuth?.verificationBaseUrl || ''}
                onChange={(e) => updateAuth({ verificationBaseUrl: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs"
                placeholder="https://example.com/verify"
              />
              <p className="mt-1 text-xs text-gray-500">
                URL de base pour la vérification du certificat
              </p>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Durée de validité (secondes)</label>
              <input
                type="number"
                value={field.qrcodeAuth?.expiresIn || ''}
                onChange={(e) => updateAuth({ expiresIn: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs"
                placeholder="Optionnel (ex: 31536000 pour 1 an)"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  checked={field.qrcodeAuth?.includeDocumentHash ?? false}
                  onChange={(e) => updateAuth({ includeDocumentHash: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-xs text-gray-600">Inclure le hash du document pour vérifier l'intégrité</span>
              </label>
            </div>

            <div className="pt-2 border-t border-blue-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Mapping des champs de certificat</p>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">ID du certificat (clé)</label>
                  <input
                    type="text"
                    value={field.qrcodeAuth?.certificateFields?.certificateId || ''}
                    onChange={(e) => updateCertificateFields('certificateId', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                    placeholder="certificate_id"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Nom du titulaire (clé)</label>
                  <input
                    type="text"
                    value={field.qrcodeAuth?.certificateFields?.holderName || ''}
                    onChange={(e) => updateCertificateFields('holderName', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                    placeholder="holder_name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Titre/Formation (clé)</label>
                  <input
                    type="text"
                    value={field.qrcodeAuth?.certificateFields?.title || ''}
                    onChange={(e) => updateCertificateFields('title', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                    placeholder="title"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Date d'émission (clé)</label>
                  <input
                    type="text"
                    value={field.qrcodeAuth?.certificateFields?.issueDate || ''}
                    onChange={(e) => updateCertificateFields('issueDate', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                    placeholder="issue_date"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Organisation émettrice (clé)</label>
                  <input
                    type="text"
                    value={field.qrcodeAuth?.certificateFields?.issuer || ''}
                    onChange={(e) => updateCertificateFields('issuer', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                    placeholder="issuer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* URL de stockage */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showStorageUrl}
              onChange={(e) => {
                setShowStorageUrl(e.target.checked)
                updateStorageUrl({ enabled: e.target.checked })
              }}
              className="rounded border-gray-300 text-blue-600"
            />
            <span className="text-xs font-medium text-gray-700">Intégrer l'URL de stockage</span>
          </label>
        </div>
        
        {showStorageUrl && (
          <div className="space-y-3 pl-2 border-l-2 border-green-200 bg-green-50 p-3 rounded">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Type d'URL</label>
              <select
                value={field.qrcodeStorageUrl?.urlType || 'signed'}
                onChange={(e) => updateStorageUrl({ urlType: e.target.value as 'signed' | 'public' })}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs"
              >
                <option value="signed">URL signée (temporaire, sécurisée)</option>
                <option value="public">URL publique (permanente)</option>
              </select>
            </div>

            {field.qrcodeStorageUrl?.urlType === 'signed' && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">Durée de validité (secondes)</label>
                <input
                  type="number"
                  value={field.qrcodeStorageUrl?.expiresIn || 3600}
                  onChange={(e) => updateStorageUrl({ expiresIn: parseInt(e.target.value) })}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs"
                  min={60}
                  placeholder="3600 (1 heure)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Durée de validité de l'URL signée
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

