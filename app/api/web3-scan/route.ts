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

const OPENROUTER_MODELS = [
  'qwen/qwen3-coder',
  'deepseek/deepseek-chat',
]

// ============================================================
// FEATURE 3: CONTEXT WINDOW WARNING
// ============================================================
const MAX_CODE_CHARS = 120000

// ============================================================
// FEATURE 1: COMPLETENESS CHECK
// ============================================================
function checkCompleteness(code: string): { complete: boolean; reason?: string; missing?: string[] } {
  const defined = new Set<string>()
  const used = new Set<string>()

  // Extract all identifiers that look like function calls or state variables
  const identifiers = code.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g) || []

  // Find function definitions
  const funcDefs = code.match(/function\s+([a-zA-Z_][a-zA-Z0-9_]*)/g) || []
  funcDefs.forEach(f => {
    const name = f.replace(/function\s+/, '')
    defined.add(name)
  })

  // Find modifier definitions
  const modDefs = code.match(/modifier\s+([a-zA-Z_][a-zA-Z0-9_]*)/g) || []
  modDefs.forEach(m => {
    const name = m.replace(/modifier\s+/, '')
    defined.add(name)
  })

  // Find variable declarations (state + local)
  const varDefs = code.match(/(?:uint|int|address|bool|string|bytes|mapping|mapping\s*\(|I[A-Z])[a-zA-Z0-9_]*\s+(?:private|public|internal|external|memory|calldata|storage|\s)*([a-zA-Z_][a-zA-Z0-9_]*)/g) || []
  varDefs.forEach(v => {
    const match = v.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*$/)
    if (match) defined.add(match[1])
  })

  // Find internal calls to functions that should be defined in the same contract
  const internalCallPattern = /(?:_[a-zA-Z][a-zA-Z0-9_]*|[a-z][a-zA-Z0-9_]*)\s*\(/g
  const calls = code.match(internalCallPattern) || []
  calls.forEach(c => {
    const name = c.replace(/\s*\($/, '')
    if (name.startsWith('_') || /^[a-z]/.test(name)) {
      used.add(name)
    }
  })

  // Known safe names (Solidity builtins, common OZ functions)
  const safe = new Set([
    'require', 'assert', 'revert', 'emit', 'return', 'if', 'else', 'for', 'while',
    'transfer', 'transferFrom', 'approve', 'balanceOf', 'totalSupply', 'allowance',
    'mint', 'burn', 'safeTransfer', 'safeTransferFrom', 'forceApprove',
    'keccak256', 'abi', 'encode', 'encodePacked', 'decode',
    'mulDiv', 'add', 'sub', 'mul', 'div', 'mod',
    'msg', 'sender', 'value', 'data', 'block', 'timestamp', 'number', 'chainid',
    'address', 'this', 'super', 'payable', 'new', 'delete', 'type',
    'console', 'log', 'vm', 'prank', 'deal', 'label', 'createSelectFork',
  ])

  const missing: string[] = []
  used.forEach(name => {
    if (!defined.has(name) && !safe.has(name)) {
      // Only flag if it looks like a custom internal function
      if (name.startsWith('_') && name.length > 2) {
        missing.push(name)
      }
    }
  })

  if (missing.length > 0) {
    return {
      complete: false,
      reason: `Detected ${missing.length} internal functions that are called but not defined in the pasted code. This usually means the input is a fragment, not a full contract.`,
      missing: missing.slice(0, 10),
    }
  }

  return { complete: true }
}

// ============================================================
// FEATURE 2: GITHUB FULL-FILE FETCH
// ============================================================
async function fetchAllSolFilesFromGitHub(repoUrl: string): Promise<{ path: string; content: string }[]> {
  const url = new URL(repoUrl)
  const parts = url.pathname.split('/').filter(Boolean)
  let owner = parts[0]
  let repo = parts[1]
  let branch = 'main'

  const treeIndex = parts.indexOf('tree')
  if (treeIndex !== -1 && parts.length > treeIndex + 1) {
    branch = parts[treeIndex + 1]
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  const resp = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  if (!resp.ok) throw new Error(`GitHub tree fetch failed: ${resp.status}`)

  const data = await resp.json()
  const solPaths: string[] = (data.tree || [])
    .filter((item: any) => item.type === 'blob' && item.path.endsWith('.sol'))
    .map((item: any) => item.path)

  const files: { path: string; content: string }[] = []
  for (const path of solPaths) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
    try {
      const rawResp = await fetch(rawUrl)
      if (rawResp.ok) {
        const content = await rawResp.text()
        files.push({ path, content })
      }
    } catch {
      // skip failed file
    }
  }

  return files
}

async function callOpenRouter(aiKey: string, userPrompt: string): Promise<Response> {
  let lastResp: Response | null = null

  for (const model of OPENROUTER_MODELS) {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiKey}`,
        'HTTP-Referer': 'https://24keen.vercel.app',
        'X-Title': '24keen Web3 Analyzer',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0,
        max_tokens: 8000,
      }),
      signal: AbortSignal.timeout(60000),
    })

    if (resp.ok) return resp

    const errText = await resp.text()
    console.log(`Model ${model} failed: ${resp.status} - ${errText}`)
    lastResp = resp
  }

  return lastResp as Response
}

export async function POST(req: NextRequest) {
  try {
    const { code, contractAddress, githubUrl, aiKey, aiProvider, jobId, assumeComplete } = await req.json()

    if (!aiKey) return NextResponse.json({ error: 'AI key required' }, { status: 400 })
    if (!code && !contractAddress && !githubUrl) {
      return NextResponse.json({ error: 'Provide code, contract address, or GitHub URL' }, { status: 400 })
    }

    let contractCode = code || ''
    let contractName = 'Unknown'
    let fetchedFiles: string[] = []

    // ============================================================
    // FEATURE 2: GITHUB FULL-FILE FETCH
    // ============================================================
    if (githubUrl && !code) {
      try {
        const files = await fetchAllSolFilesFromGitHub(githubUrl)
        if (files.length === 0) {
          return NextResponse.json({ error: 'No Solidity files found in repository' }, { status: 400 })
        }
        contractCode = files.map(f => `// ===== FILE: ${f.path} =====\n${f.content}`).join('\n\n')
        fetchedFiles = files.map(f => f.path)
        const repoParts = githubUrl.split('/')
        contractName = repoParts[repoParts.length - 1] || 'Unknown'
      } catch (e: any) {
        return NextResponse.json({ error: 'GitHub fetch failed: ' + e.message }, { status: 500 })
      }
    }

    if (contractAddress && !code && !githubUrl) {
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

    // ============================================================
    // FEATURE 3: CONTEXT WINDOW WARNING
    // ============================================================
    if (contractCode.length > MAX_CODE_CHARS && !assumeComplete) {
      return NextResponse.json({
        error: `Code is ${contractCode.length} characters, which exceeds the ${MAX_CODE_CHARS} character limit. Split it into smaller parts, or enable "Assume Complete" to force the scan.`,
        codeLength: contractCode.length,
        limit: MAX_CODE_CHARS,
        requiresOverride: true,
      }, { status: 413 })
    }

    // ============================================================
    // FEATURE 1: COMPLETENESS CHECK
    // ============================================================
    if (!assumeComplete) {
      const completeness = checkCompleteness(contractCode)
      if (!completeness.complete) {
        return NextResponse.json({
          error: completeness.reason,
          missingIdentifiers: completeness.missing,
          requiresOverride: true,
        }, { status: 422 })
      }
    }

    if (jobId) {
      await supabase.from('keen_web3_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', jobId)
    }

    const userPrompt = `Analyze this smart contract. Identify every attack signal. For each one show the exact exploitable chain.\n\nContract: ${contractName}\nAddress: ${contractAddress || 'not provided'}\n\nSource Code:\n${contractCode.slice(0, MAX_CODE_CHARS)}`

    let aiResp: Response

    if (aiProvider === 'gemini') {
      aiResp = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': aiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 8000 },
          }),
          signal: AbortSignal.timeout(120000),
        }
      )
    } else if (aiProvider === 'deepseek') {
      aiResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0,
          max_tokens: 8000,
        }),
        signal: AbortSignal.timeout(120000),
      })
    } else {
      aiResp = await callOpenRouter(aiKey, userPrompt)
    }

    if (!aiResp || !aiResp.ok) {
      const err = aiResp ? await aiResp.text() : 'No response from AI provider'
      if (jobId) await supabase.from('keen_web3_jobs').update({ status: 'error', error: err }).eq('id', jobId)
      return NextResponse.json({ error: 'AI error: ' + err }, { status: 500 })
    }

    const aiData = await aiResp.json()
    let rawText = '[]'

    if (aiProvider === 'gemini') {
      rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
    } else {
      rawText = aiData.choices?.[0]?.message?.content ?? '[]'
    }

    let signals: any[] = []
    try {
      const clean = rawText.replace(/```json|```/g, '').trim()
      signals = JSON.parse(clean)
      if (!Array.isArray(signals)) signals = []
    } catch {
      signals = []
    }

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

    return NextResponse.json({
      ok: true,
      signals,
      count: signals.length,
      contractName,
      fetchedFiles,
      codeLength: contractCode.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
