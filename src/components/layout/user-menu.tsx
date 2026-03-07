'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserMenu() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
      setIsLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1.5 flex-1 overflow-hidden">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  const initials = user.email
    ? user.email.charAt(0).toUpperCase()
    : 'U'

  return (
    <div className="p-4 border-t border-border">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 w-full outline-none group">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 group-hover:border-primary/50 transition-colors">
            <span className="text-sm font-semibold text-primary">
              {initials}
            </span>
          </div>
          <div className="flex flex-col items-start text-sm overflow-hidden text-left">
            <span className="font-medium truncate w-full text-foreground/90 group-hover:text-foreground transition-colors">
              Account
            </span>
            <span className="text-sm text-muted-foreground truncate w-full group-hover:text-muted-foreground/80 transition-colors">
              {user.email}
            </span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" side="right" sideOffset={12}>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Account</p>
              <p className="text-sm leading-none text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
