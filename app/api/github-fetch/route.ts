import { NextRequest, NextResponse } from 'next/server'

async function fetchFilesFromDir(owner: string, repo: string, branch: string, dir: string): Promise<Array<{path: string, content: string}>> {
  const files: Array<{path: string, content: string}> = []
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${dir}?ref=${branch}`
  
  const resp = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!resp.ok) return files
  const contents = await resp.json()
  if (!Array.isArray(contents)) return files

  const solFiles = contents.filter((f: any) =>
    f.name.endsWith('.sol') &&
    !f.name.toLowerCase().includes('test') &&
    !f.name.toLowerCase().includes('mock')
  ).slice(0, 12)

  for (const file of solFiles) {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${dir}/${file.name}`
      let rawResp = await fetch(rawUrl, { signal: AbortSignal.timeout(8000) })

      if (!rawResp.ok) {
        const mirror = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${dir}/${file.name}`
        rawResp = await fetch(mirror, { signal: AbortSignal.timeout(8000) })
      }

      if (!rawResp.ok) continue
      const content = await rawResp.text()
      if (content.includes('pragma solidity')) {
        files.push({ path: `${dir}/${file.name}`, content })
      }
    } catch { continue }
  }

  return files
}

export async function POST(req: NextRequest) {
  try {
    const { repoUrl } = await req.json()
    if (!repoUrl) return NextResponse.json({ error: 'Repo URL required' }, { status: 400 })

    const url = new URL(repoUrl)
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 })

    const owner = parts[0]
    const repo = parts[1].replace('.git', '')
    let branch = 'main'
    const treeIndex = parts.indexOf('tree')
    if (treeIndex !== -1 && parts.length > treeIndex + 1) branch = parts[treeIndex + 1]

    const dirs = ['src', 'contracts', 'core', 'protocol', 'lib', 'sources']
    let allFiles: Array<{path: string, content: string}> = []

    for (const dir of dirs) {
      const files = await fetchFilesFromDir(owner, repo, branch, dir)
      allFiles = allFiles.concat(files)
      if (allFiles.length >= 8) break
    }

    if (allFiles.length === 0) {
      return NextResponse.json({ error: 'No Solidity files found. Check repo URL. Files must be in src/ or contracts/ directory.' }, { status: 404 })
    }

    const combined = allFiles.map(f => `// ===== FILE: ${f.path} =====\n${f.content}`).join('\n\n')

    return NextResponse.json({
      ok: true,
      files: allFiles.map(f => f.path),
      code: combined,
      repo: `${owner}/${repo}`,
      branch,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
