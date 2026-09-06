'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/', label: 'SCAN' },
  { href: '/browser', label: 'BROWSER' },
  { href: '/findings', label: 'FINDINGS' },
  { href: '/monitor', label: 'MONITOR' },
  { href: '/oob', label: 'OOB' },
  { href: '/web3', label: 'WEB3' },
  { href: '/settings', label: 'SETTINGS' },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside style={{
      width: 200,
      background: '#111111',
      borderRight: '1px solid #1e0000',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      flexShrink: 0,
    }}>
      <div style={{ padding: '0 16px 24px', borderBottom: '1px solid #1e0000' }}>
        <Image src="/logo.png" alt="24keen" width={56} height={56} style={{ objectFit: 'contain' }} />
        <div style={{ fontSize: 11, color: '#444', marginTop: 8, letterSpacing: 2 }}>SECURITY WORKBENCH</div>
      </div>

      <nav style={{ flex: 1, padding: '16px 0' }}>
        {NAV.map(item => {
          const active = path === item.href
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'block',
              padding: '10px 16px',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 2,
              color: active ? '#cc0000' : '#555',
              background: active ? '#1a0000' : 'transparent',
              borderLeft: active ? '3px solid #cc0000' : '3px solid transparent',
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: '16px', borderTop: '1px solid #1e0000' }}>
        <div style={{ fontSize: 10, color: '#333', letterSpacing: 1 }}>v1.0.0</div>
      </div>
    </aside>
  )
}
