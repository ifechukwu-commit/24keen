'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON!
)

interface Finding {
  id: string
  check_name: string
  severity: string
  confidence: string
  endpoint: string
  payload: string
  baseline_diff: string
  oob_confirmed: boolean
  evidence: any
  status: string
  created_at: string
  session_id: string
}

const SMAP: Record<string, string> = {
  critical: '#cc0000', high: '#dd4400', medium: '#cc7700', low: '#555555'
}

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadFindings()
    const channel = supabase.channel('findings_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'keen_findings' },
        payload => setFindings(prev => [payload.new as Finding, ...prev])
      ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadFindings() {
    const { data } = await supabase.from('keen_findings').select('*').order('created_at', { ascending: false }).limit(200)
    if (data) setFindings(data as Finding[])
    setLoading(false)
  }

  async function endProgram(sessionId: string) {
    if (!confirm('Delete all data for this session permanently?')) return
    await supabase.from('keen_sessions').delete().eq('id', sessionId)
    setFindings(prev => prev.filter(f => f.session_id !== sessionId))
  }

  const filtered = filter === 'all' ? findings : findings.filter(f => f.severity === filter)

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0' }}>Findings</div>
          <div style={{ fontSize: 12, color: '#444' }}>{filtered.length} results</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'critical', 'high', 'medium', 'low'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? '#cc0000' : '#181818',
                color: filter === f ? 'white' : '#555',
                border: '1px solid ' + (filter === f ? '#cc0000' : '#1e0000'),
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ color: '#444' }}>Loading...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ color: '#444', fontSize: 14, padding: 40, textAlign: 'center', lineHeight: 1.8 }}>
          No findings yet. Run a scan on the Scan tab first. Make sure you paste a real authenticated request with valid cookies and authorization headers.
        </div>
      )}

      {filtered.map(f => (
        <div key={f.id} style={{
          background: '#181818',
          border: '1px solid #1e0000',
          borderLeft: '4px solid ' + (SMAP[f.severity] || '#555'),
          borderRadius: 10,
          padding: 16,
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: (SMAP[f.severity] || '#555') + '22', color: SMAP[f.severity] || '#555' }}>
              {f.severity.toUpperCase()}
            </span>
            {f.oob_confirmed && <span className="badge badge-oob">OOB CONFIRMED</span>}
            <span style={{ fontSize: 11, color: f.confidence === 'high' ? '#22c55e' : '#f59e0b' }}>
              {f.confidence} confidence
            </span>
            <span style={{ fontSize: 11, color: '#333', marginLeft: 'auto' }}>
              {new Date(f.created_at).toLocaleTimeString()}
            </span>
          </div>

          <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f0', marginBottom: 6 }}>{f.check_name}</div>
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#666', marginBottom: 6, wordBreak: 'break-all' }}>{f.endpoint}</div>
          <div style={{ fontSize: 12, color: '#555' }}>{f.baseline_diff}</div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Link href={'/report/' + f.id} style={{
              fontSize: 11, fontWeight: 700, color: '#cc0000', letterSpacing: 1,
              textDecoration: 'none', padding: '4px 10px', border: '1px solid #cc0000', borderRadius: 4,
            }}>
              VIEW REPORT
            </Link>
            <button
              onClick={() => endProgram(f.session_id)}
              className="btn-danger"
              style={{ fontSize: 10, letterSpacing: 1 }}
            >
              END SESSION
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
