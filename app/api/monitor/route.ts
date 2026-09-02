import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const DEFAULT_TARGETS: typeof TARGETS = []

const PILLAR_KEYWORDS = [
  'api', 'authorization', 'idor', 'auth', 'token', 'session', 'oauth', 'sso',
  'permission', 'role', 'tenant', 'webhook', 'graphql', 'endpoint', 'scope added',
  'new asset', 'new target', 'ai', 'agent', 'ssrf', 'rce', 'xss', 'injection',
  'privilege', 'access control', 'cors', 'credential', 'secret', 'key',
]

function isRelevantChange(text: string): boolean {
  const lower = text.toLowerCase()
  return PILLAR_KEYWORDS.some(kw => lower.includes(kw))
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SecurityResearch/1.0)' },
    signal: AbortSignal.timeout(10000),
  })
  return res.text()
}

async function detectChanges(target: typeof TARGETS[0]) {
  const changes: any[] = []
  try {
    const html = await fetchPage(target.url)

    const { data: last } = await supabase
      .from('keen_program_snapshots')
      .select('content_hash, detected_at')
      .eq('program', target.name)
      .order('detected_at', { ascending: false })
      .limit(1)
      .single()

    const hash = Buffer.from(html).toString('base64').slice(0, 64)

    if (last && last.content_hash === hash) return changes

    await supabase.from('keen_program_snapshots').insert({
      program: target.name,
      url: target.url,
      content_hash: hash,
    })

    if (!last) return changes

    const announcementMatch = html.match(/announcement|update|new|added|removed|changed/gi) ?? []
    const scopeMatches = html.match(/in.scope|out.of.scope|target|asset/gi) ?? []

    if (announcementMatch.length > 0) {
      const summary = `${target.name} program page changed. Detected ${announcementMatch.length} update signals and ${scopeMatches.length} scope references. Check the program page for what changed.`
      if (isRelevantChange(html)) {
        changes.push({
          program: target.name,
          platform: target.platform,
          change_type: 'scope_added',
          summary,
          url: target.url,
        })
      }
    }
  } catch {}
  return changes
}

export async function POST(_req: NextRequest) {
  const allChanges: any[] = []

  const { data: userTargets } = await supabase
    .from('keen_monitored_programs')
    .select('*')

  const targets = userTargets ?? []

  for (const target of targets) {
    const changes = await detectChanges(target)
    allChanges.push(...changes)
  }

  if (allChanges.length > 0) {
    await supabase.from('keen_program_changes').insert(allChanges)
  }

  return NextResponse.json({ ok: true, changes: allChanges })
}
