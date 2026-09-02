'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON!
)

interface Capture {
  id: string
  url: string
  method: string
  request_headers: Record<string, string>
  request_body: string | null
  response_status: number
  response_body: string
  timing_ms: number
  captured_at: string
}

export default function BrowserPage() {
  const [url, setUrl] = useState('https://')
  const [proxyUrl, setProxyUrl] = useState('')
  const [captures, setCaptures] = useState<Capture[]>([])
  const [selected, setSelected] = useState<Capture | null>(null)
  const [view, setView] = useState<'browser' | 'captured'>('browser')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const channel = supabase.channel('captures')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'keen_captures' },
        payload => setCaptures(prev => [payload.new as Capture, ...prev.slice(0, 99)])
      ).subscribe()
    supabase.from('keen_captures').select('*').order('captured_at', { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setCaptures(data as Capture[]) })
    return () => { supabase.removeChannel(channel) }
  }, [])

  function navigate() {
    let target = url.trim()
    if (!target.startsWith('http')) target = 'https://' + target
    setProxyUrl('/api/proxy?url=' + encodeURIComponent(target))
    setView('browser')
  }

  function sendToScan(cap: Capture) {
    const headers = cap.request_headers || {}
    const host = new URL(cap.url).host
    const path = new URL(cap.url).pathname + new URL(cap.url).search
    const raw = [
      `${cap.method} ${path} HTTP/1.1`,
      `Host: ${host}`,
      ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
      '',
      cap.request_body || '',
    ].join('\n')

    navigator.clipboard.writeText(raw).then(() => {
      alert('Request copied to clipboard. Go to Scan tab and click Import from Clipboard.')
    })
  }

  const SMAP: Record<number, string> = {}
  function statusColor(s: number) {
    if (s < 300) return '#22c55e'
    if (s < 400) return '#f59e0b'
    return '#cc0000'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '12px 16px', background: '#111', borderBottom: '1px solid #1e0000', display: 'flex', gap: 8 }}>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && navigate()}
          placeholder="Enter target URL and press Enter"
          style={{ flex: 1, height: 38, fontSize: 13 }}
        />
        <button className="btn-primary" onClick={navigate} style={{ width: 'auto', padding: '0 20px', height: 38 }}>GO</button>
        <button
          className="btn-secondary"
          onClick={() => setView(v => v === 'browser' ? 'captured' : 'browser')}
          style={{ width: 'auto', padding: '0 16px', height: 38, fontSize: 11, letterSpacing: 1 }}
        >
          {view === 'browser' ? `CAPTURED (${captures.length})` : 'BROWSER'}
        </button>
      </div>

      {view === 'browser' ? (
        proxyUrl ? (
          <iframe
            ref={iframeRef}
            src={proxyUrl}
            style={{ flex: 1, border: 'none', background: '#0a0a0a' }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 13, color: '#444', textAlign: 'center', maxWidth: 400, lineHeight: 1.8 }}>
              Enter the target URL above and tap GO. Browse the site normally. All requests are captured automatically including headers, cookies, and authorization tokens. Tap any captured request to send it to the scanner.
            </div>
          </div>
        )
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: 360, borderRight: '1px solid #1e0000', overflow: 'auto' }}>
            {captures.length === 0 ? (
              <div style={{ padding: 24, color: '#444', fontSize: 13 }}>No requests captured yet. Browse a site first.</div>
            ) : captures.map(cap => (
              <div
                key={cap.id}
                onClick={() => setSelected(cap)}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid #1a1a1a',
                  cursor: 'pointer',
                  background: selected?.id === cap.id ? '#1a0000' : 'transparent',
                  borderLeft: selected?.id === cap.id ? '3px solid #cc0000' : '3px solid transparent',
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#cc0000', letterSpacing: 1 }}>{cap.method}</span>
                  <span style={{ fontSize: 10, color: statusColor(cap.response_status), fontWeight: 700 }}>{cap.response_status}</span>
                  <span style={{ fontSize: 10, color: '#444', marginLeft: 'auto' }}>{cap.timing_ms}ms</span>
                </div>
                <div style={{ fontSize: 11, color: '#888', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cap.url.replace(/^https?:\/\//, '')}
                </div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {selected ? (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <button className="btn-primary" onClick={() => sendToScan(selected)} style={{ width: 'auto', padding: '8px 16px', fontSize: 11, letterSpacing: 1 }}>
                    SEND TO SCANNER
                  </button>
                </div>
                <div className="label">URL</div>
                <pre style={{ color: '#cc0000', fontSize: 12, fontFamily: 'monospace', marginBottom: 16, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{selected.url}</pre>
                <div className="label">REQUEST HEADERS</div>
                <pre className="card mono" style={{ marginBottom: 16, fontSize: 11, lineHeight: 1.7 }}>
                  {Object.entries(selected.request_headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n') || 'None captured'}
                </pre>
                {selected.request_body && (
                  <>
                    <div className="label">REQUEST BODY</div>
                    <pre className="card mono" style={{ marginBottom: 16, fontSize: 11, lineHeight: 1.7 }}>{selected.request_body}</pre>
                  </>
                )}
                <div className="label">RESPONSE ({selected.response_status})</div>
                <pre className="card mono" style={{ fontSize: 11, lineHeight: 1.7, maxHeight: 300, overflow: 'auto' }}>
                  {selected.response_body?.slice(0, 3000) || 'Empty'}
                </pre>
              </div>
            ) : (
              <div style={{ color: '#444', fontSize: 13, marginTop: 40, textAlign: 'center' }}>
                Select a captured request to view details and send to scanner
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
