'use client'
import { useState, useEffect } from 'react'
import { generateFoundryPoC } from '../utils/pocGenerator'

const SMAP: Record<string, string> = {
  critical: '#cc0000', high: '#dd4400', medium: '#cc7700', low: '#555555'
}
const CONF_COLOR: Record<string, string> = {
  confirmed: '#22c55e', probable: '#f59e0b', investigate: '#888888'
}

export default function Web3Page() {
  const [inputMode, setInputMode] = useState<'code' | 'address' | 'github'>('code')
  const [code, setCode] = useState('')
  const [address, setAddress] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [commitHash, setCommitHash] = useState('')
  const [aiKey, setAiKey] = useState('')
  const [aiProvider, setAiProvider] = useState<'openrouter' | 'deepseek' | 'gemini'>('openrouter')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [signals, setSignals] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [status, setStatus] = useState('')
  const [filterSev, setFilterSev] = useState('all')
  const [contractName, setContractName] = useState('')
  const [fetchedFiles, setFetchedFiles] = useState<string[]>([])
  const [showPoC, setShowPoC] = useState(false)
  // FEATURE 4: Assume Complete toggle
  const [assumeComplete, setAssumeComplete] = useState(false)
  // FEATURE 3: Context warning
  const [contextWarning, setContextWarning] = useState('')
  const [incompleteWarning, setIncompleteWarning] = useState<{ reason: string; missing: string[] } | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('keen_signals')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSignals(parsed)
        setStatus('Restored ' + parsed.length + ' saved signals.')
      } catch {}
    }
    const savedContract = localStorage.getItem('keen_contract')
    if (savedContract) {
      try { setContractName(JSON.parse(savedContract)) } catch {}
    }
    const k = localStorage.getItem('keen_ai_key')
    if (k) setAiKey(k)
    const p = localStorage.getItem('keen_ai_provider')
    if (p) setAiProvider(p as any)
  }, [])

  useEffect(() => {
    if (signals.length > 0) {
      localStorage.setItem('keen_signals', JSON.stringify(signals))
      localStorage.setItem('keen_contract', JSON.stringify(contractName))
    }
  }, [signals])

  function saveProvider(p: string) {
    setAiProvider(p as any)
    localStorage.setItem('keen_ai_provider', p)
  }

  async function fetchFromGitHub() {
    if (!githubUrl.trim()) { alert('Enter GitHub repo URL first.'); return }
    setFetching(true)
    setStatus('Fetching Solidity files from GitHub...')
    try {
      const res = await fetch('/api/github-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: githubUrl, commitHash: commitHash || undefined }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCode(data.code)
      setFetchedFiles(data.files)
      setContractName(data.repo)
      setStatus('Fetched ' + data.files.length + ' contract files from ' + data.repo + '. Ready to analyze.')
      setInputMode('code')
    } catch (e: any) {
      alert('GitHub fetch error: ' + e.message)
      setStatus('')
    } finally {
      setFetching(false)
    }
  }

  async function handleScan() {
    if (!aiKey) { alert('Add your AI key in Settings first.'); return }
    if (inputMode === 'code' && !code.trim()) { alert('Paste or fetch contract code first.'); return }
    if (inputMode === 'address' && !address.trim()) { alert('Enter contract address.'); return }
    if (inputMode === 'github' && !githubUrl.trim()) { alert('Enter a GitHub URL.'); return }

    setLoading(true)
    setSignals([])
    setSelected(null)
    setContextWarning('')
    setIncompleteWarning(null)
    setStatus('Identifying attack signals — ' + aiProvider.toUpperCase() + ' analyzing all vulnerability classes...')

    try {
      const res = await fetch('/api/web3-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: inputMode === 'code' ? code : undefined,
          contractAddress: inputMode === 'address' ? address : undefined,
          githubUrl: inputMode === 'github' ? githubUrl : undefined,
          aiKey,
          aiProvider,
          assumeComplete,
        }),
      })

      const data = await res.json()

      if (res.status === 413) {
        setContextWarning(data.error + (data.codeLength ? ` (current: ${data.codeLength} chars)` : ''))
        setLoading(false)
        return
      }

      if (res.status === 422) {
        setIncompleteWarning({ reason: data.error, missing: data.missingIdentifiers || [] })
        setLoading(false)
        return
      }

      if (data.error) throw new Error(data.error)

      setSignals(data.signals || [])
      if (data.contractName && data.contractName !== 'Unknown') setContractName(data.contractName)
      if (data.fetchedFiles) setFetchedFiles(data.fetchedFiles)
      setStatus(data.count + ' attack signals identified. Review each one before submitting.')
    } catch (e: any) {
      alert('Analysis error: ' + e.message)
      setStatus('')
    } finally { setLoading(false) }
  }

  function clearSaved() {
    localStorage.removeItem('keen_signals')
    localStorage.removeItem('keen_contract')
    setSignals([])
    setSelected(null)
    setStatus('Cleared saved signals.')
  }

  const filtered = signals.filter(s => filterSev === 'all' || s.severity === filterSev)
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
  signals.forEach(s => { if (counts[s.severity] !== undefined) counts[s.severity]++ })

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{ width: 380, borderRight: '1px solid #1e0000', overflow: 'auto', padding: 20, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f0' }}>Web3 Analyzer</div>
          {signals.length > 0 && (
            <button onClick={clearSaved} style={{
              fontSize: 9, color: '#555', background: '#181818',
              border: '1px solid #222', padding: '4px 10px', borderRadius: 4, cursor: 'pointer'
            }}>
              CLEAR
            </button>
          )}
        </div>
        {contractName && <div style={{ fontSize: 11, color: '#cc0000', fontWeight: 700, marginBottom: 8 }}>{contractName}</div>}
        {fetchedFiles.length > 0 && (
          <div style={{ fontSize: 10, color: '#444', marginBottom: 8 }}>{fetchedFiles.join(' · ')}</div>
        )}

        <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
          {(['code', 'address', 'github'] as const).map(m => (
            <button key={m} onClick={() => setInputMode(m)} style={{
              flex: 1, minWidth: 60, padding: '6px 4px', borderRadius: 6, fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
              background: inputMode === m ? '#cc0000' : '#181818',
              color: inputMode === m ? 'white' : '#555',
              border: '1px solid ' + (inputMode === m ? '#cc0000' : '#222'),
            }}>
              {m === 'code' ? 'PASTE' : m === 'address' ? 'ADDRESS' : 'GITHUB'}
            </button>
          ))}
        </div>

        {inputMode === 'github' && (
          <>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#cc0000', letterSpacing: 2, marginBottom: 6 }}>GITHUB REPO URL</div>
            <input value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
              placeholder="https://github.com/owner/repo" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 11, color: '#444', marginBottom: 12 }}>
              Scans all .sol files in the repo directly. No manual paste needed.
            </div>
          </>
        )}

        {inputMode === 'code' && (
          <textarea rows={12} value={code} onChange={e => setCode(e.target.value)}
            placeholder={'pragma solidity ^0.8.0;\n\ncontract Vault {\n    // paste full source\n}'}
            style={{ resize: 'vertical', fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}
          />
        )}

        {inputMode === 'address' && (
          <>
            <input value={address} onChange={e => setAddress(e.target.value)}
              placeholder="0x... (verified on Etherscan)" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 11, color: '#444', marginBottom: 12 }}>Must be verified on Etherscan. Source fetched automatically.</div>
          </>
        )}

        <div style={{ fontSize: 10, fontWeight: 800, color: '#cc0000', letterSpacing: 2, marginBottom: 6 }}>AI PROVIDER</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {(['openrouter', 'deepseek', 'gemini'] as const).map(p => (
            <button key={p} onClick={() => saveProvider(p)} style={{
              flex: 1, padding: '6px 4px', borderRadius: 6, fontSize: 10, fontWeight: 800,
              background: aiProvider === p ? '#cc0000' : '#181818',
              color: aiProvider === p ? 'white' : '#555',
              border: '1px solid ' + (aiProvider === p ? '#cc0000' : '#222'),
            }}>{p.toUpperCase()}</button>
          ))}
        </div>

        {/* FEATURE 4: Assume Complete toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: '#888', marginBottom: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={assumeComplete} onChange={e => setAssumeComplete(e.target.checked)} />
          Assume code is complete (skip safety checks)
        </label>

        <button className="btn-primary" onClick={handleScan} disabled={loading}
          style={{ width: '100%', padding: 13, fontSize: 12, letterSpacing: 1, opacity: loading ? 0.6 : 1, marginBottom: 12 }}>
          {loading ? 'ANALYZING...' : 'IDENTIFY ATTACK SIGNALS'}
        </button>

        {/* FEATURE 3: Context warning */}
        {contextWarning && (
          <div style={{ padding: 10, background: '#1a1400', border: '1px solid #f59e0b55', borderRadius: 8, fontSize: 11, color: '#f59e0b', marginBottom: 12 }}>
            <strong>CONTEXT TOO LARGE</strong><br />
            {contextWarning}
          </div>
        )}

        {/* FEATURE 1: Incomplete warning */}
        {incompleteWarning && (
          <div style={{ padding: 10, background: '#1a0000', border: '1px solid #cc000055', borderRadius: 8, fontSize: 11, color: '#ff6666', marginBottom: 12 }}>
            <strong>INCOMPLETE CODE</strong><br />
            {incompleteWarning.reason}
            {incompleteWarning.missing.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 10, color: '#aa4444' }}>
                Missing: {incompleteWarning.missing.join(', ')}
              </div>
            )}
            <div style={{ marginTop: 6, fontSize: 10, color: '#888' }}>
              Enable "Assume Complete" to force the scan anyway.
            </div>
          </div>
        )}

        {status && (
          <div style={{ padding: 10, background: '#111', borderRadius: 8, border: '1px solid #1e0000', fontSize: 11, color: loading || fetching ? '#cc0000' : '#22c55e', textAlign: 'center', marginBottom: 12 }}>
            {status}
          </div>
        )}

        {signals.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              {Object.entries(counts).map(([sev, count]) => count > 0 && (
                <div key={sev} style={{ background: (SMAP[sev] || '#555') + '22', border: '1px solid ' + (SMAP[sev] || '#555'), borderRadius: 5, padding: '2px 8px', fontSize: 10, color: SMAP[sev] || '#555', fontWeight: 800 }}>
                  {count} {sev.toUpperCase()}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
              {['all', 'critical', 'high', 'medium', 'low'].map(s => (
                <button key={s} onClick={() => setFilterSev(s)} style={{
                  background: filterSev === s ? '#cc0000' : '#181818',
                  color: filterSev === s ? 'white' : '#555',
                  border: '1px solid ' + (filterSev === s ? '#cc0000' : '#222'),
                  padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                }}>{s.toUpperCase()}</button>
              ))}
            </div>
            {filtered.map((s, i) => (
              <div key={i} onClick={() => { setSelected(s); setShowPoC(false) }} style={{
                background: selected === s ? '#1a0000' : '#181818',
                border: '1px solid ' + (selected === s ? '#cc0000' : '#1e0000'),
                borderLeft: '4px solid ' + (SMAP[s.severity] || '#555'),
                borderRadius: 8, padding: 10, marginBottom: 6, cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: SMAP[s.severity] || '#555' }}>{s.severity?.toUpperCase()}</span>
                  <span style={{ fontSize: 9, color: CONF_COLOR[s.confidence] || '#888', fontWeight: 700 }}>{s.confidence?.toUpperCase()}</span>
                  {s.swc && <span style={{ fontSize: 9, color: '#333' }}>SWC-{s.swc}</span>}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f0f0' }}>{s.title}</div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{s.category}</div>
              </div>
            ))}
          </>
        )}
        {selected && (
          <div style={{ marginTop: 16, padding: 12, background: '#111', border: '1px solid #1e0000', borderRadius: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#cc0000', letterSpacing: 2, marginBottom: 8 }}>SUBMIT TO</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ background: (SMAP[selected.severity] || '#555') + '22', color: SMAP[selected.severity] || '#555', padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 800 }}>{selected.severity?.toUpperCase()}</span>
              <span style={{ background: (CONF_COLOR[selected.confidence] || '#888') + '22', color: CONF_COLOR[selected.confidence] || '#888', padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 800 }}>{selected.confidence?.toUpperCase()}</span>
              {selected.swc && <span style={{ fontSize: 11, color: '#444', background: '#181818', padding: '3px 10px', borderRadius: 4, border: '1px solid #222' }}>SWC-{selected.swc}</span>}
              <span style={{ fontSize: 11, color: '#555', marginLeft: 'auto' }}>{selected.category}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', marginBottom: 6 }}>{selected.title}</div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 20, fontFamily: 'monospace' }}>{selected.location}</div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button onClick={() => setShowPoC(false)} style={{
                flex: 1, padding: '8px', borderRadius: 6, fontSize: 11, fontWeight: 800, letterSpacing: 1,
                background: !showPoC ? '#cc0000' : '#181818', color: !showPoC ? 'white' : '#555',
                border: '1px solid ' + (!showPoC ? '#cc0000' : '#222'),
              }}>SIGNAL REPORT</button>
              <button onClick={() => setShowPoC(true)} style={{
                flex: 1, padding: '8px', borderRadius: 6, fontSize: 11, fontWeight: 800, letterSpacing: 1,
                background: showPoC ? '#cc0000' : '#181818', color: showPoC ? 'white' : '#555',
                border: '1px solid ' + (showPoC ? '#cc0000' : '#222'),
              }}>FOUNDRY POC</button>
            </div>

            {!showPoC ? (
              <>
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
                      borderRadius: 8, padding: 12, fontSize: mono ? 12 : 13,
                      fontFamily: mono ? 'monospace' : 'inherit',
                      lineHeight: 1.8, color: color || '#ccc',
                      wordBreak: 'break-all', whiteSpace: 'pre-wrap', maxHeight: 280, overflow: 'auto',
                    }}>{val}</pre>
                  </div>
                ))}
                <button className="btn-primary" onClick={() => {
                  const r = `SMART CONTRACT SECURITY FINDING\n\nTitle: ${selected.title}\nSeverity: ${selected.severity?.toUpperCase()}\nCategory: ${selected.category}\nConfidence: ${selected.confidence?.toUpperCase()}\n${selected.swc ? 'SWC: SWC-' + selected.swc : ''}\nLocation: ${selected.location}\n\nATTACK SIGNAL\n${selected.signal}\n\nVULNERABLE CODE\n${selected.evidence}\n\nATTACK CHAIN\n${selected.attackChain}\n\nIMPACT\n${selected.impact}\n\nHUMAN VERIFICATION REQUIRED\n${selected.humanVerification}`
                  navigator.clipboard.writeText(r).then(() => alert('Report copied.'))
                }} style={{ width: '100%', padding: 14, fontSize: 13, letterSpacing: 1 }}>
                  COPY REPORT
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#cc0000', letterSpacing: 2, marginBottom: 8 }}>FOUNDRY POC SKELETON</div>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 12, lineHeight: 1.7 }}>
                  Copy this test, fill in the contract imports and addresses from the scope, run forge test. If the test passes you have a working exploit proof. Then submit with this as your PoC.
                </div>
                <pre style={{
                  background: '#181818', border: '1px solid #1e0000', borderRadius: 8, padding: 16,
                  fontSize: 11, fontFamily: 'monospace', lineHeight: 1.7, color: '#88cc88',
                  wordBreak: 'break-all', whiteSpace: 'pre-wrap', maxHeight: 500, overflow: 'auto',
                }}>{generateFoundryPoC(selected)}</pre>
                <button className="btn-primary" onClick={() => {
                  navigator.clipboard.writeText(generateFoundryPoC(selected)).then(() => alert('Foundry PoC copied.'))
                }} style={{ width: '100%', padding: 14, fontSize: 13, letterSpacing: 1, marginTop: 12 }}>
                  COPY FOUNDRY POC
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
