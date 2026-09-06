'use client'
import { useState, useEffect } from 'react'

const SMAP: Record<string, string> = {
  critical: '#cc0000', high: '#dd4400', medium: '#cc7700', low: '#555555'
}

const CONF_COLOR: Record<string, string> = {
  confirmed: '#22c55e', probable: '#f59e0b', investigate: '#888888'
}

const PLATFORMS = [
  { name: 'Immunefi', url: 'https://immunefi.com/explore/' },
  { name: 'Hats Finance', url: 'https://app.hats.finance/vulnerability' },
  { name: 'Code4rena', url: 'https://code4rena.com/audits' },
  { name: 'Sherlock', url: 'https://www.sherlock.xyz/contests' },
]

export default function Web3Page() {
  const [mode, setMode] = useState<'code' | 'address'>('code')
  const [code, setCode] = useState('')
  const [address, setAddress] = useState('')
  const [aiKey, setAiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [signals, setSignals] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [status, setStatus] = useState('')
  const [filterSev, setFilterSev] = useState('all')
  const [filterConf, setFilterConf] = useState('all')
  const [contractName, setContractName] = useState('')

  useEffect(() => {
    const k = localStorage.getItem('keen_ai_key')
    if (k) setAiKey(k)
  }, [])

  async function handleScan() {
    if (!aiKey) { alert('Add your AI key in Settings first.'); return }
    if (mode === 'code' && !code.trim()) { alert('Paste Solidity code first.'); return }
    if (mode === 'address' && !address.trim()) { alert('Enter contract address first.'); return }

    setLoading(true)
    setSignals([])
    setSelected(null)
    setContractName('')
    setStatus('Identifying attack signals across all vulnerability classes...')

    try {
      const res = await fetch('/api/web3-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: mode === 'code' ? code : undefined,
          contractAddress: mode === 'address' ? address : undefined,
          aiKey,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSignals(data.signals || [])
      setContractName(data.contractName || '')
      setStatus(data.count + ' attack signals identified. Review each one and validate manually before submitting.')
    } catch (e: any) {
      alert('Analysis error: ' + e.message)
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  const filtered = signals.filter(s => {
    if (filterSev !== 'all' && s.severity !== filterSev) return false
    if (filterConf !== 'all' && s.confidence !== filterConf) return false
    return true
  })

  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  signals.forEach(s => { if (counts[s.severity as keyof typeof counts] !== undefined) counts[s.severity as keyof typeof counts]++ })

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{ width: 400, borderRight: '1px solid #1e0000', overflow: 'auto', padding: 20, flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', marginBottom: 4 }}>Web3 Analyzer</div>
        <div style={{ fontSize: 12, color: '#444', marginBottom: 4, lineHeight: 1.7 }}>
          Attack signal layer. Identifies exploitable chains for human validation. Not a checklist.
        </div>
        {contractName && <div style={{ fontSize: 12, color: '#cc0000', fontWeight: 700, marginBottom: 12 }}>{contractName}</div>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['code', 'address'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '8px', borderRadius: 8, fontSize: 11, fontWeight: 800, letterSpacing: 1,
              background: mode === m ? '#cc0000' : '#181818',
              color: mode === m ? 'white' : '#555',
              border: '1px solid ' + (mode === m ? '#cc0000' : '#222'),
            }}>
              {m === 'code' ? 'PASTE CODE' : 'ETHERSCAN ADDRESS'}
            </button>
          ))}
        </div>

        {mode === 'code' ? (
          <textarea rows={14} value={code} onChange={e => setCode(e.target.value)}
            placeholder={'// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract Vault {\n    // paste full contract source here\n}'}
            style={{ resize: 'vertical', fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}
          />
        ) : (
          <>
            <input value={address} onChange={e => setAddress(e.target.value)}
              placeholder="0x... (verified on Etherscan)" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 11, color: '#444', marginBottom: 12, lineHeight: 1.7 }}>
              Must be verified on Etherscan. Source code is fetched automatically.
            </div>
          </>
        )}

        <button className="btn-primary" onClick={handleScan} disabled={loading}
          style={{ width: '100%', padding: 14, fontSize: 13, letterSpacing: 1, opacity: loading ? 0.6 : 1, marginBottom: 12 }}>
          {loading ? 'ANALYZING ATTACK SURFACE...' : 'IDENTIFY ATTACK SIGNALS'}
        </button>

        {status && (
          <div style={{ padding: 10, background: '#111', borderRadius: 8, border: '1px solid #1e0000', fontSize: 12, color: loading ? '#cc0000' : '#22c55e', textAlign: 'center', marginBottom: 12 }}>
            {status}
          </div>
        )}

        {signals.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {Object.entries(counts).map(([sev, count]) => count > 0 && (
                <div key={sev} style={{ background: (SMAP[sev] || '#555') + '22', border: '1px solid ' + (SMAP[sev] || '#555'), borderRadius: 6, padding: '3px 8px', fontSize: 10, color: SMAP[sev] || '#555', fontWeight: 800 }}>
                  {count} {sev.toUpperCase()}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
              {['all', 'critical', 'high', 'medium', 'low'].map(s => (
                <button key={s} onClick={() => setFilterSev(s)} style={{
                  background: filterSev === s ? '#cc0000' : '#181818',
                  color: filterSev === s ? 'white' : '#555',
                  border: '1px solid ' + (filterSev === s ? '#cc0000' : '#222'),
                  padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800, letterSpacing: 0.5,
                }}>{s.toUpperCase()}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
              {['all', 'confirmed', 'probable', 'investigate'].map(c => (
                <button key={c} onClick={() => setFilterConf(c)} style={{
                  background: filterConf === c ? (CONF_COLOR[c] || '#888') : '#181818',
                  color: filterConf === c ? 'white' : '#555',
                  border: '1px solid ' + (filterConf === c ? (CONF_COLOR[c] || '#888') : '#222'),
                  padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800, letterSpacing: 0.5,
                }}>{c.toUpperCase()}</button>
              ))}
            </div>
            {filtered.map((s, i) => (
              <div key={i} onClick={() => setSelected(s)} style={{
                background: selected === s ? '#1a0000' : '#181818',
                border: '1px solid ' + (selected === s ? '#cc0000' : '#1e0000'),
                borderLeft: '4px solid ' + (SMAP[s.severity] || '#555'),
                borderRadius: 8, padding: 10, marginBottom: 6, cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: SMAP[s.severity] || '#555' }}>{s.severity?.toUpperCase()}</span>
                  <span style={{ fontSize: 9, color: CONF_COLOR[s.confidence] || '#888', fontWeight: 700 }}>{s.confidence?.toUpperCase()}</span>
                  {s.swc && <span style={{ fontSize: 9, color: '#333' }}>SWC-{s.swc}</span>}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f0f0' }}>{s.title}</div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{s.category} · {s.location}</div>
              </div>
            ))}
          </>
        )}

        <div style={{ marginTop: 20, padding: 12, background: '#111', border: '1px solid #1e0000', borderRadius: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#cc0000', letterSpacing: 2, marginBottom: 8 }}>SUBMIT TO</div>
          {PLATFORMS.map(p => (
            <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer" style={{
              display: 'block', fontSize: 11, color: '#555', padding: '5px 0',
              borderBottom: '1px solid #1a1a1a', textDecoration: 'none',
            }}>{p.name}</a>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {!selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ fontSize: 13, color: '#333', textAlign: 'center', maxWidth: 500, lineHeight: 2 }}>
              This is an attack signal layer, not a checklist. Each signal shows you a specific exploitable chain — entry point, attack steps, what the attacker gains, and what YOU need to manually verify before submitting. You are the final judge. The tool is your experienced second set of eyes.
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 720 }}>
            <div style={{ height: 3, background: SMAP[selected.severity] || '#555', borderRadius: 2, marginBottom: 20 }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ background: (SMAP[selected.severity] || '#555') + '22', color: SMAP[selected.severity] || '#555', padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 800 }}>
                {selected.severity?.toUpperCase()}
              </span>
              <span style={{ background: (CONF_COLOR[selected.confidence] || '#888') + '22', color: CONF_COLOR[selected.confidence] || '#888', padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 800 }}>
                {selected.confidence?.toUpperCase()}
              </span>
              {selected.swc && <span style={{ fontSize: 11, color: '#444', background: '#181818', padding: '3px 10px', borderRadius: 4, border: '1px solid #222' }}>SWC-{selected.swc}</span>}
              <span style={{ fontSize: 11, color: '#555', marginLeft: 'auto' }}>{selected.category}</span>
            </div>

            <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', marginBottom: 6 }}>{selected.title}</div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 20, fontFamily: 'monospace' }}>{selected.location}</div>

            {[
              { label: 'ATTACK SIGNAL', val: selected.signal, mono: false },
              { label: 'VULNERABLE CODE', val: selected.evidence, mono: true, color: '#ff6666' },
              { label: 'ATTACK CHAIN', val: selected.attackChain, mono: false },
              { label: 'IMPACT', val: selected.impact, mono: false },
              { label: 'HUMAN VERIFICATION REQUIRED', val: selected.humanVerification, mono: false, highlight: true },
            ].map(({ label, val, mono, color, highlight }) => val && (
              <div key={label} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: highlight ? '#f59e0b' : '#cc0000', letterSpacing: 2, marginBottom: 6 }}>{label}</div>
                <pre style={{
                  background: highlight ? '#1a1400' : '#181818',
                  border: '1px solid ' + (highlight ? '#f59e0b44' : '#1e0000'),
                  borderRadius: 8, padding: 12,
                  fontSize: mono ? 12 : 13,
                  fontFamily: mono ? 'monospace' : 'inherit',
                  lineHeight: 1.8, color: color || '#ccc',
                  wordBreak: 'break-all', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto',
                }}>{val}</pre>
              </div>
            ))}

            <button className="btn-primary" onClick={() => {
              const report = `SMART CONTRACT SECURITY FINDING\n\nTitle: ${selected.title}\nSeverity: ${selected.severity?.toUpperCase()}\nCategory: ${selected.category}\nConfidence: ${selected.confidence?.toUpperCase()}\n${selected.swc ? 'SWC: SWC-' + selected.swc : ''}\nLocation: ${selected.location}\n\nATTACK SIGNAL\n${selected.signal}\n\nVULNERABLE CODE\n${selected.evidence}\n\nATTACK CHAIN\n${selected.attackChain}\n\nIMPACT\n${selected.impact}\n\nHUMAN VERIFICATION\n${selected.humanVerification}`
              navigator.clipboard.writeText(report).then(() => alert('Report copied to clipboard.'))
            }} style={{ width: '100%', padding: 14, fontSize: 13, letterSpacing: 1 }}>
              COPY REPORT
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
