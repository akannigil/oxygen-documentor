'use client';

import { useMemo } from 'react';
import type { TemplateField } from '@/shared/types';

interface MappingPreviewProps {
  fields: TemplateField[];
  mappedRows: Record<string, string | number>[];
  className?: string;
}

export function MappingPreview({ fields, mappedRows, className = '' }: MappingPreviewProps) {
  const previewData = useMemo(() => {
    if (mappedRows.length === 0) return null;
    return mappedRows[0]; // Première ligne comme exemple
  }, [mappedRows]);

  if (!previewData || fields.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Aperçu du rendu</h3>
      <div className="space-y-3">
        {fields.map((field, index) => {
          const value = previewData[field.key] || '';
          const displayValue = formatPreviewValue(value, field);
          
          return (
            <div key={`preview-${field.key}-${index}`} className="flex items-center justify-between rounded-md border border-gray-200 p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {field.key}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                    {field.type}
                  </span>
                </div>
                <div 
                  className="mt-1 text-sm"
                  style={{
                    fontFamily: getFontFamily(field.fontFamily),
                    fontSize: `${field.fontSize || 12}px`,
                    color: field.textColor || '#000000',
                    textAlign: field.align || 'left',
                    backgroundColor: field.backgroundColor || 'transparent',
                    padding: field.backgroundColor ? '2px 4px' : '0',
                    borderRadius: field.backgroundColor ? '2px' : '0',
                    border: field.borderColor && field.borderWidth 
                      ? `${field.borderWidth}px solid ${field.borderColor}` 
                      : 'none',
                  }}
                >
                  {field.type === 'qrcode' ? (
                    <div className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm6 0h2v2h-2V5zm4 0h2v2h-2V5zm-4 4h2v2h-2V9zm4 0h2v2h-2V9zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm6 2h2v2h-2v-2zm0 4h2v2h-2v-2zm4-4h2v2h-2v-2zm0 4h2v2h-2v-2zm-4-8h2v2h-2v-2zm4 0h2v2h-2v-2z"/>
                      </svg>
                      QR Code: {String(displayValue).substring(0, 20)}...
                    </div>
                  ) : (
                    String(displayValue)
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-400">
                {field.w}×{field.h}px
              </div>
            </div>
          );
        })}
      </div>
      
      {mappedRows.length > 1 && (
        <div className="mt-3 text-xs text-gray-500">
          Aperçu basé sur la première ligne. {mappedRows.length - 1} autre(s) ligne(s) seront générées.
        </div>
      )}
    </div>
  );
}

function formatPreviewValue(value: string | number, field: TemplateField): string | number {
  if (!value) return '';
  
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
    case 'Helvetica-Bold':
      return 'Arial, sans-serif';
    case 'Times-Roman':
    case 'Times-Bold':
      return 'Times, serif';
    case 'Courier':
    case 'Courier-Bold':
      return 'Courier, monospace';
    default:
      return 'Arial, sans-serif';
  }
}
