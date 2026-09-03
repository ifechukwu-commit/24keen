"use strict";(()=>{var e={};e.id=11,e.ids=[11],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},5989:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>y,patchFetch:()=>g,requestAsyncStorage:()=>c,routeModule:()=>u,serverHooks:()=>h,staticGenerationAsyncStorage:()=>l});var s={};r.r(s),r.d(s,{GET:()=>d});var n=r(9303),o=r(8716),a=r(670),p=r(7070);let i=`
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
`;async function d(e){let t=e.nextUrl.searchParams.get("url");if(!t)return p.NextResponse.json({error:"No URL provided"},{status:400});try{let r=await fetch(t,{headers:{"User-Agent":e.headers.get("user-agent")||"Mozilla/5.0",Accept:"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8","Accept-Language":"en-US,en;q=0.5","Accept-Encoding":"gzip, deflate, br"},redirect:"follow"}),s=r.headers.get("content-type")||"",n=await r.text();if(s.includes("text/html")){n=n.replace("<head>","<head>"+i);let e=new URL(t);n=(n=n.replace(/<base[^>]*>/gi,"")).replace("<head>",`<head><base href="${e.origin}/">`)}let o=new Headers;return o.set("Content-Type",s||"text/html"),o.set("X-Frame-Options","SAMEORIGIN"),new p.NextResponse(n,{status:r.status,headers:o})}catch(e){return new p.NextResponse(`<html><body style="background:#0a0a0a;color:#cc0000;font-family:monospace;padding:40px">
      <h2>Proxy Error</h2><p>${e.message}</p>
      <p style="color:#555;margin-top:16px">This site may block proxy access. Try copying the request manually from your browser.</p>
    </body></html>`,{status:200,headers:{"Content-Type":"text/html"}})}}let u=new n.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/proxy/route",pathname:"/api/proxy",filename:"route",bundlePath:"app/api/proxy/route"},resolvedPagePath:"C:\\24keen-web\\app\\api\\proxy\\route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:c,staticGenerationAsyncStorage:l,serverHooks:h}=u,y="/api/proxy/route";function g(){return(0,a.patchFetch)({serverHooks:h,staticGenerationAsyncStorage:l})}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[276,972],()=>r(5989));module.exports=s})();