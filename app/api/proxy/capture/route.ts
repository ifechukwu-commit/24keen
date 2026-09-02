import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const capture = await req.json()
    await supabase.from('keen_captures').insert({
      url: capture.url,
      method: capture.method,
      request_headers: capture.requestHeaders,
      request_body: capture.requestBody,
      response_status: capture.responseStatus,
      response_headers: capture.responseHeaders,
      response_body: capture.responseBody,
      timing_ms: capture.timing,
      captured_at: capture.capturedAt,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
