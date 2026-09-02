'use client'
import { useState } from 'react'
import Image from 'next/image'

export default function ScanPage() {
  const [request, setRequest] = useState('')
  const [scope, setScope] = useState('')
  const [rateLimit, setRateLimit] = useState('250')
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [sessionId, setSessionId] = useState('')

  async function handleScan() {
    if (!request.trim()) { alert('Paste a request first.'); return }
    if (!scope.trim()) { alert('Paste the program brief first.'); return }
    if (!authorized) { alert('Confirm authorization first.'); return }

    setLoading(true)
    setStatus('Starting scan...')

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request, scope, rateLimit: parseInt(rateLimit) || 250 }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSessionId(data.sessionId)
      setStatus('Done. ' + (data.findings ?? 0) + ' findings. Check Findings tab.')
    } catch (e: any) {
      alert('Scan error: ' + e.message)
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  async function importClipboard() {
    try {
      const text = await navigator.clipboard.readText()
      if (text) { setRequest(text); setStatus('Imported from clipboard.') }
      else alert('Nothing in clipboard.')
    } catch {
      alert('Clipboard access denied. Paste manually.')
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Image src="/logo.png" alt="24keen" width={48} height={48} style={{ objectFit: 'contain' }} />
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#cc0000', letterSpacing: -0.5 }}>24keen</div>
          <div style={{ fontSize: 11, color: '#444', letterSpacing: 2 }}>SECURITY RESEARCH WORKBENCH</div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <span className="label">REQUEST</span>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>Paste from browser dev tools, or use the Browser tab to capture automatically with full headers and cookies.</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button className="btn-secondary" onClick={importClipboard} style={{ fontSize: 11, letterSpacing: 1, padding: '6px 12px', width: 'auto' }}>
            IMPORT FROM CLIPBOARD
          </button>
        </div>
        <textarea
          rows={8}
          value={request}
          onChange={e => setRequest(e.target.value)}
          placeholder={'GET /api/v1/users/123 HTTP/1.1\nHost: target.com\nAuthorization: Bearer your-token\nCookie: session=your-session\nContent-Type: application/json'}
          style={{ resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <span className="label">PROGRAM BRIEF</span>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>Paste the full program scope page. App extracts scope, email, headers, and blockers automatically.</div>
        <textarea
          rows={4}
          value={scope}
          onChange={e => setScope(e.target.value)}
          placeholder={'In-scope: api.target.com\nOut-of-scope: support.target.com\nEmail: @bugcrowdninja.com required'}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <span className="label">RATE LIMIT (MS BETWEEN CHECKS)</span>
        <input
          type="number"
          value={rateLimit}
          onChange={e => setRateLimit(e.target.value)}
          placeholder="250 = 4 per second. 200 = 5 per second."
          style={{ maxWidth: 300 }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <input
          type="checkbox"
          id="auth"
          checked={authorized}
          onChange={e => setAuthorized(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: '#cc0000' }}
        />
        <label htmlFor="auth" style={{ fontSize: 14, color: '#888', cursor: 'pointer' }}>
          I am authorized to test this target
        </label>
      </div>

      <button
        className="btn-primary"
        onClick={handleScan}
        disabled={loading}
        style={{
          width: '100%',
          padding: 16,
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Image src="/scan-icon.png" alt="scan" width={24} height={24} style={{ objectFit: 'contain' }} />
        {loading ? 'RUNNING CHECKS...' : 'FIRE ALL CHECKS'}
      </button>

      {status && (
        <div style={{
          marginTop: 16,
          padding: 12,
          background: '#111',
          borderRadius: 8,
          border: '1px solid #1e0000',
          fontSize: 13,
          color: loading ? '#cc0000' : '#22c55e',
          textAlign: 'center',
        }}>
          {status}
          {sessionId && !loading && (
            <a href="/findings" style={{ color: '#cc0000', marginLeft: 12, fontWeight: 700, textDecoration: 'none' }}>
              VIEW FINDINGS
            </a>
          )}
        </div>
      )}
    </div>
  )
}
