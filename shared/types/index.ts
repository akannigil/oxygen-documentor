/**
 * Types partagés pour l'application
 */

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

