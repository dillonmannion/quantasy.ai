import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/auth-provider'
import { PosthogProvider } from '@/components/providers/posthog-provider'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Quantasy - Fantasy Football Tools',
  description: 'AI-powered fantasy football tools and analytics with algorithmic transparency',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <AuthProvider>
          <PosthogProvider>
            {children}
          </PosthogProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}
