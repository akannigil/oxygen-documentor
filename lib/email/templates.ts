/**
 * Système de templates d'email avec support des variables de publipostage
 * Format des variables : {{variable_name}} ou {{variable.name}}
 */

export interface EmailTemplateVariables {
  [key: string]: string | number | Date | EmailTemplateVariables | undefined
}

/**
 * Remplace les variables dans un template HTML/text
 * Supporte les variables simples : {{nom}}, {{email}}
 * Supporte les variables imbriquées : {{recipient.name}}, {{document.title}}
 * Supporte les formats de date : {{date|format:DD/MM/YYYY}}
 */
export function renderEmailTemplate(template: string, variables: EmailTemplateVariables): string {
  let result = template

  // Fonction récursive pour obtenir une valeur depuis un objet imbriqué
  const getValue = (obj: EmailTemplateVariables, path: string): string => {
    const parts = path.split('.')
    let current: unknown = obj

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current && current !== null) {
        current = (current as EmailTemplateVariables)[part]
      } else {
        return ''
      }
    }

    if (current === undefined || current === null) {
      return ''
    }

    if (current instanceof Date) {
      return current.toISOString()
    }

    return String(current)
  }

  // Formater une valeur selon le format spécifié
  const formatValue = (value: string, format?: string): string => {
    if (!format || !value) return value

    // Format de date
    if (format.startsWith('date:')) {
      const dateFormat = format.replace('date:', '')
      try {
        const date = new Date(value)
        if (isNaN(date.getTime())) return value

        // Formats simples
        const formatMap: Record<string, string> = {
          'DD/MM/YYYY': date.toLocaleDateString('fr-FR'),
          'YYYY-MM-DD': date.toISOString().split('T')[0] ?? '',
          'DD/MM/YYYY HH:mm': date.toLocaleString('fr-FR'),
          'DD MMMM YYYY': date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
        }

        return formatMap[dateFormat] ?? date.toLocaleDateString('fr-FR')
      } catch {
        return value
      }
    }

    // Format uppercase
    if (format === 'uppercase') {
      return value.toUpperCase()
    }

    // Format lowercase
    if (format === 'lowercase') {
      return value.toLowerCase()
    }

    // Format capitalize
    if (format === 'capitalize') {
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
    }

    return value
  }

  // Remplacer toutes les occurrences de {{variable}} ou {{variable|format}}
  const variableRegex = /\{\{([^}]+)\}\}/g
  result = result.replace(variableRegex, (match, expression) => {
    const trimmed = expression.trim()

    // Vérifier s'il y a un format
    const parts = trimmed.split('|')
    const variablePath = parts[0]?.trim() ?? ''
    const format = parts[1]?.trim()

    if (!variablePath) return match

    // Obtenir la valeur
    let value = getValue(variables, variablePath)

    // Si la valeur est directement dans variables (pour compatibilité)
    if (!value && variablePath in variables) {
      const directValue = variables[variablePath]
      if (directValue !== undefined && directValue !== null) {
        value = String(directValue)
      }
    }

    // Appliquer le format si spécifié
    if (format) {
      value = formatValue(value, format)
    }

    // Échapper HTML pour éviter les injections XSS
    return escapeHtml(value || '')
  })

  return result
}

/**
 * Échappe les caractères HTML pour éviter les injections XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m] ?? m)
}

/**
 * Template email HTML par défaut
 */
export const DEFAULT_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 2px solid #4CAF50;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #333;
      margin: 0;
      font-size: 24px;
    }
    .content {
      margin-bottom: 30px;
    }
    .content p {
      margin: 15px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #4CAF50;
      color: #ffffff;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #45a049;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{organization_name}}</h1>
    </div>
    
    <div class="content">
      <p>Bonjour {{recipient_name}},</p>
      
      <p>{{message}}</p>
      
      {{download_url}}
      
      {{additional_info}}
    </div>
    
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par {{app_name}}.</p>
      <p>Pour toute question, contactez : {{contact_email}}</p>
    </div>
  </div>
</body>
</html>
`.trim()

/**
 * Template email texte brut par défaut
 */
export const DEFAULT_EMAIL_TEXT_TEMPLATE = `
Bonjour {{recipient_name}},

{{message}}

{{download_url}}

{{additional_info}}

---
Cet email a été envoyé automatiquement par {{app_name}}.
Pour toute question, contactez : {{contact_email}}
`.trim()
