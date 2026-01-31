import { type ReactNode } from 'react'
import { Breadcrumbs } from './breadcrumbs'

interface PageContainerProps {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`min-h-screen lg:pl-64 pb-20 lg:pb-0 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Breadcrumbs />
        </div>
        {children}
      </div>
    </div>
  )
}
