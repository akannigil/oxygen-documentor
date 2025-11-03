'use client';

import { useState, useMemo } from 'react';
import type { TemplateField } from '@/shared/types';
import CSVExcelImport from '@/components/data-import/CSVExcelImport';
import { VisualPreview } from './VisualPreview';

interface GenerationWorkflowProps {
  template: {
    id: string;
    name: string;
    templateType?: string;
    fields?: TemplateField[];
    variables?: Array<{ name: string; occurrences: number; context?: string }>;
    fileUrl?: string;
    width?: number;
    height?: number;
  };
  projectId: string;
  onGenerationComplete: () => void;
}

type Step = 'import' | 'preview' | 'confirm';

export function GenerationWorkflow({ template, projectId, onGenerationComplete }: GenerationWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('import');
  const [mappedRows, setMappedRows] = useState<Record<string, string | number>[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  // Format de sortie : 'docx' ou 'pdf' (pour templates DOCX uniquement)
  const [outputFormat, setOutputFormat] = useState<'docx' | 'pdf'>(
    template.templateType === 'docx' ? 'docx' : 'pdf'
  );
  
  // Options PDF (uniquement si template DOCX et format PDF)
  const [pdfFormat, setPdfFormat] = useState<'A4' | 'A3' | 'Letter' | 'Legal' | 'Tabloid'>('A4');
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Pour DOCX, utiliser les variables. Pour PDF/image, utiliser les fields
  const templateFieldKeys = useMemo(() => {
    if (template.templateType === 'docx' && template.variables) {
      return template.variables.map(v => v.name);
    }
    return template.fields?.map(f => f.key) || [];
  }, [template.fields, template.variables, template.templateType]);

  const handleDataMapped = (rows: Record<string, string | number>[]) => {
    setMappedRows(rows);
    if (rows.length > 0) {
      setCurrentStep('preview');
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');

    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          templateId: template.id, 
          rows: mappedRows,
          outputFormat: template.templateType === 'docx' ? outputFormat : undefined, // Format de sortie pour DOCX
          pdfOptions: template.templateType === 'docx' && outputFormat === 'pdf' ? {
            format: pdfFormat,
            orientation: pdfOrientation,
          } : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la génération');
        return;
      }

      onGenerationComplete();
    } catch (e) {
      setError('Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <StepIndicator
            number={1}
            label="Import données"
            isActive={currentStep === 'import'}
            isComplete={currentStep !== 'import'}
          />
          <div className={`h-0.5 w-16 ${currentStep !== 'import' ? 'bg-blue-600' : 'bg-gray-300'}`} />
          <StepIndicator
            number={2}
            label="Aperçu"
            isActive={currentStep === 'preview'}
            isComplete={currentStep === 'confirm'}
          />
          <div className={`h-0.5 w-16 ${currentStep === 'confirm' ? 'bg-blue-600' : 'bg-gray-300'}`} />
          <StepIndicator
            number={3}
            label="Confirmation"
            isActive={currentStep === 'confirm'}
            isComplete={false}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Step 1: Import */}
      {currentStep === 'import' && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Étape 1 : Importer vos données
          </h2>
          <CSVExcelImport
            templateFieldKeys={templateFieldKeys}
            onDataMapped={handleDataMapped}
          />
        </div>
      )}

      {/* Step 2: Preview */}
      {currentStep === 'preview' && (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Étape 2 : Aperçu du rendu
              </h2>
              <button
                onClick={() => setCurrentStep('import')}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                ← Modifier les données
              </button>
            </div>
            
            <VisualPreview
              template={template}
              previewData={mappedRows[0] || {}}
            />

            <div className="mt-4 rounded-md bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                <strong>{mappedRows.length}</strong> document{mappedRows.length > 1 ? 's' : ''} sera{mappedRows.length > 1 ? 'ont' : ''} généré{mappedRows.length > 1 ? 's' : ''} avec ces paramètres.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setCurrentStep('import')}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Retour
            </button>
            <button
              onClick={() => setCurrentStep('confirm')}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {currentStep === 'confirm' && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Étape 3 : Confirmation et génération
          </h2>

          <div className="space-y-4">
            <div className="rounded-md border border-gray-200 p-4">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="font-medium text-gray-500">Template</dt>
                  <dd className="mt-1 text-gray-900">{template.name}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Nombre de documents</dt>
                  <dd className="mt-1 text-gray-900">{mappedRows.length}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Champs mappés</dt>
                  <dd className="mt-1 text-gray-900">
                    {template.templateType === 'docx' 
                      ? (template.variables?.length ?? 0)
                      : (template.fields?.length ?? 0)
                    }
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Format de sortie</dt>
                  <dd className="mt-1 text-gray-900">
                    {template.templateType === 'docx' ? (
                      <select
                        value={outputFormat}
                        onChange={(e) => setOutputFormat(e.target.value as 'docx' | 'pdf')}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm font-semibold text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="docx">DOCX (Word)</option>
                        <option value="pdf">PDF</option>
                      </select>
                    ) : (
                      'PDF'
                    )}
                  </dd>
                </div>
                {template.templateType === 'docx' && outputFormat === 'pdf' && (
                  <>
                    <div>
                      <dt className="font-medium text-gray-500">Format de page</dt>
                      <dd className="mt-1">
                        <select
                          value={pdfFormat}
                          onChange={(e) => setPdfFormat(e.target.value as typeof pdfFormat)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm font-semibold text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="A4">A4</option>
                          <option value="A3">A3</option>
                          <option value="Letter">Letter</option>
                          <option value="Legal">Legal</option>
                          <option value="Tabloid">Tabloid</option>
                        </select>
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Orientation</dt>
                      <dd className="mt-1">
                        <select
                          value={pdfOrientation}
                          onChange={(e) => setPdfOrientation(e.target.value as typeof pdfOrientation)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-sm font-semibold text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="portrait">Portrait</option>
                          <option value="landscape">Paysage</option>
                        </select>
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </div>

            {template.templateType === 'docx' && outputFormat === 'pdf' && (
              <div className="rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-blue-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      Les documents Word seront automatiquement convertis en PDF. Cette conversion peut prendre un peu plus de temps.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    Cette opération peut prendre quelques instants selon le nombre de documents à générer.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setCurrentStep('preview')}
              disabled={generating}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              Retour
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Génération en cours...
                </span>
              ) : (
                `Générer ${mappedRows.length} document${mappedRows.length > 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface StepIndicatorProps {
  number: number;
  label: string;
  isActive: boolean;
  isComplete: boolean;
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
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          number
        )}
      </div>
      <span className={`mt-2 text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}
