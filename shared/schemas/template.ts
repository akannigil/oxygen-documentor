import { z } from 'zod'

/**
 * Schéma pour les options de personnalisation des QR codes
 */
const qrcodeOptionsSchema = z.object({
  width: z.number().positive().optional(),
  margin: z.number().min(0).max(10).optional(),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).optional(),
  color: z.object({
    dark: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    light: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }).optional(),
}).optional()

/**
 * Schéma pour l'authentification de certificat QR code
 */
const qrcodeCertificateAuthSchema = z.object({
  enabled: z.boolean(),
  verificationBaseUrl: z.string().url().optional(),
  expiresIn: z.number().positive().optional(),
  includeDocumentHash: z.boolean().optional(),
  certificateFields: z.object({
    certificateId: z.string().optional(),
    holderName: z.string().optional(),
    title: z.string().optional(),
    issueDate: z.string().optional(),
    issuer: z.string().optional(),
    grade: z.string().optional(),
    expiryDate: z.string().optional(),
  }).optional(),
}).optional()

/**
 * Schéma pour l'URL de stockage dans le QR code
 */
const qrcodeStorageUrlSchema = z.object({
  enabled: z.boolean(),
  urlType: z.enum(['signed', 'public']).optional(),
  expiresIn: z.number().positive().optional(),
}).optional()

export const templateFieldSchema = z.object({
  key: z.string().min(1),
  x: z.number().min(0),
  y: z.number().min(0),
  w: z.number().positive(),
  h: z.number().positive(),
  fontSize: z.number().positive().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  type: z.enum(['text', 'qrcode', 'date', 'number']),
  format: z.string().optional(),
  fontFamily: z.enum(['Helvetica', 'Helvetica-Bold', 'Times-Roman', 'Times-Bold', 'Courier', 'Courier-Bold']).optional(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  borderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  borderWidth: z.number().positive().optional(),
  qrcodeOptions: qrcodeOptionsSchema,
  qrcodeAuth: qrcodeCertificateAuthSchema,
  qrcodeStorageUrl: qrcodeStorageUrlSchema,
}) // satisfies désactivé car incompatible avec exactOptionalPropertyTypes

export const updateTemplateFieldsSchema = z.object({
  fields: z.array(templateFieldSchema),
})

export type UpdateTemplateFieldsInput = z.infer<typeof updateTemplateFieldsSchema>

/**
 * Schéma pour la configuration des QR Codes DOCX
 */
export const docxQRCodeConfigSchema = z.object({
  placeholder: z.string().min(1),
  contentPattern: z.string().min(1),
  contentType: z.enum(['url', 'text', 'vcard', 'email', 'phone', 'custom']).optional(),
  options: qrcodeOptionsSchema,
  auth: qrcodeCertificateAuthSchema,
  storageUrl: qrcodeStorageUrlSchema,
})

export const updateDOCXQRCodeConfigsSchema = z.object({
  qrcodeConfigs: z.array(docxQRCodeConfigSchema),
})

export type DOCXQRCodeConfigInput = z.infer<typeof docxQRCodeConfigSchema>
export type UpdateDOCXQRCodeConfigsInput = z.infer<typeof updateDOCXQRCodeConfigsSchema>

