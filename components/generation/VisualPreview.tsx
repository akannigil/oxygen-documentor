'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import type { TemplateField } from '@/shared/types';

interface VisualPreviewProps {
  template: {
    name: string;
    templateType?: string;
    fields?: TemplateField[];
    variables?: Array<{ name: string; occurrences: number; context?: string }>;
    fileUrl?: string;
    width?: number;
    height?: number;
  };
  previewData: Record<string, string | number>;
}

export function VisualPreview({ template, previewData }: VisualPreviewProps) {
  // Calculer le scale pour PDF/image (appelé toujours, avant les retours conditionnels)
  const scale = useMemo(() => {
    if (!template.width) return 1;
    const maxWidth = 800;
    return template.width > maxWidth ? maxWidth / template.width : 1;
  }, [template.width]);

  const scaledWidth = (template.width || 800) * scale;
  const scaledHeight = (template.height || 1000) * scale;

  // Pour les templates DOCX, afficher une prévisualisation des variables
  if (template.templateType === 'docx' && template.variables) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Aperçu des variables DOCX</h3>
          <span className="text-xs text-gray-500">
            Première ligne de données ({template.variables.length} variables)
          </span>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 text-sm text-gray-600">
            Les variables suivantes seront remplacées dans votre document Word :
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {template.variables.map((variable, index) => {
              const value = previewData[variable.name];
              
              return (
                <div key={`variable-preview-${index}`} className="rounded-md border border-gray-200 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">
                      {`{{${variable.name}}}`}
                    </span>
                    <span className="text-xs text-gray-500">
                      {variable.occurrences} occurrence{variable.occurrences > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">
                    {value !== undefined && value !== null && value !== '' 
                      ? String(value) 
                      : <span className="text-gray-400 italic">(vide)</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-md bg-blue-50 p-3">
            <p className="text-xs text-blue-800">
              💡 Les variables seront remplacées dans votre document Word tout en conservant la mise en forme, 
              les polices et les styles définis dans le template.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pour PDF/image, utiliser la prévisualisation visuelle existante
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Aperçu du document</h3>
        <span className="text-xs text-gray-500">
          Première ligne de données ({Object.keys(previewData).length} champs)
        </span>
      </div>

      {/* Canvas d'aperçu */}
      <div className="relative mx-auto rounded-lg border border-gray-300 bg-gray-50 shadow-lg" style={{ width: scaledWidth, height: scaledHeight }}>
        {/* Image de fond du template */}
        {template.fileUrl && (
          <Image
            src={template.fileUrl}
            alt="Template"
            fill
            className="object-fill"
            sizes={`${scaledWidth}px`}
            unoptimized
          />
        )}

        {/* Overlay avec les champs */}
        <div className="absolute inset-0">
          {template.fields?.map((field, index) => {
            const value = formatFieldValue(previewData[field.key], field);
            const fontSize = (field.fontSize || 12) * scale;
            const textHeight = fontSize;
            
            return (
              <div
                key={`field-preview-${index}`}
                className="absolute overflow-hidden"
                style={{
                  left: `${field.x * scale}px`,
                  top: `${field.y * scale}px`,
                  width: `${field.w * scale}px`,
                  height: `${field.h * scale}px`,
                  backgroundColor: field.backgroundColor || 'transparent',
                  borderColor: field.borderColor || 'transparent',
                  borderWidth: field.borderWidth ? `${field.borderWidth * scale}px` : '0',
                  borderStyle: field.borderColor ? 'solid' : 'none',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {field.type === 'qrcode' ? (
                  <div className="flex items-center justify-center w-full h-full bg-white border border-gray-400">
                    <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm6 0h2v2h-2V5zm4 0h2v2h-2V5zm-4 4h2v2h-2V9zm4 0h2v2h-2V9zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm6 2h2v2h-2v-2zm0 4h2v2h-2v-2zm4-4h2v2h-2v-2zm0 4h2v2h-2v-2zm-4-8h2v2h-2v-2zm4 0h2v2h-2v-2z"/>
                    </svg>
                  </div>
                ) : (
                  <div
                    className="w-full truncate"
                    style={{
                      fontSize: `${fontSize}px`,
                      fontFamily: getFontFamily(field.fontFamily),
                      color: field.textColor || '#000000',
                      textAlign: field.align || 'left',
                      lineHeight: `${textHeight}px`,
                      paddingLeft: field.align === 'left' ? '2px' : '0',
                      paddingRight: field.align === 'right' ? '2px' : '0',
                    }}
                  >
                    {String(value || '')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Détails des champs */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h4 className="mb-3 text-sm font-semibold text-gray-900">Détails des champs</h4>
        <div className="grid gap-3 md:grid-cols-2">
          {template.fields?.map((field, index) => {
            const value = formatFieldValue(previewData[field.key], field);
            
            return (
              <div key={`field-detail-${index}`} className="rounded-md border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">{field.key}</span>
                  <span className="text-xs text-gray-500">{field.type}</span>
                </div>
                <div
                  className="mt-1 text-sm truncate"
                  style={{
                    fontFamily: getFontFamily(field.fontFamily),
                    fontSize: `${field.fontSize || 12}px`,
                    color: field.textColor || '#000000',
                  }}
                >
                  {field.type === 'qrcode' ? (
                    <span className="text-xs text-gray-500">QR: {String(value).substring(0, 30)}...</span>
                  ) : (
                    String(value || '(vide)')
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatFieldValue(value: string | number | undefined, field: TemplateField): string | number {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  switch (field.type) {
    case 'date':
      if (typeof value === 'string') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          if (field.format === 'YYYY-MM-DD') {
            return date.toISOString().split('T')[0] || '';
          } else if (field.format === 'DD/MM/YYYY') {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
          }
          return date.toLocaleDateString('fr-FR');
        }
      }
      return String(value);

    case 'number':
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (!isNaN(num)) {
        if (field.format && field.format.includes('.')) {
          const decimals = field.format.split('.')[1]?.length ?? 2;
          return num.toFixed(decimals);
        }
        return num;
      }
      return String(value);

    case 'text':
      const text = String(value);
      if (field.format) {
        switch (field.format.toLowerCase()) {
          case 'uppercase':
            return text.toUpperCase();
          case 'lowercase':
            return text.toLowerCase();
          case 'capitalize':
            return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        }
      }
      return text;

    default:
      return String(value);
  }
}

function getFontFamily(fontFamily?: string): string {
  switch (fontFamily) {
    case 'Helvetica':
      return 'Arial, sans-serif';
    case 'Helvetica-Bold':
      return 'Arial, sans-serif';
    case 'Times-Roman':
    case 'Times-Bold':
      return 'Times New Roman, serif';
    case 'Courier':
    case 'Courier-Bold':
      return 'Courier New, monospace';
    default:
      return 'Arial, sans-serif';
  }
}
