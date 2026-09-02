import { NextRequest, NextResponse } from 'next/server'

const INJECTION_SCRIPT = `
<script>
(function() {
  const KEEN_ORIGIN = window.location.origin;
  const captured = [];

  function sendCapture(data) {
    fetch(KEEN_ORIGIN + '/api/proxy/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(() => {});
  }

  const origFetch = window.fetch;
  window.fetch = function(input, init = {}) {
    const url = typeof input === 'string' ? input : input.url;
    const method = init.method || 'GET';
    const reqHeaders = init.headers || {};
    const reqBody = init.body || null;
    const startTime = Date.now();

    return origFetch.apply(this, arguments).then(resp => {
      const clone = resp.clone();
      clone.text().then(body => {
        const respHeaders = {};
        resp.headers.forEach((v, k) => { respHeaders[k] = v; });
        sendCapture({
          url,
          method,
          requestHeaders: typeof reqHeaders === 'object' ? reqHeaders : {},
          requestBody: typeof reqBody === 'string' ? reqBody : null,
          responseStatus: resp.status,
          responseHeaders: respHeaders,
          responseBody: body.slice(0, 5000),
          timing: Date.now() - startTime,
          capturedAt: new Date().toISOString(),
        });
      });
      return resp;
    });
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._keenMethod = method;
    this._keenUrl = url;
    this._keenHeaders = {};
    this._keenStart = Date.now();
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.setRequestHeader = function(key, value) {
    if (this._keenHeaders) this._keenHeaders[key] = value;
    return origSetHeader.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    this.addEventListener('load', () => {
      sendCapture({
        url: this._keenUrl,
        method: this._keenMethod,
        requestHeaders: this._keenHeaders || {},
        requestBody: typeof body === 'string' ? body : null,
        responseStatus: this.status,
        responseHeaders: {},
        responseBody: this.responseText?.slice(0, 5000) || '',
        timing: Date.now() - (this._keenStart || 0),
        capturedAt: new Date().toISOString(),
      });
    });
    return origSend.apply(this, arguments);
  };
})();
</script>
`

export async function GET(req: NextRequest) {
  const targetUrl = req.nextUrl.searchParams.get('url')
  if (!targetUrl) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': req.headers.get('user-agent') || 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      redirect: 'follow',
    })

    const contentType = upstream.headers.get('content-type') || ''
    let body = await upstream.text()

    if (contentType.includes('text/html')) {
      body = body.replace('<head>', '<head>' + INJECTION_SCRIPT)
      const base = new URL(targetUrl)
      body = body.replace(/<base[^>]*>/gi, '')
      body = body.replace('<head>', `<head><base href="${base.origin}/">`)
    }

    const headers = new Headers()
    headers.set('Content-Type', contentType || 'text/html')
    headers.set('X-Frame-Options', 'SAMEORIGIN')

    return new NextResponse(body, { status: upstream.status, headers })
  } catch (e: any) {
    return new NextResponse(`<html><body style="background:#0a0a0a;color:#cc0000;font-family:monospace;padding:40px">
      <h2>Proxy Error</h2><p>${e.message}</p>
      <p style="color:#555;margin-top:16px">This site may block proxy access. Try copying the request manually from your browser.</p>
    </body></html>`, { status: 200, headers: { 'Content-Type': 'text/html' } })
  }
}
