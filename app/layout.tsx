import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
export const metadata: Metadata = { title:'Stockwise — Know before you buy', description:'Purchasing intelligence for resellers and product-based businesses.', generator:'Stockwise', icons:{ icon:[{url:'/icon.svg',type:'image/svg+xml'}] } }
export const viewport: Viewport = { colorScheme:'light dark', themeColor:[{media:'(prefers-color-scheme: light)',color:'white'},{media:'(prefers-color-scheme: dark)',color:'black'}] }
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body className="antialiased">{children}{process.env.NODE_ENV==='production'&&<Analytics/>}</body></html> }
