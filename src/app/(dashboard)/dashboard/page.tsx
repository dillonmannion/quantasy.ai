import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/page-container'
import { StaggerList, StaggerItem } from '@/components/animation/stagger-list'
import { BarChart3, Users, ArrowLeftRight, TrendingUp, Lock } from 'lucide-react'
import Link from 'next/link'

const tools = [
  {
    href: '/dashboard/draft',
    icon: BarChart3,
    title: 'Draft Assistant',
    description: 'Value-Based Drafting rankings',
    color: 'text-accent',
    bgColor: 'bg-accent/20',
    locked: true,
  },
  {
    href: '/dashboard/roster',
    icon: Users,
    title: 'Roster Optimizer',
    description: 'Optimize your starting lineup',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/20',
    locked: true,
  },
  {
    href: '/dashboard/trade',
    icon: ArrowLeftRight,
    title: 'Trade Calculator',
    description: 'Evaluate trade fairness',
    color: 'text-primary',
    bgColor: 'bg-primary/20',
    locked: true,
  },
  {
    href: '/dashboard/waivers',
    icon: TrendingUp,
    title: 'Waiver Wire',
    description: 'FAAB and priority optimization',
    color: 'text-green-400',
    bgColor: 'bg-green-400/20',
    locked: true,
  },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageContainer>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">
            Welcome back{user?.email && `, ${user.email.split('@')[0]}`}!
          </h1>
          <p className="text-muted-foreground">
            Choose a tool to get started
          </p>
        </div>

        <StaggerList className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon
            const isLocked = tool.locked

            return (
              <StaggerItem key={tool.href}>
                <Link href={isLocked ? '#' : tool.href}>
                  <Card className={`card-balatro p-8 relative ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                    {isLocked && (
                      <div className="absolute top-4 right-4">
                        <Lock className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-lg ${tool.bgColor} flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 ${tool.color}`} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{tool.title}</h3>
                    <p className="text-muted-foreground">
                      {tool.description}
                    </p>
                    {isLocked && (
                      <p className="text-sm text-muted-foreground mt-4">
                        Coming soon in Phase 1
                      </p>
                    )}
                  </Card>
                </Link>
              </StaggerItem>
            )
          })}
        </StaggerList>

        <Card className="card-balatro p-12 text-center">
          <h2 className="text-2xl font-bold mb-3">No leagues connected yet</h2>
          <p className="text-muted-foreground mb-6">
            Connect your Sleeper league to start using Quantasy tools
          </p>
          <Button variant="outline" disabled>
            Connect League (Coming Soon)
          </Button>
        </Card>
      </div>
    </PageContainer>
  )
}
