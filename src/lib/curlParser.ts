export interface ParsedCurl {
  method: string
  url: string
  headers: Record<string, string>
  body: string
}

// Bash-ish tokenizer: handles 'single', "double\"escaped" quoting and
// backslash-newline line continuations from multi-line pasted commands.
// Not a full shell parser, but covers what curl commands people actually
// paste (browser "Copy as cURL", Postman, docs examples).
function tokenize(input: string): string[] {
  const normalized = input.replace(/\\\r?\n/g, ' ')
  const tokens: string[] = []
  let current = ''
  let inSingle = false
  let inDouble = false
  let hasToken = false

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i]

    if (inSingle) {
      if (char === "'") {
        inSingle = false
      } else {
        current += char
      }
      continue
    }

    if (inDouble) {
      if (char === '"') {
        inDouble = false
      } else if (char === '\\' && (normalized[i + 1] === '"' || normalized[i + 1] === '\\')) {
        current += normalized[++i]
      } else {
        current += char
      }
      continue
    }

    if (char === "'") {
      inSingle = true
      hasToken = true
    } else if (char === '"') {
      inDouble = true
      hasToken = true
    } else if (/\s/.test(char)) {
      if (hasToken) {
        tokens.push(current)
        current = ''
        hasToken = false
      }
    } else {
      current += char
      hasToken = true
    }
  }

  if (hasToken) tokens.push(current)
  return tokens
}

const DATA_FLAGS = new Set(['-d', '--data', '--data-raw', '--data-ascii', '--data-binary', '--data-urlencode'])

/**
 * Parses a pasted `curl ...` command into method/url/headers/body. Returns
 * null if it doesn't look like a curl command at all. Unrecognized flags are
 * skipped rather than treated as an error, since most of them (-s, -k, -L,
 * --compressed, etc.) don't affect what we care about here.
 */
export function parseCurl(command: string): ParsedCurl | null {
  const trimmed = command.trim()
  if (!trimmed) return null

  const tokens = tokenize(trimmed)
  if (tokens.length === 0 || !/^curl(\.exe)?$/i.test(tokens[0])) return null

  let url: string | undefined
  let method: string | undefined
  const headers: Record<string, string> = {}
  const dataParts: string[] = []
  let user: string | undefined

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i]

    if (token === '-X' || token === '--request') {
      method = tokens[++i]
    } else if (token === '-H' || token === '--header') {
      const header = tokens[++i] ?? ''
      const sep = header.indexOf(':')
      if (sep > -1) {
        headers[header.slice(0, sep).trim()] = header.slice(sep + 1).trim()
      }
    } else if (DATA_FLAGS.has(token)) {
      dataParts.push(tokens[++i] ?? '')
    } else if (token === '-u' || token === '--user') {
      user = tokens[++i]
    } else if (token === '--url') {
      url = tokens[++i]
    } else if (token.startsWith('-')) {
      // Unknown/irrelevant flag. If the next token looks like this flag's
      // value (not another flag, not the URL), skip it too.
      const known1CharValueFlags = ['-b', '-e', '-A', '-o', '-w']
      if (known1CharValueFlags.includes(token) && tokens[i + 1] && !tokens[i + 1].startsWith('-')) {
        i++
      }
    } else if (!url) {
      url = token
    }
  }

  if (!url) return null

  if (user) {
    headers['Authorization'] = `Basic ${btoa(user)}`
  }

  if (!method) {
    method = dataParts.length > 0 ? 'POST' : 'GET'
  }

  return {
    method: method.toUpperCase(),
    url,
    headers,
    body: dataParts.join('&'),
  }
}
