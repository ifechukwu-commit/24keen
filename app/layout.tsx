import type { Metadata, Viewport } from 'next'
import '../styles/globals.css'
import Sidebar from '../components/Sidebar'

export const metadata: Metadata = {
  title: '24keen',
  description: 'Security Research Workbench',
  manifest: '/manifest.json',
  icons: { icon: '/logo.png', apple: '/logo.png' },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <Sidebar />
          <main style={{ flex: 1, overflow: 'auto', height: '100vh' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
