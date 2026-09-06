import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const SKIP = [
  'google-analytics', 'googletagmanager', 'doubleclick', 'facebook.com/tr',
  'hotjar', 'mixpanel', 'amplitude', 'segment.io', 'clarity.ms',
  '24keen.vercel.app', 'supabase.co',
]

export async function POST(req: NextRequest) {
  try {
    const capture = await req.json()
    if (SKIP.some(s => (capture.url || '').includes(s))) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    await supabase.from('keen_captures').insert({
      url: capture.url,
      method: capture.method,
      request_headers: capture.requestHeaders,
      request_body: capture.requestBody,
      response_status: capture.responseStatus,
      response_headers: capture.responseHeaders,
      response_body: capture.responseBody,
      timing_ms: capture.timingMs,
      captured_at: capture.capturedAt || new Date().toISOString(),
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
