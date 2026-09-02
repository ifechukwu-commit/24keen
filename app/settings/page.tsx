'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function SettingsPage() {
  const [aiKey, setAiKeyState] = useState('')
  const [draftKey, setDraftKey] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const k = localStorage.getItem('keen_ai_key')
    if (k) setAiKeyState(k)
  }, [])

  function saveKey() {
    if (!draftKey.trim()) return
    localStorage.setItem('keen_ai_key', draftKey.trim())
    setAiKeyState(draftKey.trim())
    setDraftKey('')
    alert('AI key saved permanently.')
  }

  function deleteKey() {
    if (!confirm('Delete your AI key permanently?')) return
    localStorage.removeItem('keen_ai_key')
    setAiKeyState('')
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Image src="/logo.png" alt="24keen" width={96} height={96} style={{ objectFit: 'contain' }} />
        <div style={{ fontSize: 28, fontWeight: 900, color: '#cc0000', letterSpacing: 2, marginTop: 12 }}>24keen</div>
        <div style={{ fontSize: 11, color: '#333', letterSpacing: 3, marginTop: 4 }}>SECURITY RESEARCH WORKBENCH v1.0</div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <span className="label">AI KEY</span>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 12, lineHeight: 1.8 }}>
          Your key is saved only in your browser storage. It is never sent to any server except the AI provider you choose. The key remains saved permanently until you delete it.
        </div>

        {!aiKey ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type={visible ? 'text' : 'password'}
              value={draftKey}
              onChange={e => setDraftKey(e.target.value)}
              placeholder="Paste your AI API key here"
              onFocus={() => setVisible(true)}
              onBlur={() => setVisible(false)}
              style={{ flex: 1 }}
            />
            <button className="btn-primary" onClick={saveKey} style={{ width: 'auto', padding: '0 20px' }}>
              SAVE
            </button>
          </div>
        ) : (
          <div style={{ background: '#181818', border: '1px solid #1e0000', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: '#888' }}>
              {visible ? aiKey : aiKey.slice(0, 8) + '...[LOCKED]'}
            </span>
            <button className="btn-secondary" onClick={() => setVisible(v => !v)} style={{ width: 'auto', padding: '4px 12px', fontSize: 11 }}>
              {visible ? 'LOCK' : 'VIEW'}
            </button>
            <button className="btn-danger" onClick={deleteKey} style={{ fontSize: 11 }}>DELETE</button>
          </div>
        )}
      </div>

      <div>
        <span className="label">LEGAL</span>
        <div style={{ fontSize: 12, color: '#444', lineHeight: 1.9 }}>
          24keen is a security research tool. You are solely responsible for ensuring you are authorized to test any target. Never test systems you do not own or have explicit written permission to test. Unauthorized testing may be illegal in your jurisdiction.
        </div>
      </div>
    </div>
  )
}
