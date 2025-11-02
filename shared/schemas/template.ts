import { z } from 'zod'

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
}) // satisfies désactivé car incompatible avec exactOptionalPropertyTypes

export const updateTemplateFieldsSchema = z.object({
  fields: z.array(templateFieldSchema),
})

export type UpdateTemplateFieldsInput = z.infer<typeof updateTemplateFieldsSchema>

