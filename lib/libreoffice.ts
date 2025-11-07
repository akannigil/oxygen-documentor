import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'

const execAsync = promisify(exec)

/**
 * Chemin vers LibreOffice (configuré via variable d'environnement)
 */
const LIBREOFFICE_PATH = process.env['LIBREOFFICE_PATH'] || '/usr/bin/soffice'

/**
 * Options de conversion LibreOffice
 */
interface ConversionOptions {
  /** Format de sortie (pdf, html, etc.) */
  format?: string
  /** Dossier de sortie (par défaut : même dossier que le fichier source) */
  outputDir?: string
  /** Filtres de conversion spécifiques */
  filters?: string
  /** Timeout en millisecondes (défaut: 60000) */
  timeout?: number
}

/**
 * Vérifie si LibreOffice est installé et accessible
 */
export async function checkLibreOfficeAvailable(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`${LIBREOFFICE_PATH} --version`, {
      timeout: 5000,
    })
    console.log('[LibreOffice] Version détectée:', stdout.trim())
    return true
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[LibreOffice] Non disponible:', errorMessage)
    return false
  }
}

/**
 * Convertit un document Office (DOCX, PPTX, XLSX, etc.) en PDF ou autre format
 *
 * @param inputPath Chemin vers le fichier source
 * @param options Options de conversion
 * @returns Chemin vers le fichier converti
 *
 * @example
 * ```typescript
 * const pdfPath = await convertDocument('/path/to/document.docx', {
 *   format: 'pdf',
 *   outputDir: '/path/to/output'
 * })
 * ```
 */
export async function convertDocument(
  inputPath: string,
  options: ConversionOptions = {}
): Promise<string> {
  const { format = 'pdf', outputDir, filters, timeout = 60000 } = options

  // Vérifier que le fichier source existe
  try {
    await fs.access(inputPath)
  } catch {
    throw new Error(`Fichier source introuvable: ${inputPath}`)
  }

  // Déterminer le dossier de sortie
  const targetDir = outputDir || path.dirname(inputPath)

  // Construire la commande LibreOffice
  const commands = [LIBREOFFICE_PATH, '--headless', '--convert-to', format, '--outdir', targetDir]

  // Ajouter les filtres si spécifiés
  if (filters) {
    commands.push('--filter', filters)
  }

  commands.push(inputPath)

  const command = commands.join(' ')

  console.log('[LibreOffice] Conversion:', command)

  try {
    const { stdout, stderr } = await execAsync(command, { timeout })

    if (stderr && stderr.trim()) {
      console.warn('[LibreOffice] Warnings:', stderr.trim())
    }

    if (stdout && stdout.trim()) {
      console.log('[LibreOffice] Output:', stdout.trim())
    }

    // Déterminer le chemin du fichier de sortie
    const basename = path.basename(inputPath, path.extname(inputPath))
    const outputPath = path.join(targetDir, `${basename}.${format}`)

    // Vérifier que le fichier de sortie existe
    try {
      await fs.access(outputPath)
      console.log('[LibreOffice] Conversion réussie:', outputPath)
      return outputPath
    } catch {
      throw new Error(`Fichier de sortie non créé: ${outputPath}. Vérifiez les logs LibreOffice.`)
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[LibreOffice] Erreur de conversion:', errorMessage)
    throw new Error(`Échec de conversion avec LibreOffice: ${errorMessage}`)
  }
}

/**
 * Convertit un document DOCX en PDF
 *
 * @param docxPath Chemin vers le fichier DOCX
 * @param outputDir Dossier de sortie (optionnel)
 * @returns Chemin vers le PDF généré
 */
export async function docxToPdf(docxPath: string, outputDir?: string): Promise<string> {
  return convertDocument(docxPath, {
    format: 'pdf',
    ...(outputDir !== undefined && { outputDir }),
  })
}

/**
 * Convertit un document PPTX en PDF
 *
 * @param pptxPath Chemin vers le fichier PPTX
 * @param outputDir Dossier de sortie (optionnel)
 * @returns Chemin vers le PDF généré
 */
export async function pptxToPdf(pptxPath: string, outputDir?: string): Promise<string> {
  return convertDocument(pptxPath, {
    format: 'pdf',
    ...(outputDir !== undefined && { outputDir }),
  })
}

/**
 * Convertit un document XLSX en PDF
 *
 * @param xlsxPath Chemin vers le fichier XLSX
 * @param outputDir Dossier de sortie (optionnel)
 * @returns Chemin vers le PDF généré
 */
export async function xlsxToPdf(xlsxPath: string, outputDir?: string): Promise<string> {
  return convertDocument(xlsxPath, {
    format: 'pdf',
    ...(outputDir !== undefined && { outputDir }),
  })
}

/**
 * Convertit un document ODT (OpenDocument Text) en PDF
 *
 * @param odtPath Chemin vers le fichier ODT
 * @param outputDir Dossier de sortie (optionnel)
 * @returns Chemin vers le PDF généré
 */
export async function odtToPdf(odtPath: string, outputDir?: string): Promise<string> {
  return convertDocument(odtPath, {
    format: 'pdf',
    ...(outputDir !== undefined && { outputDir }),
  })
}

/**
 * Liste des formats de fichiers supportés par LibreOffice
 */
export const SUPPORTED_FORMATS = {
  // Documents texte
  docx: 'Microsoft Word (DOCX)',
  doc: 'Microsoft Word (DOC)',
  odt: 'OpenDocument Text (ODT)',
  rtf: 'Rich Text Format (RTF)',
  txt: 'Plain Text',

  // Présentations
  pptx: 'Microsoft PowerPoint (PPTX)',
  ppt: 'Microsoft PowerPoint (PPT)',
  odp: 'OpenDocument Presentation (ODP)',

  // Tableurs
  xlsx: 'Microsoft Excel (XLSX)',
  xls: 'Microsoft Excel (XLS)',
  ods: 'OpenDocument Spreadsheet (ODS)',
  csv: 'Comma Separated Values',

  // Autres
  html: 'HTML',
  htm: 'HTML',
} as const

/**
 * Formats de sortie supportés
 */
export const OUTPUT_FORMATS = ['pdf', 'html', 'odt', 'doc', 'docx', 'rtf', 'txt'] as const
