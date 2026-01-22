import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fiberise Dashboard - Health Records',
  description: 'Dashboard to view Firebase health data',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  )
}
