import { z } from 'zod'

/**
 * Schémas de validation pour les QR codes
 */

/**
 * Options de génération de QR code
 */
export const qrCodeOptionsSchema = z.object({
  width: z.number().min(50).max(2000).optional().default(200),
  margin: z.number().min(0).max(10).optional().default(1),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).optional().default('M'),
  type: z.enum(['image/png', 'image/jpeg']).optional().default('image/png'),
  quality: z.number().min(0).max(1).optional().default(0.92),
  color: z
    .object({
      dark: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional()
        .default('#000000'),
      light: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional()
        .default('#FFFFFF'),
    })
    .optional(),
})

export type QRCodeOptionsInput = z.infer<typeof qrCodeOptionsSchema>

/**
 * Schéma pour le contenu texte
 */
const textQRCodeDataSchema = z.object({
  type: z.literal('text'),
  data: z.object({
    text: z.string().min(1, 'Le texte ne peut pas être vide'),
  }),
})

/**
 * Schéma pour le contenu URL
 */
const urlQRCodeDataSchema = z.object({
  type: z.literal('url'),
  data: z.object({
    url: z.string().url('URL invalide'),
  }),
})

/**
 * Schéma pour le contenu email
 */
const emailQRCodeDataSchema = z.object({
  type: z.literal('email'),
  data: z.object({
    email: z.string().email('Adresse email invalide'),
    subject: z.string().optional(),
    body: z.string().optional(),
  }),
})

/**
 * Schéma pour le contenu téléphone
 */
const telQRCodeDataSchema = z.object({
  type: z.literal('tel'),
  data: z.object({
    phone: z.string().min(1, 'Le numéro de téléphone ne peut pas être vide'),
  }),
})

/**
 * Schéma pour le contenu SMS
 */
const smsQRCodeDataSchema = z.object({
  type: z.literal('sms'),
  data: z.object({
    phone: z.string().min(1, 'Le numéro de téléphone ne peut pas être vide'),
    message: z.string().optional(),
  }),
})

/**
 * Schéma pour le contenu vCard
 */
const vcardQRCodeDataSchema = z.object({
  type: z.literal('vcard'),
  data: z
    .object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      organization: z.string().optional(),
      title: z.string().optional(),
      phone: z.string().optional(),
      mobile: z.string().optional(),
      email: z.string().email().optional(),
      website: z.string().url().optional(),
      address: z.string().optional(),
    })
    .refine((data) => data.firstName || data.lastName, {
      message: 'Au moins un nom (firstName ou lastName) est requis',
    }),
})

/**
 * Schéma pour le contenu WiFi
 */
const wifiQRCodeDataSchema = z.object({
  type: z.literal('wifi'),
  data: z.object({
    ssid: z.string().min(1, 'Le SSID ne peut pas être vide'),
    password: z.string().optional(),
    security: z.enum(['WPA', 'WEP', 'nopass']).optional().default('WPA'),
    hidden: z.boolean().optional().default(false),
  }),
})

/**
 * Schéma pour le contenu géolocalisation
 */
const geoQRCodeDataSchema = z.object({
  type: z.literal('geo'),
  data: z.object({
    latitude: z.number().min(-90).max(90, 'Latitude invalide'),
    longitude: z.number().min(-180).max(180, 'Longitude invalide'),
  }),
})

/**
 * Schéma pour le contenu événement
 */
const eventQRCodeDataSchema = z.object({
  type: z.literal('event'),
  data: z.object({
    title: z.string().min(1, 'Le titre ne peut pas être vide'),
    location: z.string().optional(),
    description: z.string().optional(),
    start: z.string().datetime('Date de début invalide'),
    end: z.string().datetime('Date de fin invalide').optional(),
  }),
})

/**
 * Schéma pour le contenu personnalisé
 */
const customQRCodeDataSchema = z.object({
  type: z.literal('custom'),
  data: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
})

/**
 * Schéma discriminé pour le contenu du QR code
 */
export const qrCodeContentSchema = z.discriminatedUnion('type', [
  textQRCodeDataSchema,
  urlQRCodeDataSchema,
  emailQRCodeDataSchema,
  telQRCodeDataSchema,
  smsQRCodeDataSchema,
  vcardQRCodeDataSchema,
  wifiQRCodeDataSchema,
  geoQRCodeDataSchema,
  eventQRCodeDataSchema,
  customQRCodeDataSchema,
])

export type QRCodeContentInput = z.infer<typeof qrCodeContentSchema>

/**
 * Schéma pour la requête de génération de QR code
 */
export const generateQRCodeRequestSchema = z.object({
  content: qrCodeContentSchema,
  options: qrCodeOptionsSchema.optional(),
})

export type GenerateQRCodeRequest = z.infer<typeof generateQRCodeRequestSchema>

/**
 * Schéma pour l'insertion de QR code dans DOCX
 */
export const insertQRCodeInDOCXRequestSchema = z.object({
  placeholder: z.string().min(1, 'Le placeholder ne peut pas être vide'),
  qrData: z.string().min(1, 'Les données du QR code ne peuvent pas être vides'),
  options: qrCodeOptionsSchema
    .extend({
      docxWidth: z.number().min(0).optional(),
      docxHeight: z.number().min(0).optional(),
      altText: z.string().optional().default('QR Code'),
    })
    .optional(),
})

export type InsertQRCodeInDOCXRequest = z.infer<typeof insertQRCodeInDOCXRequestSchema>

/**
 * Schéma pour l'insertion de plusieurs QR codes dans DOCX
 */
export const insertMultipleQRCodesRequestSchema = z.object({
  qrCodes: z.array(insertQRCodeInDOCXRequestSchema),
})

export type InsertMultipleQRCodesRequest = z.infer<typeof insertMultipleQRCodesRequestSchema>
