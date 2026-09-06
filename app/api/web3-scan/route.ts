import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const SYSTEM_PROMPT = `You are a senior smart contract security researcher with 20 years experience auditing DeFi protocols, bridges, and NFT contracts. Your job is to identify ATTACK SIGNALS — specific entry points and exploitable chains — not generic checklists.

For every signal you identify, you must provide:
1. The exact vulnerable code location
2. A realistic attack chain showing HOW an attacker exploits it step by step
3. What the attacker gains (funds drained, access gained, system broken)
4. What a human auditor should manually verify to confirm it is real
5. Your confidence that this is actually exploitable

Return a JSON array. Each item must have these exact fields:
- id: unique string
- severity: "critical" | "high" | "medium" | "low"
- category: one of these exact categories: "Access Control" | "IDOR/Authorization" | "Reentrancy" | "Business Logic" | "Accounting/Invariant" | "Oracle/Price Manipulation" | "Rounding/Precision" | "Signature/Replay" | "Token Integration" | "Unsafe External Call" | "Upgradeability" | "DeFi Economic Attack" | "DoS/Gas" | "Secrets/Key Exposure" | "Cross-Layer Chain"
- title: short precise title
- signal: what pattern in the code triggered this signal
- attackChain: step by step numbered list of exactly how an attacker exploits this
- evidence: the exact code lines that are vulnerable
- location: function name and approximate line
- impact: what the attacker gains — be specific about funds, access, or system damage
- humanVerification: exactly what a human auditor must check manually to confirm this is real before submitting
- confidence: "confirmed" | "probable" | "investigate"
- swc: SWC number string or null

Rules:
- Only flag cross-layer chains when the full exploitable chain actually exists in the code
- Do not flag theoretical issues without evidence in the actual code
- For accounting/invariant violations, show the exact invariant that breaks
- For reentrancy, show the exact call sequence
- For access control, show exactly who can call what they should not be able to call
- confidence "confirmed" means the code is definitely exploitable as written
- confidence "probable" means it is likely exploitable pending external context
- confidence "investigate" means it is worth a human look but not yet confirmed

Return ONLY valid JSON array. No markdown. No text outside the array.`

export async function POST(req: NextRequest) {
  try {
    const { code, contractAddress, aiKey, jobId } = await req.json()

    if (!aiKey) return NextResponse.json({ error: 'AI key required' }, { status: 400 })
    if (!code && !contractAddress) return NextResponse.json({ error: 'Provide code or contract address' }, { status: 400 })

    let contractCode = code
    let contractName = 'Unknown'

    if (contractAddress && !code) {
      try {
        const url = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}`
        const resp = await fetch(url, { signal: AbortSignal.timeout(15000) })
        const data = await resp.json()
        if (data.result?.[0]?.SourceCode) {
          contractCode = data.result[0].SourceCode
          contractName = data.result[0].ContractName || 'Unknown'
        } else {
          return NextResponse.json({ error: 'Contract source not found. Must be verified on Etherscan.' }, { status: 400 })
        }
      } catch (e: any) {
        return NextResponse.json({ error: 'Etherscan fetch failed: ' + e.message }, { status: 500 })
      }
    }

    if (!contractCode?.trim()) return NextResponse.json({ error: 'No contract code to analyze' }, { status: 400 })

    // Update job status in Supabase
    if (jobId) {
      await supabase.from('keen_web3_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', jobId)
    }

    const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Analyze this smart contract. Identify every attack signal. For each one show the exact exploitable chain.\n\nContract: ${contractName}\nAddress: ${contractAddress || 'not provided'}\n\nSource Code:\n${contractCode.slice(0, 100000)}`,
        }],
      }),
      signal: AbortSignal.timeout(120000),
    })

    if (!aiResp.ok) {
      const err = await aiResp.text()
      if (jobId) await supabase.from('keen_web3_jobs').update({ status: 'error', error: err }).eq('id', jobId)
      return NextResponse.json({ error: 'AI error: ' + err }, { status: 500 })
    }

    const aiData = await aiResp.json()
    const rawText = aiData.content?.[0]?.text ?? '[]'

    let signals: any[] = []
    try {
      const clean = rawText.replace(/```json|```/g, '').trim()
      signals = JSON.parse(clean)
      if (!Array.isArray(signals)) signals = []
    } catch {
      signals = []
    }

    // Store results in Supabase
    if (jobId && signals.length > 0) {
      await supabase.from('keen_web3_jobs').update({
        status: 'done',
        completed_at: new Date().toISOString(),
        signals_count: signals.length,
        results: signals,
      }).eq('id', jobId)
    } else if (jobId) {
      await supabase.from('keen_web3_jobs').update({ status: 'done', completed_at: new Date().toISOString(), signals_count: 0 }).eq('id', jobId)
    }

    return NextResponse.json({ ok: true, signals, count: signals.length, contractName })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
