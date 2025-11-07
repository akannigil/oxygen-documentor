'use client'

import React, { useState } from 'react'
import type { DOCXQRCodeConfig, TemplateVariable } from '@/shared/types'

interface DOCXQRCodeConfigurationProps {
  /**
   * Variables détectées dans le template DOCX
   */
  variables: TemplateVariable[]

  /**
   * Configurations actuelles des QR Codes
   */
  qrcodeConfigs: DOCXQRCodeConfig[]

  /**
   * Callback appelé quand les configurations changent
   */
  onChange: (configs: DOCXQRCodeConfig[]) => void
}

/**
 * Composant pour configurer les QR Codes dans les templates DOCX
 * Permet de marquer des variables comme QR Codes et définir leur contenu dynamique
 */
export function DOCXQRCodeConfiguration({
  variables,
  qrcodeConfigs,
  onChange,
}: DOCXQRCodeConfigurationProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const handleAddQRCode = () => {
    const newConfig: DOCXQRCodeConfig = {
      placeholder: '{{qrcode}}',
      contentPattern: '',
      contentType: 'url',
      options: {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'M',
      },
    }
    onChange([...qrcodeConfigs, newConfig])
    setEditingIndex(qrcodeConfigs.length)
  }

  const handleUpdateConfig = (index: number, updates: Partial<DOCXQRCodeConfig>) => {
    const updated = [...qrcodeConfigs]
    updated[index] = { ...updated[index], ...updates } as DOCXQRCodeConfig
    onChange(updated)
  }

  const handleDeleteConfig = (index: number) => {
    const updated = qrcodeConfigs.filter((_, i) => i !== index)
    onChange(updated)
    setEditingIndex(null)
  }

  const handleUpdateOptions = (index: number, updates: Partial<DOCXQRCodeConfig['options']>) => {
    const updated = [...qrcodeConfigs]
    const currentConfig = updated[index]
    if (currentConfig) {
      updated[index] = {
        ...currentConfig,
        options: {
          ...currentConfig.options,
          ...updates,
        },
      }
    }
    onChange(updated)
  }

  const handleUpdateColor = (index: number, type: 'dark' | 'light', color: string) => {
    const updated = [...qrcodeConfigs]
    const currentConfig = updated[index]
    if (currentConfig) {
      updated[index] = {
        ...currentConfig,
        options: {
          ...currentConfig.options,
          color: {
            ...currentConfig.options?.color,
            [type]: color,
          },
        },
      }
    }
    onChange(updated)
  }

  // Suggestions de patterns basées sur le type de contenu
  const getPatternSuggestions = (contentType?: string) => {
    switch (contentType) {
      case 'url':
        return [
          '{{storage_url}}',
          'https://app.example.com/redirect?file={{storage_url}}',
          'https://verify.example.com/certificate/{{certificateId}}',
          'https://example.com/{{id}}',
          'https://example.com/user/{{userId}}/profile',
        ]
      case 'email':
        return ['mailto:{{email}}', 'mailto:{{email}}?subject={{subject}}']
      case 'phone':
        return ['tel:{{phone}}']
      case 'vcard':
        return [
          'BEGIN:VCARD\nVERSION:3.0\nFN:{{nom}} {{prenom}}\nTEL:{{telephone}}\nEMAIL:{{email}}\nEND:VCARD',
        ]
      default:
        return []
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Configuration des QR Codes</h3>
          <p className="text-sm text-gray-500">
            Définissez quelles variables génèrent des QR Codes et leur contenu dynamique
          </p>
        </div>
        <button
          onClick={handleAddQRCode}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          + Ajouter un QR Code
        </button>
      </div>

      {/* Panneau d'aide / Patterns */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="text-sm text-blue-900">
          <div className="mb-1 font-semibold">Aide - Patterns courants</div>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <span className="font-medium">Variables</span> : utilisez{' '}
              <code className="rounded bg-blue-100 px-1">{'{{variable}}'}</code> (ex:{' '}
              <code className="rounded bg-blue-100 px-1">{'{{id}}'}</code>)
            </li>
            <li>
              <span className="font-medium">URL de stockage du document</span> :{' '}
              <code className="rounded bg-blue-100 px-1">{'{{storage_url}}'}</code>
              <span className="ml-1">(générée au moment de la création du fichier)</span>
            </li>
            <li>
              <span className="font-medium">Exemples</span> :
              <span className="ml-2">
                <code className="rounded bg-blue-100 px-1">{'{{storage_url}}'}</code>
              </span>
              ,
              <span className="ml-2">
                <code className="rounded bg-blue-100 px-1">{`https://verify.example.com/cert/{{certificateId}}`}</code>
              </span>
              ,
              <span className="ml-2">
                <code className="rounded bg-blue-100 px-1">{`https://app.example.com/redirect?file={{storage_url}}`}</code>
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Variables disponibles */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="mb-2 text-sm font-medium text-gray-700">Variables disponibles :</h4>
        <div className="flex flex-wrap gap-2">
          {variables.map((variable) => (
            <span
              key={variable.name}
              className="inline-flex items-center rounded-full bg-white px-3 py-1 font-mono text-xs text-gray-700 shadow-sm"
            >
              {`{{${variable.name}}}`}
              <span className="ml-1 text-gray-400">({variable.occurrences}×)</span>
            </span>
          ))}
        </div>
      </div>

      {/* Liste des configurations */}
      {qrcodeConfigs.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">
            Aucun QR Code configuré. Cliquez sur &quot;Ajouter un QR Code&quot; pour commencer.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {qrcodeConfigs.map((config, index) => (
            <div
              key={index}
              className={`rounded-lg border-2 bg-white p-4 transition-all ${
                editingIndex === index
                  ? 'border-blue-500 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <button
                    onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    className="w-full text-left"
                  >
                    <h4 className="font-mono text-sm font-semibold text-gray-900">
                      {config.placeholder}
                    </h4>
                    <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                      {config.contentPattern || 'Pattern non défini'}
                    </p>
                  </button>
                </div>
                <button
                  onClick={() => handleDeleteConfig(index)}
                  className="ml-4 text-red-600 hover:text-red-500"
                  title="Supprimer"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>

              {editingIndex === index && (
                <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
                  {/* Placeholder */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Placeholder dans le template DOCX
                    </label>
                    <input
                      type="text"
                      value={config.placeholder}
                      onChange={(e) => handleUpdateConfig(index, { placeholder: e.target.value })}
                      placeholder="{{qrcode_verification}}"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Ce texte sera remplacé par le QR Code dans le document Word
                    </p>
                  </div>

                  {/* Type de contenu */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Type de contenu
                    </label>
                    <select
                      value={config.contentType || 'custom'}
                      onChange={(e) => {
                        const value = e.target.value as
                          | 'url'
                          | 'text'
                          | 'vcard'
                          | 'email'
                          | 'phone'
                          | 'custom'
                        handleUpdateConfig(index, { contentType: value })
                      }}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="url">URL</option>
                      <option value="text">Texte</option>
                      <option value="vcard">vCard (Contact)</option>
                      <option value="email">Email</option>
                      <option value="phone">Téléphone</option>
                      <option value="custom">Personnalisé</option>
                    </select>
                  </div>

                  {/* Pattern de contenu */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Pattern du contenu (avec variables)
                    </label>
                    <textarea
                      value={config.contentPattern}
                      onChange={(e) =>
                        handleUpdateConfig(index, { contentPattern: e.target.value })
                      }
                      placeholder="https://verify.example.com/{{id}}/{{code}}"
                      rows={3}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Utilisez {`{{variable}}`} pour insérer des données dynamiques
                    </p>

                    {/* Suggestions */}
                    {getPatternSuggestions(config.contentType).length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-700">Exemples :</p>
                        <div className="mt-1 space-y-1">
                          {getPatternSuggestions(config.contentType).map((suggestion, i) => (
                            <button
                              key={i}
                              onClick={() =>
                                handleUpdateConfig(index, { contentPattern: suggestion })
                              }
                              className="block w-full rounded bg-gray-100 px-2 py-1 text-left font-mono text-xs text-gray-600 hover:bg-gray-200"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Options visuelles */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <h5 className="mb-3 text-xs font-semibold text-gray-700">Options visuelles</h5>

                    <div className="space-y-3">
                      {/* Largeur */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Largeur (pixels)
                        </label>
                        <input
                          type="number"
                          value={config.options?.width || 200}
                          onChange={(e) =>
                            handleUpdateOptions(index, { width: parseInt(e.target.value) })
                          }
                          min={50}
                          max={500}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>

                      {/* Marge */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Marge (modules)
                        </label>
                        <input
                          type="number"
                          value={config.options?.margin ?? 1}
                          onChange={(e) =>
                            handleUpdateOptions(index, { margin: parseInt(e.target.value) })
                          }
                          min={0}
                          max={10}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>

                      {/* Niveau de correction d'erreur */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Niveau de correction d&apos;erreur
                        </label>
                        <select
                          value={config.options?.errorCorrectionLevel || 'M'}
                          onChange={(e) =>
                            handleUpdateOptions(index, {
                              errorCorrectionLevel: e.target.value as 'L' | 'M' | 'Q' | 'H',
                            })
                          }
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="L">L (7% - Plus petit)</option>
                          <option value="M">M (15% - Recommandé)</option>
                          <option value="Q">Q (25% - Haute)</option>
                          <option value="H">H (30% - Très haute)</option>
                        </select>
                      </div>

                      {/* Couleurs */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            Couleur sombre
                          </label>
                          <div className="mt-1 flex gap-2">
                            <input
                              type="color"
                              value={config.options?.color?.dark || '#000000'}
                              onChange={(e) => handleUpdateColor(index, 'dark', e.target.value)}
                              className="h-9 w-16 rounded border border-gray-300"
                            />
                            <input
                              type="text"
                              value={config.options?.color?.dark || '#000000'}
                              onChange={(e) => handleUpdateColor(index, 'dark', e.target.value)}
                              className="flex-1 rounded-md border border-gray-300 px-2 py-1 font-mono text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            Couleur claire
                          </label>
                          <div className="mt-1 flex gap-2">
                            <input
                              type="color"
                              value={config.options?.color?.light || '#FFFFFF'}
                              onChange={(e) => handleUpdateColor(index, 'light', e.target.value)}
                              className="h-9 w-16 rounded border border-gray-300"
                            />
                            <input
                              type="text"
                              value={config.options?.color?.light || '#FFFFFF'}
                              onChange={(e) => handleUpdateColor(index, 'light', e.target.value)}
                              className="flex-1 rounded-md border border-gray-300 px-2 py-1 font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
