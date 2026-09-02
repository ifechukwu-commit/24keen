import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

function parseRawRequest(raw: string) {
  const lines = raw.trim().split('\n')
  const firstLine = lines[0].trim().split(' ')
  const method = firstLine[0] ?? 'GET'
  const path = firstLine[1] ?? '/'
  const headers: Record<string, string> = {}
  let bodyStart = -1
  let host = ''

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') { bodyStart = i + 1; break }
    const colonIndex = lines[i].indexOf(':')
    if (colonIndex > 0) {
      const key = lines[i].slice(0, colonIndex).trim().toLowerCase()
      const val = lines[i].slice(colonIndex + 1).trim()
      headers[key] = val
      if (key === 'host') host = val
    }
  }

  const body = bodyStart > 0 ? lines.slice(bodyStart).join('\n').trim() || null : null
  const url = host ? `https://${host}${path}` : path.startsWith('http') ? path : `https://unknown${path}`
  const resourceIds: string[] = []
  const uuids = [...url.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)]
  uuids.forEach(m => resourceIds.push(m[0]))
  const nums = [...url.matchAll(/\/(\d{4,})/g)]
  nums.forEach(m => resourceIds.push(m[1]))

  return { url, method, headers, body, resourceIds: [...new Set(resourceIds)] }
}

function parseScopeRules(raw: string) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const inScope: string[] = []
  const outScope: string[] = []
  let mode: 'in' | 'out' | null = null

  for (const line of lines) {
    const lower = line.toLowerCase()
    if (lower.includes('in-scope') || lower.includes('in scope')) { mode = 'in'; continue }
    if (lower.includes('out-of-scope') || lower.includes('out of scope') || lower.includes('excluded')) { mode = 'out'; continue }
    if (line.includes('.') && !line.includes(' ')) {
      if (mode === 'in') inScope.push(line)
      else if (mode === 'out') outScope.push(line)
    }
  }

  return { inScope, outScope, raw }
}

export async function POST(req: NextRequest) {
  try {
    const { request, scope, rateLimit = 250 } = await req.json()
    const parsed = parseRawRequest(request)
    const scopeRules = parseScopeRules(scope)

    const { data: session, error: sessionError } = await supabase
      .from('keen_sessions')
      .insert({ target_url: parsed.url, scope_rules: scope, status: 'pending' })
      .select().single()

    if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })

    const { data, error } = await supabase.functions.invoke('run-checks', {
      body: { sessionId: session.id, request: parsed, scope: scopeRules, rateLimit },
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, sessionId: session.id, findings: data?.findings ?? 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
