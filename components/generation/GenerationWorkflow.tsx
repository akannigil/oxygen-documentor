'use client';

import { useState, useMemo, useEffect } from 'react';
import type { TemplateField } from '@/shared/types';
import CSVExcelImport from '@/components/data-import/CSVExcelImport';
import { VisualPreview } from './VisualPreview';

// ... (Existing imports)

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

type Step = 'import' | 'preview' | 'confirm' | 'monitoring';

interface JobStatus {
  status: 'queued' | 'active' | 'completed' | 'failed' | 'unknown';
  progress: number;
  result: { documentIds?: string[]; errors?: any[] } | null;
  error?: string;
}

export function GenerationWorkflow({ template, projectId, onGenerationComplete }: GenerationWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('import');
  const [mappedRows, setMappedRows] = useState<Record<string, string | number>[]>([]);
  const [error, setError] = useState('');
  
  const [outputFormat, setOutputFormat] = useState<'docx' | 'pdf'>(
    template.templateType === 'docx' ? 'docx' : 'pdf'
  );
  const [pdfFormat, setPdfFormat] = useState<'A4' | 'A3' | 'Letter' | 'Legal' | 'Tabloid'>('A4');
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const [monitoringJobId, setMonitoringJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);

  const templateFieldKeys = useMemo(() => {
    if (template.templateType === 'docx' && template.variables) {
      return template.variables.map(v => v.name);
    }
    return template.fields?.map(f => f.key) || [];
  }, [template.fields, template.variables, template.templateType]);

  useEffect(() => {
    if (!monitoringJobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${monitoringJobId}`);
        if (!res.ok) {
          // Stop polling on critical errors (e.g., 404)
          setError("Impossible de récupérer le statut du job.");
          setMonitoringJobId(null);
          return;
        }
        const data = await res.json();
        setJobStatus({
          status: data.state,
          progress: data.progress,
          result: data.returnValue,
          error: data.failedReason,
        });

        if (data.state === 'completed' || data.state === 'failed') {
          setMonitoringJobId(null); // Stop polling
        }
      } catch (e) {
        setError("Erreur réseau lors du suivi du job.");
        setMonitoringJobId(null); // Stop polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [monitoringJobId]);

  const handleDataMapped = (rows: Record<string, string | number>[]) => {
    setMappedRows(rows);
    if (rows.length > 0) {
      setCurrentStep('preview');
    }
  };

  const handleGenerate = async () => {
    setError('');
    setCurrentStep('monitoring'); // Switch to monitoring view immediately
    setJobStatus({ status: 'queued', progress: 0, result: null }); // Initial status

    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          rows: mappedRows,
          outputFormat: template.templateType === 'docx' ? outputFormat : undefined,
          pdfOptions: template.templateType === 'docx' && outputFormat === 'pdf' ? {
            format: pdfFormat,
            orientation: pdfOrientation,
          } : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors du lancement de la génération');
        setJobStatus({ status: 'failed', progress: 0, result: null, error: data.error });
        return;
      }

      setMonitoringJobId(data.jobId);
    } catch (e) {
      const errorMessage = 'Erreur réseau lors du lancement de la génération';
      setError(errorMessage);
      setJobStatus({ status: 'failed', progress: 0, result: null, error: errorMessage });
    }
  };
  
  const isStepComplete = (step: Step) => {
    const stepOrder: Step[] = ['import', 'preview', 'confirm', 'monitoring'];
    return stepOrder.indexOf(currentStep) > stepOrder.indexOf(step);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <StepIndicator number={1} label="Import" isActive={currentStep === 'import'} isComplete={isStepComplete('import')} />
          <div className={`h-0.5 w-16 ${isStepComplete('import') ? 'bg-blue-600' : 'bg-gray-300'}`} />
          <StepIndicator number={2} label="Aperçu" isActive={currentStep === 'preview'} isComplete={isStepComplete('preview')} />
          <div className={`h-0.5 w-16 ${isStepComplete('preview') ? 'bg-blue-600' : 'bg-gray-300'}`} />
          <StepIndicator number={3} label="Confirmation" isActive={currentStep === 'confirm'} isComplete={isStepComplete('confirm')} />
          <div className={`h-0.5 w-16 ${isStepComplete('confirm') ? 'bg-blue-600' : 'bg-gray-300'}`} />
          <StepIndicator number={4} label="Génération" isActive={currentStep === 'monitoring'} isComplete={jobStatus?.status === 'completed'} />
        </div>
      </div>

      {error && !monitoringJobId && <div className="rounded-md bg-red-50 p-4"><p className="text-sm text-red-800">{error}</p></div>}

      {currentStep === 'import' && <CSVExcelImport templateFieldKeys={templateFieldKeys} onDataMapped={handleDataMapped} />}
      
      {currentStep === 'preview' && (
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Étape 2 : Aperçu</h2>
              <VisualPreview template={template} previewData={mappedRows[0] || {}} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCurrentStep('import')} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Retour</button>
              <button onClick={() => setCurrentStep('confirm')} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Continuer</button>
            </div>
          </div>
      )}

      {currentStep === 'confirm' && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Étape 3 : Confirmation</h2>
          {/* ... Confirmation details UI from original component ... */}
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setCurrentStep('preview')} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Retour</button>
            <button onClick={handleGenerate} className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500">Lancer la Génération</button>
          </div>
        </div>
      )}

      {currentStep === 'monitoring' && jobStatus && (
        <JobMonitor status={jobStatus} onComplete={onGenerationComplete} totalDocs={mappedRows.length} />
      )}
    </div>
  );
}

function JobMonitor({ status, onComplete, totalDocs }: { status: JobStatus, onComplete: () => void, totalDocs: number }) {
  const { status: jobState, progress, result, error } = status;

  const getStatusText = () => {
    switch (jobState) {
      case 'queued': return 'Mise en file d\'attente...';
      case 'active': return `Génération en cours... (${progress}%)`;
      case 'completed': return 'Génération terminée !';
      case 'failed': return 'La génération a échoué.';
      default: return 'En attente...';
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm text-center">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Suivi de la Génération</h2>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{getStatusText()}</p>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
        
        {jobState === 'completed' && (
          <div className="rounded-md bg-green-50 p-4 text-green-800">
            <p><strong>Succès :</strong> {result?.documentIds?.length ?? 0} sur {totalDocs} documents ont été générés.</p>
            {result?.errors && result.errors.length > 0 && (
              <p className="text-xs mt-2">{result.errors.length} erreurs rencontrées.</p>
            )}
          </div>
        )}

        {jobState === 'failed' && (
          <div className="rounded-md bg-red-50 p-4 text-red-800">
            <p><strong>Erreur :</strong> {error || 'Une erreur inconnue est survenue.'}</p>
          </div>
        )}

        {(jobState === 'completed' || jobState === 'failed') && (
          <div className="mt-6">
            <button onClick={onComplete} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ... (StepIndicator component remains the same)
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
