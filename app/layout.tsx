import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Providers } from '@/lib/providers'
import { Analytics } from '@vercel/analytics/next'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AgroStock',
  description: 'Gestión de stock de productos agroquímicos y semillas',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="h-full bg-gray-50 antialiased">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  )
}
