import http from 'http'
import https from 'https'
import net from 'net'
import dns, { LookupOneOptions, LookupAllOptions } from 'dns'

const REQUEST_TIMEOUT_MS = 10_000
const MAX_RESPONSE_BYTES = 1_000_000

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false
  const [a, b] = parts
  if (a === 0) return true // "this" network
  if (a === 10) return true // private
  if (a === 127) return true // loopback
  if (a === 169 && b === 254) return true // link-local (covers cloud metadata IPs)
  if (a === 172 && b >= 16 && b <= 31) return true // private
  if (a === 192 && b === 168) return true // private
  if (a === 100 && b >= 64 && b <= 127) return true // carrier-grade NAT
  return false
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase()
  if (normalized === '::1') return true // loopback
  if (normalized.startsWith('::ffff:')) return isPrivateIPv4(normalized.slice(7))
  if (normalized.startsWith('fe80:')) return true // link-local
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true // unique local (fc00::/7)
  return false
}

function isBlockedAddress(ip: string): boolean {
  return net.isIPv6(ip) ? isPrivateIPv6(ip) : isPrivateIPv4(ip)
}

// Validates the resolved address in the same lookup call the HTTP client uses
// to connect, so the checked IP is guaranteed to be the one actually
// connected to (no DNS-rebinding gap between "check" and "use").
function safeLookup(
  hostname: string,
  options: (LookupOneOptions & LookupAllOptions) | number,
  callback: (err: NodeJS.ErrnoException | null, address: any, family?: number) => void
) {
  dns.lookup(hostname, options as any, (err, address, family) => {
    if (err) return callback(err, address, family)

    const results: { address: string }[] = Array.isArray(address) ? address : [{ address: address as string }]
    const blocked = results.find((r) => isBlockedAddress(r.address))
    if (blocked) {
      return callback(new Error(`Endereço bloqueado (rede privada/interna): ${blocked.address}`), address, family)
    }

    callback(null, address, family)
  })
}

export interface SafeHttpResult {
  status: number
  body: string
}

export interface SafeHttpOptions {
  headers?: Record<string, string>
  query?: Record<string, string>
  body?: string
}

/**
 * Makes an outbound HTTP(S) request on behalf of a flow's HTTP node, with
 * SSRF mitigations: only http/https, resolved-address validated against
 * private/loopback/link-local ranges at connect time, no redirect following,
 * a hard timeout, and a response size cap.
 */
export function safeHttpRequest(
  urlString: string,
  method: string,
  options: SafeHttpOptions = {}
): Promise<SafeHttpResult> {
  let url: URL
  try {
    url = new URL(urlString)
  } catch {
    return Promise.reject(new Error('URL inválida'))
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return Promise.reject(new Error('Apenas URLs http/https são permitidas'))
  }

  // dns.lookup's `lookup` option (used below) is only consulted when the host
  // needs resolving. A literal IP in the URL — the most common real-world
  // SSRF pattern — skips that step entirely, so it has to be checked here too.
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(hostname) && isBlockedAddress(hostname)) {
    return Promise.reject(new Error(`Endereço bloqueado (rede privada/interna): ${hostname}`))
  }

  for (const [key, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(key, value)
  }

  // A user-supplied Host header can't redirect the actual TCP connection
  // (that's pinned by safeLookup above), but it could still fool an
  // internal reverse proxy into routing by vhost — simplest to just drop it.
  const headers = Object.fromEntries(
    Object.entries(options.headers ?? {}).filter(([key]) => key.toLowerCase() !== 'host')
  )

  const client = url.protocol === 'https:' ? https : http

  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method,
        headers,
        lookup: safeLookup as any,
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        let body = ''
        let size = 0

        res.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > MAX_RESPONSE_BYTES) {
            req.destroy(new Error('Resposta excedeu o tamanho máximo permitido'))
            return
          }
          body += chunk.toString('utf-8')
        })

        res.on('end', () => {
          resolve({ status: res.statusCode || 0, body })
        })
      }
    )

    req.on('timeout', () => req.destroy(new Error('Requisição excedeu o tempo limite')))
    req.on('error', reject)
    req.end(options.body)
  })
}
