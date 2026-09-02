'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON!
)

const SMAP: Record<string, string> = {
  critical: '#cc0000', high: '#dd4400', medium: '#cc7700', low: '#555555'
}

export default function ReportPage() {
  const params = useParams()
  const id = params?.id as string
  const [finding, setFinding] = useState<any>(null)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiKey, setAiKeyLocal] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('keen_ai_key')
    if (stored) setAiKeyLocal(stored)
    if (id) {
      supabase.from('keen_findings').select('*').eq('id', id).single()
        .then(({ data }) => { if (data) setFinding(data) })
    }
  }, [id])

  async function generateReport() {
    if (!aiKey) { alert('Add your AI key in Settings first.'); return }
    setAiLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': aiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          temperature: 0,
          messages: [{
            role: 'user',
            content: 'You are a strict bug bounty report writer. Zero hallucination. Plain text only. No markdown. No asterisks. No dashes. No headers with pound signs.\n\nFinding: ' + finding.check_name + '\nSeverity: ' + finding.severity + '\nEndpoint: ' + finding.endpoint + '\nPayload: ' + finding.payload + '\nBaseline diff: ' + finding.baseline_diff + '\nEvidence: ' + JSON.stringify(finding.evidence) + '\nOOB confirmed: ' + finding.oob_confirmed + '\n\nWrite a complete bug bounty submission report using these sections as plain text labels:\n\nVulnerable Component\nExpected Behavior\nActual Behavior\nReproduction Steps\nSecurity Impact\nRecommended Fix\n\nUnder 300 words. Only describe what the evidence proves. No speculation.',
          }],
        }),
      })
      const data = await res.json()
      setAiText(data.content?.[0]?.text ?? 'No response from AI.')
    } catch (e: any) {
      alert('AI error: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  function copyReport() {
    navigator.clipboard.writeText(aiText).then(() => alert('Report copied to clipboard.'))
  }

  if (!finding) return <div style={{ padding: 40, color: '#444' }}>Loading...</div>

  const color = SMAP[finding.severity] || '#555'

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <div style={{ height: 3, background: color, borderRadius: 2, marginBottom: 20 }} />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <span className="badge" style={{ background: color + '22', color }}>{finding.severity.toUpperCase()}</span>
        {finding.oob_confirmed && <span className="badge badge-oob">OOB CONFIRMED</span>}
        <span style={{ fontSize: 11, color: finding.confidence === 'high' ? '#22c55e' : '#f59e0b' }}>
          {finding.confidence} confidence
        </span>
      </div>

      <div style={{ fontSize: 24, fontWeight: 700, color: '#f0f0f0', marginBottom: 20 }}>{finding.check_name}</div>

      {[
        ['ENDPOINT', finding.endpoint],
        ['PAYLOAD', finding.payload],
        ['BASELINE DIFF', finding.baseline_diff],
        ['RAW EVIDENCE', JSON.stringify(finding.evidence, null, 2)],
      ].map(([label, val]) => (
        <div key={label} style={{ marginBottom: 20 }}>
          <span className="label">{label}</span>
          <pre style={{
            background: '#181818',
            border: '1px solid #1e0000',
            borderRadius: 8,
            padding: 12,
            fontSize: 11,
            fontFamily: 'monospace',
            lineHeight: 1.7,
            color: '#ccc',
            wordBreak: 'break-all',
            whiteSpace: 'pre-wrap',
            maxHeight: 200,
            overflow: 'auto',
          }}>{val}</pre>
        </div>
      ))}

      <button
        className="btn-primary"
        onClick={generateReport}
        disabled={aiLoading}
        style={{ width: '100%', padding: 14, fontSize: 13, letterSpacing: 1, opacity: aiLoading ? 0.6 : 1 }}
      >
        {aiLoading ? 'GENERATING REPORT...' : 'GENERATE AI REPORT DRAFT'}
      </button>

      {aiText && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="label">AI REPORT DRAFT</span>
            <button className="btn-secondary" onClick={copyReport} style={{ width: 'auto', padding: '6px 12px', fontSize: 11, letterSpacing: 1 }}>
              COPY
            </button>
          </div>
          <div style={{
            background: '#181818',
            border: '1px solid #1e0000',
            borderRadius: 8,
            padding: 16,
            fontSize: 14,
            lineHeight: 1.8,
            color: '#ddd',
            whiteSpace: 'pre-wrap',
          }}>{aiText}</div>
        </div>
      )}
    </div>
  )
}
