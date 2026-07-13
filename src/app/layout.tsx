import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JENEUS CO LTD — Support Platform',
  description: 'Business operations platform for JENEUS CO LTD',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
