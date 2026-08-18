const RULE_PATTERN = /^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/

function unwrap(raw: string): string {
  const trimmed = raw.trim()
  const quoted = trimmed.match(/^"(.*)"$|^'(.*)'$/)
  if (quoted) return quoted[1] ?? quoted[2] ?? ''
  return trimmed.replace(/^\{\{\s*|\s*\}\}$/g, '')
}

/**
 * Minimal, non-eval rule syntax for condition nodes: `variable == value`
 * (also !=, >, <, >=, <=). Numeric comparison when both sides parse as
 * numbers, string comparison otherwise. Unknown/malformed rules are falsy.
 */
export function evaluateRule(rule: string | undefined, variables: Record<string, unknown>): boolean {
  if (!rule) return false

  const match = rule.match(RULE_PATTERN)
  if (!match) return false

  const [, rawVar, op, rawValue] = match
  const varName = unwrap(rawVar)
  const actual = variables[varName]
  const expected = unwrap(rawValue)

  const actualNum = Number(actual)
  const expectedNum = Number(expected)
  const bothNumeric =
    actual !== undefined && actual !== '' && !Number.isNaN(actualNum) && expected !== '' && !Number.isNaN(expectedNum)

  const actualStr = String(actual ?? '')

  switch (op) {
    case '==':
      return bothNumeric ? actualNum === expectedNum : actualStr === expected
    case '!=':
      return bothNumeric ? actualNum !== expectedNum : actualStr !== expected
    case '>':
      return bothNumeric ? actualNum > expectedNum : actualStr > expected
    case '<':
      return bothNumeric ? actualNum < expectedNum : actualStr < expected
    case '>=':
      return bothNumeric ? actualNum >= expectedNum : actualStr >= expected
    case '<=':
      return bothNumeric ? actualNum <= expectedNum : actualStr <= expected
    default:
      return false
  }
}

export function interpolate(text: string, variables: Record<string, unknown>): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name: string) => {
    const value = variables[name]
    return value === undefined ? '' : String(value)
  })
}

/**
 * Same as interpolate(), but for substituting into a JSON string template
 * (e.g. `{"Authorization": "Bearer {{token}}"}`). Escapes the value as JSON
 * string content so quotes/newlines/backslashes in a variable can't break
 * the surrounding JSON — plain interpolate() would just splice them in raw.
 */
export function interpolateJson(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name: string) => {
    const value = variables[name]
    if (value === undefined) return ''
    return JSON.stringify(String(value)).slice(1, -1)
  })
}
