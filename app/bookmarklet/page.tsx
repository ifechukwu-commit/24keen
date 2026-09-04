'use client'
export default function BookmarkletPage() {
  const KEEN_URL = 'https://24keen.vercel.app'
  
  const bookmarklet = `javascript:(function(){var s=document.createElement('script');s.src='${KEEN_URL}/bookmarklet.js?t='+Date.now();document.head.appendChild(s);})();`

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', marginBottom: 8 }}>24keen Bookmarklet</div>
      <div style={{ fontSize: 13, color: '#555', marginBottom: 24, lineHeight: 1.8 }}>
        Save once. Works permanently in any browser. Tap it on any target page to capture all requests and send them to 24keen automatically.
      </div>
      <div style={{ background: '#111', border: '1px solid #cc0000', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#cc0000', letterSpacing: 2, marginBottom: 12 }}>STEP 1 — SAVE THE BOOKMARKLET</div>
        <div style={{ fontSize: 13, color: '#888', lineHeight: 1.8, marginBottom: 16 }}>
          On your phone: tap and hold the link below, then tap Add Bookmark. Name it 24keen. Save it to your bookmarks bar.
        </div>
        <a 
          href={bookmarklet}
          style={{ 
            display: 'block', background: '#cc0000', color: 'white', 
            padding: '14px 20px', borderRadius: 8, textAlign: 'center',
            fontWeight: 800, fontSize: 14, letterSpacing: 1, textDecoration: 'none'
          }}
        >
          TAP AND HOLD TO BOOKMARK
        </a>
      </div>
      <div style={{ background: '#111', border: '1px solid #1e0000', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#cc0000', letterSpacing: 2, marginBottom: 12 }}>STEP 2 — HOW TO USE</div>
        {[
          'Open any target site in your browser and log in normally',
          'Navigate to the page or endpoint you want to test',
          'Open your bookmarks and tap 24keen',
          'A red notification appears confirming capture',
          'Open 24keen app — requests appear in Browser tab under Captured',
          'Tap any request and click Send to Scanner',
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#cc0000', minWidth: 20 }}>{i + 1}</span>
            <span style={{ fontSize: 13, color: '#888', lineHeight: 1.6 }}>{step}</span>
          </div>
        ))}
      </div>
      <div style={{ background: '#111', border: '1px solid #1e0000', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#cc0000', letterSpacing: 2, marginBottom: 8 }}>ALTERNATIVE — COPY THE CODE</div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>If tap and hold does not work, copy this code, create a new bookmark manually, and paste it as the URL.</div>
        <textarea 
          readOnly 
          value={bookmarklet}
          onClick={e => (e.target as HTMLTextAreaElement).select()}
          style={{ width: '100%', height: 80, fontSize: 11, resize: 'none', wordBreak: 'break-all' }}
        />
      </div>
    </div>
  )
}
