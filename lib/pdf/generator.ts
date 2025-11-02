import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib'
import QRCode from 'qrcode'
import type { TemplateField } from '@/shared/types'

/**
 * Génère un PDF à partir d'un template et de données
 */
export async function generatePDF(
  templateBuffer: Buffer,
  fields: TemplateField[],
  data: Record<string, string | number | Date>
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(templateBuffer)
  const pages = pdfDoc.getPages()
  const page = pages[0] as PDFPage

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  for (const field of fields) {
    const value = formatFieldValue(data[field.key], field.type, field.format)

    if (field.type === 'qrcode') {
      // Générer QR code
      const qrDataUrl = await QRCode.toDataURL(String(value), {
        width: field.w,
        margin: 1,
      })

      // Convertir DataURL en image PNG
      const pngImage = await pdfDoc.embedPng(qrDataUrl)

      page.drawImage(pngImage, {
        x: field.x,
        y: field.y,
        width: field.w,
        height: field.h,
      })
    } else {
      // Dessiner texte
      const fontSize = field.fontSize ?? 12
      const currentFont = field.type === 'number' ? boldFont : font

      const textY = field.y

      // Gérer l'alignement
      let textX = field.x
      const text = String(value)

      if (field.align === 'center') {
        const textWidth = currentFont.widthOfTextAtSize(text, fontSize)
        textX = field.x + (field.w - textWidth) / 2
      } else if (field.align === 'right') {
        const textWidth = currentFont.widthOfTextAtSize(text, fontSize)
        textX = field.x + field.w - textWidth
      }

      page.drawText(text, {
        x: textX,
        y: textY,
        size: fontSize,
        font: currentFont,
        color: rgb(0, 0, 0),
      })
    }
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

/**
 * Formate une valeur selon son type et format
 */
function formatFieldValue(
  value: string | number | Date | undefined,
  type: TemplateField['type'],
  format?: string
): string {
  if (value === undefined || value === null) {
    return ''
  }

  switch (type) {
    case 'date':
      if (value instanceof Date) {
        return formatDate(value, format)
      }
      if (typeof value === 'string') {
        const date = new Date(value)
        return isNaN(date.getTime()) ? String(value) : formatDate(date, format)
      }
      return String(value)

    case 'number':
      if (typeof value === 'number') {
        return formatNumber(value, format)
      }
      const num = parseFloat(String(value))
      return isNaN(num) ? String(value) : formatNumber(num, format)

    case 'text':
      return formatText(String(value), format)

    case 'qrcode':
      return String(value)

    default:
      return String(value)
  }
}

/**
 * Formate une date selon le format spécifié
 */
function formatDate(date: Date, format?: string): string {
  if (!format) {
    return date.toLocaleDateString('fr-FR')
  }

  // Format simple : YYYY-MM-DD
  if (format === 'YYYY-MM-DD') {
    return date.toISOString().split('T')[0] ?? ''
  }

  // Format DD/MM/YYYY
  if (format === 'DD/MM/YYYY') {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Par défaut, format français
  return date.toLocaleDateString('fr-FR')
}

/**
 * Formate un nombre selon le format spécifié
 */
function formatNumber(value: number, format?: string): string {
  if (!format) {
    return value.toString()
  }

  // Format avec décimales : 0.00
  if (format.includes('.')) {
    const decimals = format.split('.')[1]?.length ?? 2
    return value.toFixed(decimals)
  }

  return value.toString()
}

/**
 * Formate un texte selon le format spécifié (uppercase, lowercase, etc.)
 */
function formatText(text: string, format?: string): string {
  if (!format) {
    return text
  }

  switch (format.toLowerCase()) {
    case 'uppercase':
      return text.toUpperCase()
    case 'lowercase':
      return text.toLowerCase()
    case 'capitalize':
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
    default:
      return text
  }
}

