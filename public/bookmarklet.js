(function () {
  const KEEN = 'https://24keen.vercel.app'
  const captured = []

  function send(data) {
    fetch(KEEN + '/api/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(function () {})
  }

  function notify(count) {
    var n = document.getElementById('__keen_notify__')
    if (!n) {
      n = document.createElement('div')
      n.id = '__keen_notify__'
      n.style.cssText = 'position:fixed;top:16px;right:16px;z-index:999999;background:#cc0000;color:white;padding:12px 18px;border-radius:8px;font-family:sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;box-shadow:0 0 20px #cc000088;transition:opacity 0.5s;'
      document.body.appendChild(n)
    }
    n.style.opacity = '1'
    n.textContent = '24KEEN: ' + count + ' CAPTURED'
    clearTimeout(n.__t)
    n.__t = setTimeout(function () { n.style.opacity = '0' }, 3000)
  }

  var origFetch = window.fetch
  window.fetch = function (input, init) {
    init = init || {}
    var url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
    var method = (init.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase()
    var t0 = Date.now()
    var reqHeaders = {}
    try {
      var h = init.headers
      if (h instanceof Headers) h.forEach(function (v, k) { reqHeaders[k] = v })
      else if (h) Object.assign(reqHeaders, h)
    } catch (e) {}
    var reqBody = null
    try {
      if (init.body) {
        if (typeof init.body === 'string') reqBody = init.body
        else if (init.body instanceof URLSearchParams) reqBody = init.body.toString()
      }
    } catch (e) {}

    return origFetch.apply(this, arguments).then(function (resp) {
      var clone = resp.clone()
      var respHeaders = {}
      resp.headers.forEach(function (v, k) { respHeaders[k] = v })
      clone.text().then(function (body) {
        captured.push(url)
        send({
          url: url,
          method: method,
          requestHeaders: reqHeaders,
          requestBody: reqBody,
          responseStatus: resp.status,
          responseHeaders: respHeaders,
          responseBody: body.slice(0, 8000),
          timingMs: Date.now() - t0,
          capturedAt: new Date().toISOString(),
          source: 'bookmarklet',
          pageUrl: window.location.href,
        })
        notify(captured.length)
      }).catch(function () {})
      return resp
    })
  }

  var origOpen = XMLHttpRequest.prototype.open
  var origSend = XMLHttpRequest.prototype.send
  var origSetHeader = XMLHttpRequest.prototype.setRequestHeader
  XMLHttpRequest.prototype.open = function (m, u) {
    this._km = m; this._ku = u; this._kh = {}; this._kt = Date.now()
    return origOpen.apply(this, arguments)
  }
  XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
    if (this._kh) this._kh[k] = v
    return origSetHeader.apply(this, arguments)
  }
  XMLHttpRequest.prototype.send = function (body) {
    var self = this
    this.addEventListener('loadend', function () {
      var rh = {}
      try {
        self.getAllResponseHeaders().split('\r\n').forEach(function (l) {
          var p = l.indexOf(': ')
          if (p > 0) rh[l.slice(0, p).toLowerCase()] = l.slice(p + 2)
        })
      } catch (e) {}
      captured.push(self._ku)
      send({
        url: self._ku || '',
        method: self._km || 'GET',
        requestHeaders: self._kh || {},
        requestBody: typeof body === 'string' ? body : null,
        responseStatus: self.status,
        responseHeaders: rh,
        responseBody: (self.responseText || '').slice(0, 8000),
        timingMs: Date.now() - (self._kt || 0),
        capturedAt: new Date().toISOString(),
        source: 'bookmarklet',
        pageUrl: window.location.href,
      })
      notify(captured.length)
    })
    return origSend.apply(this, arguments)
  }

  notify(0)
  setTimeout(function () {
    var n = document.getElementById('__keen_notify__')
    if (n) {
      n.textContent = '24KEEN ACTIVE — browsing captured'
      n.__t = setTimeout(function () { n.style.opacity = '0' }, 2000)
    }
  }, 100)
})()
