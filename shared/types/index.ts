/**
 * Types partagés pour l'application
 */

export type TemplateType = 'pdf' | 'image' | 'docx' | 'pptx'

export interface TemplateField {
  key: string
  x: number
  y: number
  w: number
  h: number
  fontSize?: number
  align?: 'left' | 'center' | 'right'
  type: 'text' | 'qrcode' | 'date' | 'number'
  format?: string // Format optionnel (e.g., "YYYY-MM-DD" pour dates, mask pour textes)
  fontFamily?: 'Helvetica' | 'Helvetica-Bold' | 'Times-Roman' | 'Times-Bold' | 'Courier' | 'Courier-Bold'
  textColor?: string // Couleur hex (e.g., "#000000")
  backgroundColor?: string // Couleur de fond hex
  borderColor?: string // Couleur de bordure hex
  borderWidth?: number // Épaisseur de bordure
}

export interface TemplateVariable {
  name: string
  occurrences: number
  context?: string
}

export interface DocumentData {
  [key: string]: string | number | Date
}

export interface ImportRow {
  [column: string]: string | number
}

export interface ColumnMapping {
  column: string
  fieldKey: string
  type?: 'string' | 'date' | 'number'
}

export type DocumentStatus = 'generated' | 'sent' | 'failed'

export type UserRole = 'owner' | 'editor' | 'viewer'

