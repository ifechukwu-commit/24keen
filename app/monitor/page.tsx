'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON!
)

interface MonitoredProgram {
  id: string
  name: string
  url: string
  platform: string
  target_types: string[]
}

interface ProgramChange {
  id: string
  program: string
  platform: string
  change_type: string
  summary: string
  detected_at: string
  url: string
}

const CHANGE_COLOR: Record<string, string> = {
  scope_added: '#cc0000',
  scope_removed: '#f59e0b',
  new_program: '#22c55e',
  announcement: '#880088',
  reward_change: '#dd4400',
}

const TARGET_TYPES = ['web', 'api', 'cloud', 'mobile', 'network', 'iot', 'blockchain']

export default function MonitorPage() {
  const [programs, setPrograms] = useState<MonitoredProgram[]>([])
  const [changes, setChanges] = useState<ProgramChange[]>([])
  const [checking, setChecking] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [platform, setPlatform] = useState('Bugcrowd')
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['web', 'api'])

  useEffect(() => {
    supabase.from('keen_monitored_programs').select('*').then(({ data }) => { if (data) setPrograms(data as MonitoredProgram[]) })
    supabase.from('keen_program_changes').select('*').order('detected_at', { ascending: false }).limit(100).then(({ data }) => { if (data) setChanges(data as ProgramChange[]) })

    const channel = supabase.channel('monitor_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'keen_program_changes' },
        payload => setChanges(prev => [payload.new as ProgramChange, ...prev])
      ).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function addProgram() {
    if (!name.trim() || !url.trim()) { alert('Name and URL required.'); return }
    const { data, error } = await supabase.from('keen_monitored_programs').insert({
      name: name.trim(), url: url.trim(), platform, target_types: selectedTypes
    }).select().single()
    if (error) { alert(error.message); return }
    if (data) setPrograms(prev => [...prev, data as MonitoredProgram])
    setName(''); setUrl('')
  }

  async function removeProgram(id: string) {
    await supabase.from('keen_monitored_programs').delete().eq('id', id)
    setPrograms(prev => prev.filter(p => p.id !== id))
  }

  async function checkNow() {
    setChecking(true)
    try {
      const res = await fetch('/api/monitor', { method: 'POST' })
      const data = await res.json()
      alert(data.changes?.length ? data.changes.length + ' changes detected.' : 'No new changes.')
    } catch (e: any) { alert('Check failed: ' + e.message) }
    finally { setChecking(false) }
  }

  function toggleType(t: string) {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0' }}>Program Monitor</div>
          <div style={{ fontSize: 12, color: '#444' }}>Add any bug bounty program. Get notified when scope changes or new targets are added.</div>
        </div>
        <button className="btn-primary" onClick={checkNow} disabled={checking} style={{ width: 'auto', padding: '10px 20px', opacity: checking ? 0.6 : 1 }}>
          {checking ? 'CHECKING...' : 'CHECK NOW'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <span className="label">ADD PROGRAM TO MONITOR</span>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Program name (e.g. Shopify)" style={{ flex: 1, minWidth: 140 }} />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Bugcrowd or Intigriti program URL" style={{ flex: 2, minWidth: 200 }} />
          <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ width: 120 }}>
            <option>Bugcrowd</option>
            <option>Intigriti</option>
            <option>HackerOne</option>
            <option>YesWeHack</option>
            <option>Immunefi</option>
          </select>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: 1 }}>FILTER BY TARGET TYPE:</span>
          {TARGET_TYPES.map(t => (
            <button key={t} onClick={() => toggleType(t)} style={{
              background: selectedTypes.includes(t) ? '#1a0000' : '#111',
              color: selectedTypes.includes(t) ? '#cc0000' : '#444',
              border: '1px solid ' + (selectedTypes.includes(t) ? '#cc0000' : '#222'),
              padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
            }}>{t.toUpperCase()}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={addProgram} style={{ marginTop: 12, width: 'auto', padding: '8px 20px', fontSize: 12 }}>
          ADD PROGRAM
        </button>
      </div>

      {programs.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <span className="label">MONITORED PROGRAMS ({programs.length})</span>
          <div style={{ marginTop: 8 }}>
            {programs.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#ccc' }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: '#444', marginLeft: 8 }}>{p.platform}</span>
                  <div style={{ fontSize: 11, color: '#333', fontFamily: 'monospace' }}>{p.url}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    {(p.target_types || []).map((t: string) => (
                      <span key={t} style={{ fontSize: 9, color: '#cc0000', background: '#1a0000', border: '1px solid #cc000044', borderRadius: 3, padding: '1px 6px', fontWeight: 700, letterSpacing: 0.5 }}>{t.toUpperCase()}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => removeProgram(p.id)} className="btn-danger" style={{ fontSize: 10 }}>REMOVE</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {changes.length === 0 && (
        <div style={{ color: '#444', fontSize: 14, textAlign: 'center', padding: 40, lineHeight: 1.8 }}>
          No changes detected yet. Add programs above then tap Check Now.
        </div>
      )}

      {changes.map(c => (
        <div key={c.id} style={{
          background: '#181818', border: '1px solid #1e0000',
          borderLeft: '4px solid ' + (CHANGE_COLOR[c.change_type] || '#cc0000'),
          borderRadius: 10, padding: 16, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span className="badge" style={{ background: (CHANGE_COLOR[c.change_type] || '#cc0000') + '22', color: CHANGE_COLOR[c.change_type] || '#cc0000' }}>
              {c.change_type.replace(/_/g, ' ').toUpperCase()}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#888' }}>{c.program}</span>
            <span style={{ fontSize: 11, color: '#333', marginLeft: 'auto' }}>{new Date(c.detected_at).toLocaleString()}</span>
          </div>
          <div style={{ fontSize: 14, color: '#ccc' }}>{c.summary}</div>
        </div>
      ))}
    </div>
  )
}
