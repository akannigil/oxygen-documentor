export function sanitizeVariables(
  input: Record<string, unknown>
): Record<string, string | number | Date> {
  const out: Record<string, string | number | Date> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value instanceof Date) {
      out[key] = value
    } else if (typeof value === 'number') {
      out[key] = value
    } else if (typeof value === 'string') {
      out[key] = value
    } else if (typeof value === 'boolean') {
      out[key] = value ? 'true' : 'false'
    } else if (value === null || value === undefined) {
      out[key] = ''
    } else {
      out[key] = String(value)
    }
  }
  return out
}
