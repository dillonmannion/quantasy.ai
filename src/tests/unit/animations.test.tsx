import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FadeIn } from '@/components/animation/fade-in'
import { StaggerList, StaggerItem } from '@/components/animation/stagger-list'

describe('Animation Components', () => {
  it('FadeIn renders children', () => {
    render(<FadeIn>Test Content</FadeIn>)
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('StaggerList renders with items', () => {
    render(
      <StaggerList>
        <StaggerItem>Item 1</StaggerItem>
        <StaggerItem>Item 2</StaggerItem>
      </StaggerList>
    )
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })
})
