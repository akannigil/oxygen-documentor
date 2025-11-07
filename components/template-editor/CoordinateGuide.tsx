'use client'

import { useState } from 'react'

export function CoordinateGuide() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        title="Guide des coordonnées"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            <div className="relative z-10 w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Guide de positionnement des zones
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-md bg-blue-50 p-4">
                  <h4 className="mb-2 font-semibold text-blue-900">Système de coordonnées</h4>
                  <p className="text-sm text-blue-800">
                    L&apos;origine (0, 0) se trouve en <strong>haut à gauche</strong> de
                    l&apos;image.&apos; Les valeurs X augmentent vers la droite, les valeurs Y
                    augmentent vers le bas.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border border-gray-200 p-4">
                    <h5 className="mb-2 font-medium text-gray-900">Coordonnées (x, y)</h5>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>
                        • <strong>x</strong>: Position horizontale (gauche → droite)
                      </li>
                      <li>
                        • <strong>y</strong>: Position verticale (haut → bas)
                      </li>
                      <li>• Unité: pixels (px)</li>
                    </ul>
                  </div>

                  <div className="rounded-md border border-gray-200 p-4">
                    <h5 className="mb-2 font-medium text-gray-900">Dimensions (w, h)</h5>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>
                        • <strong>w</strong>: Largeur de la zone
                      </li>
                      <li>
                        • <strong>h</strong>: Hauteur de la zone
                      </li>
                      <li>• Unité: pixels (px)</li>
                    </ul>
                  </div>
                </div>

                <div className="rounded-md bg-green-50 p-4">
                  <h4 className="mb-2 font-semibold text-green-900">Conseils de précision</h4>
                  <ul className="space-y-1 text-sm text-green-800">
                    <li>
                      ✓ Activez <strong>&quot;Aimanter à la grille&quot;</strong> pour un alignement
                      précis
                    </li>
                    <li>
                      ✓ Les coordonnées affichées sont les <strong>valeurs réelles</strong> dans le
                      PDF
                    </li>
                    <li>
                      ✓ La grille est espacée de <strong>10 pixels</strong>
                    </li>
                    <li>✓ Utilisez le transformer (poignées) pour redimensionner avec précision</li>
                  </ul>
                </div>

                <div className="rounded-md bg-yellow-50 p-4">
                  <h4 className="mb-2 font-semibold text-yellow-900">Conversion pour le PDF</h4>
                  <p className="text-sm text-yellow-800">
                    Les coordonnées Y sont automatiquement converties lors de la génération du PDF
                    (origine en bas à gauche dans PDF vs origine en haut à gauche dans
                    l&apos;éditeur).
                    <strong className="mt-2 block">
                      Vous n&apos;avez rien à faire, la conversion est automatique !
                    </strong>
                  </p>
                </div>

                <div className="rounded-md border-2 border-gray-300 p-4">
                  <h4 className="mb-3 font-semibold text-gray-900">Exemple visuel</h4>
                  <div className="relative h-48 border-2 border-gray-400 bg-gray-100">
                    {/* Origine */}
                    <div className="absolute left-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      0
                    </div>
                    <div className="absolute left-5 top-1 text-xs font-semibold text-red-600">
                      Origine (0, 0)
                    </div>

                    {/* Exemple de zone */}
                    <div
                      className="absolute border-2 border-blue-600 bg-blue-100/50"
                      style={{ left: '60px', top: '40px', width: '120px', height: '60px' }}
                    >
                      <div className="absolute -left-12 -top-6 text-xs font-semibold text-blue-600">
                        x=60, y=40
                      </div>
                      <div className="absolute bottom-1 right-1 text-xs font-semibold text-blue-600">
                        w=120, h=60
                      </div>
                    </div>

                    {/* Axes */}
                    <div className="absolute bottom-2 left-2 text-xs font-semibold text-gray-600">
                      X →
                    </div>
                    <div className="absolute right-2 top-2 text-xs font-semibold text-gray-600">
                      ↓ Y
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Compris !
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
