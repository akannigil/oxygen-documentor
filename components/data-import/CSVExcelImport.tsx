"use client";

import { useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ImportResult {
  headers: string[];
  rows: Record<string, string | number>[];
}

export interface Mapping {
  [fieldKey: string]: string; // fieldKey -> column name
}

interface CSVExcelImportProps {
  templateFieldKeys: string[];
  onDataMapped: (rows: Record<string, string | number>[]) => void;
}

export default function CSVExcelImport({ templateFieldKeys, onDataMapped }: CSVExcelImportProps) {
  const [error, setError] = useState<string>('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});

  const parseCSV = useCallback(async (f: File): Promise<void> => {
    return new Promise<void>((resolve) => {
      Papa.parse<Record<string, string | number>>(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data.filter((row): row is Record<string, string | number> => 
            row !== null && typeof row === 'object'
          );
          const headers = results.meta.fields ?? [];
          setImportResult({ headers, rows });
          resolve();
        },
        error: () => {
          setError('Erreur lors du parsing CSV');
          resolve();
        },
      });
    });
  }, []);

  const parseXLSX = useCallback(async (f: File): Promise<void> => {
    try {
      const arrayBuffer = await f.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      
      if (!sheetName) {
        setError('Le fichier Excel ne contient aucune feuille');
        return;
      }
      
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        setError('Impossible de lire la feuille Excel');
        return;
      }
      
      const json = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { defval: '' });
      const headerRow = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0];
      const headers = headerRow ?? [];
      
      setImportResult({ headers, rows: json });
    } catch (err) {
      setError(`Erreur lors du parsing Excel: ${err instanceof Error ? err.message : 'erreur inconnue'}`);
    }
  }, []);

  const handleFile = useCallback(async (f: File) => {
    setError('');
    setImportResult(null);
    setMapping({});

    const ext = f.name.toLowerCase().split('.').pop();
    if (ext === 'csv') {
      await parseCSV(f);
    } else if (ext === 'xlsx' || ext === 'xls') {
      await parseXLSX(f);
    } else {
      setError('Format non supporté. Utiliser CSV, XLSX ou XLS.');
    }
  }, [parseCSV, parseXLSX]);

  const applyMapping = useCallback(() => {
    if (!importResult) return;
    
    const mapped = importResult.rows.map((row) => {
      const out: Record<string, string | number> = {};
      for (const key of templateFieldKeys) {
        const col = mapping[key];
        const value = col && col in row ? row[col] : '';
        out[key] = value ?? '';
      }
      return out;
    });
    
    onDataMapped(mapped);
  }, [importResult, templateFieldKeys, mapping, onDataMapped]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) {
      void handleFile(f);
    }
  }, [handleFile]);

  const handleMappingChange = useCallback((key: string, value: string) => {
    setMapping((m) => ({ ...m, [key]: value }));
  }, []);

  // Prévisualisation des données mappées (mémoïsée)
  const previewRows = useMemo(() => {
    if (!importResult) return [];
    return importResult.rows.slice(0, 10);
  }, [importResult]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Fichier CSV/XLSX</label>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
        />
        {error && (
          <div className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}
      </div>

      {importResult && (
        <div className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Mapping des colonnes</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {templateFieldKeys.map((key) => (
              <div key={key} className="space-y-1">
                <div className="text-xs font-medium text-gray-700">{key}</div>
                <select
                  className="block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                  value={mapping[key] ?? ''}
                  onChange={(e) => handleMappingChange(key, e.target.value)}
                >
                  <option value="">— Ne pas mapper —</option>
                  {importResult.headers.map((h) => (
                    <option key={`${key}-${h}`} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <h4 className="mb-2 text-xs font-semibold text-gray-700">Aperçu (10 premières lignes)</h4>
            <div className="overflow-auto rounded border text-xs">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {templateFieldKeys.map((k) => (
                      <th key={`h-${k}`} className="px-2 py-2 text-left font-medium text-gray-700">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={`r-${i}`} className="odd:bg-white even:bg-gray-50">
                      {templateFieldKeys.map((k) => {
                        const col = mapping[k];
                        const value = col && col in row ? row[col] : '';
                        return (
                          <td key={`c-${k}-${i}`} className="px-2 py-2 text-gray-800">
                            {String(value ?? '')}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={applyMapping}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Valider le mapping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
