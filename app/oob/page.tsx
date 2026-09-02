'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON!
)

export default function OOBPage() {
  const [callbacks, setCallbacks] = useState<any[]>([])

  useEffect(() => {
    supabase.from('keen_oob_callbacks').select('*').order('received_at', { ascending: false }).limit(100)
      .then(({ data }) => { if (data) setCallbacks(data) })

    const channel = supabase.channel('oob_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'keen_oob_callbacks' },
        payload => {
          setCallbacks(prev => [payload.new, ...prev])
          new Notification('OOB Ping Received', { body: 'Token: ' + payload.new.token + ' from ' + payload.new.source_ip })
        }
      ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0' }}>OOB Callbacks</div>
        <div style={{ fontSize: 12, color: '#444' }}>Live pings from SSRF and RCE detection probes. A callback confirms real external reach.</div>
      </div>

      {callbacks.length === 0 && (
        <div style={{ color: '#444', fontSize: 14, textAlign: 'center', padding: 40 }}>
          No callbacks yet. Run a scan with SSRF-capable endpoints to trigger OOB confirmation.
        </div>
      )}

      {callbacks.map(c => (
        <div key={c.id} style={{
          background: '#181818',
          border: '1px solid #880088',
          borderLeft: '4px solid #880088',
          borderRadius: 10,
          padding: 16,
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span className="badge badge-oob">CONFIRMED PING</span>
            <span style={{ fontSize: 11, color: '#333', marginLeft: 'auto' }}>{new Date(c.received_at).toLocaleString()}</span>
          </div>
          <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#aa00aa', marginBottom: 4 }}>Token: {c.token}</div>
          <div style={{ fontSize: 12, color: '#555' }}>Source IP: {c.source_ip}</div>
          {c.headers && <pre style={{ fontSize: 11, color: '#333', marginTop: 8, fontFamily: 'monospace' }}>{JSON.stringify(c.headers, null, 2).slice(0, 300)}</pre>}
        </div>
      ))}
    </div>
  )
}
