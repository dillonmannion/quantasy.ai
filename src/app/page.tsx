import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FadeIn } from '@/components/animation/fade-in'
import { StaggerList, StaggerItem } from '@/components/animation/stagger-list'
import { BarChart3, Users, ArrowLeftRight, TrendingUp } from 'lucide-react'

const features = [
  {
    icon: BarChart3,
    title: 'Draft Assistant',
    description: 'Value-Based Drafting (VBD) rankings that adapt in real-time to your league settings.',
    color: 'text-accent',
    bgColor: 'bg-accent/20',
  },
  {
    icon: Users,
    title: 'Roster Optimizer',
    description: 'Greedy algorithm for optimal lineups. See all possible combinations explained.',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/20',
  },
  {
    icon: ArrowLeftRight,
    title: 'Trade Calculator',
    description: 'Fair trade evaluation with transparent methodology. Know exactly why a trade works.',
    color: 'text-primary',
    bgColor: 'bg-primary/20',
  },
  {
    icon: TrendingUp,
    title: 'Waiver Wire Tool',
    description: 'FAAB optimization and waiver priority recommendations based on your roster needs.',
    color: 'text-green-400',
    bgColor: 'bg-green-400/20',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <section className="container mx-auto px-4 py-20 text-center">
        <FadeIn>
          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-pink-500 bg-clip-text text-transparent">
            Quantasy
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Fantasy football tools built on algorithmic transparency and mathematical rigor.
          </p>
          <Link href="/login">
            <Button size="lg" className="text-lg px-8 py-6">
              Connect with Sleeper
            </Button>
          </Link>
        </FadeIn>
      </section>

      <section className="container mx-auto px-4 py-20">
        <FadeIn delay={0.2}>
          <h2 className="text-4xl font-bold text-center mb-12">
            Four Tools. One Mission.
          </h2>
        </FadeIn>

        <StaggerList className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <StaggerItem key={feature.title}>
                <Card className="card-balatro p-8 h-full">
                  <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </Card>
              </StaggerItem>
            )
          })}
        </StaggerList>
      </section>

      <section className="container mx-auto px-4 py-20 text-center">
        <FadeIn delay={0.4}>
          <Card className="card-balatro p-12 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to dominate?</h2>
            <p className="text-muted-foreground mb-6">
              Connect your Sleeper league and start making data-driven decisions.
            </p>
            <Link href="/login">
              <Button size="lg">
                Get Started
              </Button>
            </Link>
          </Card>
        </FadeIn>
      </section>
    </div>
  )
}
