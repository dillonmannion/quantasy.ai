'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'

const emptyStateVariants = cva('flex flex-col items-center justify-center', {
  variants: {
    variant: {
      minimal: 'gap-2',
      card: 'gap-4 p-6',
      'full-page': 'gap-6 py-12 px-4',
    },
  },
  defaultVariants: {
    variant: 'card',
  },
})

const emptyStateTitleVariants = cva('font-bold', {
  variants: {
    variant: {
      minimal: 'text-sm text-muted-foreground',
      card: 'text-lg text-foreground',
      'full-page': 'text-2xl text-foreground',
    },
  },
})

const emptyStateDescriptionVariants = cva('text-muted-foreground', {
  variants: {
    variant: {
      minimal: 'text-xs',
      card: 'text-sm text-center max-w-xs',
      'full-page': 'text-base text-center max-w-md',
    },
  },
})

const emptyStateIconVariants = cva('text-muted-foreground', {
  variants: {
    variant: {
      minimal: 'hidden',
      card: 'w-8 h-8',
      'full-page': 'w-16 h-16',
    },
  },
})

interface EmptyStateProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof emptyStateVariants> {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
}

function EmptyState({
  variant = 'card',
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  const content = (
    <div className={cn(emptyStateVariants({ variant }), className)} {...props}>
      {Icon && (
        <Icon className={cn(emptyStateIconVariants({ variant }))} />
      )}
      <div className="text-center">
        <h3 className={cn(emptyStateTitleVariants({ variant }))}>{title}</h3>
        {description && (
          <p className={cn(emptyStateDescriptionVariants({ variant }))}>
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button
          onClick={action.onClick}
          asChild={!!action.href}
          size={variant === 'full-page' ? 'lg' : 'sm'}
          variant={variant === 'full-page' ? 'default' : 'outline'}
        >
          {action.href ? (
            <a href={action.href}>{action.label}</a>
          ) : (
            action.label
          )}
        </Button>
      )}
    </div>
  )

  if (variant === 'card') {
    return <Card className="card-balatro">{content}</Card>
  }

  return content
}

export { EmptyState, emptyStateVariants }
