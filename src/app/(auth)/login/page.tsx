'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { FadeIn } from '@/components/animation/fade-in'

const DEV_TEST_EMAIL = 'admin.skip@qai.com'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (process.env.NODE_ENV === 'development' && email === DEV_TEST_EMAIL) {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      setLoading(false)
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
        return
      }
      setMessage({ type: 'error', text: data.error || 'Dev login failed' })
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ 
        type: 'success', 
        text: 'Check your email for the magic link!' 
      })
    }
  }

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <FadeIn className="w-[32rem] max-w-full">
        <Card className="p-6 md:p-10 gap-6 md:gap-8 border-white/10 shadow-2xl">
            <div className="text-center space-y-3">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent pb-1">
                Welcome to Quantasy
              </h1>
              <p className="text-muted-foreground text-base md:text-lg">
                Sign in to access your fantasy football tools
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-base">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 text-lg bg-background/50 border-white/10 focus:border-primary/50"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-primary/25 transition-all"
                disabled={loading}
              >
                {loading ? 'Sending magic link...' : 'Send Magic Link'}
              </Button>
            </form>

            {message && (
              <div className={`
                p-4 rounded-lg text-sm
                ${message.type === 'success' 
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }
              `}>
                {message.text}
              </div>
            )}
          </Card>
      </FadeIn>
    </div>
  )
}
