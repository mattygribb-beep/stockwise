import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Source Stack — Find it. Source it. Know the numbers.',
  description: 'Purchasing intelligence for resellers and product-based businesses.',
  applicationName: 'Source Stack',
  generator: 'Source Stack',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Source Stack', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }], apple: [{ url: '/icon.svg', type: 'image/svg+xml' }] }
}
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'dark',
  themeColor: '#0b1320'
}
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body className="antialiased">{children}{process.env.NODE_ENV==='production'&&<Analytics/>}</body></html>
}
