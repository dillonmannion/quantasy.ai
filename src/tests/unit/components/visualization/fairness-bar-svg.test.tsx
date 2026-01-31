import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FairnessBarSVG } from '@/components/visualization/fairness-bar-svg'

describe('FairnessBarSVG', () => {
  const defaultProps = {
    width: 300,
    height: 100,
    ariaLabel: 'Trade Fairness Comparison',
    giveValue: 100,
    receiveValue: 100,
  }

  it('renders with proper accessibility attributes', () => {
    render(<FairnessBarSVG {...defaultProps} />)
    
    expect(screen.getByRole('img', { name: /Trade Fairness Comparison/i })).toBeInTheDocument()
    expect(screen.getByTitle(/Trade Fairness Comparison/i)).toBeInTheDocument()
  })

  it('renders two bars', () => {
    const { container } = render(<FairnessBarSVG {...defaultProps} />)
    const rects = container.querySelectorAll('rect')
    expect(rects).toHaveLength(2)
  })

  it('uses fair gradient for balanced trade (ratio ~1)', () => {
    const { container } = render(<FairnessBarSVG {...defaultProps} giveValue={100} receiveValue={100} />)
    const receiveBar = container.querySelectorAll('rect')[1]
    expect(receiveBar).toHaveAttribute('fill', expect.stringContaining('fairness-gradient-fair'))
  })

  it('uses bad gradient for unfair trade (ratio < 0.8)', () => {
    const { container } = render(<FairnessBarSVG {...defaultProps} giveValue={100} receiveValue={70} />)
    const receiveBar = container.querySelectorAll('rect')[1]
    expect(receiveBar).toHaveAttribute('fill', expect.stringContaining('fairness-gradient-bad'))
  })

  it('uses warn gradient for slightly unfair trade (ratio 0.8-0.95)', () => {
    const { container } = render(<FairnessBarSVG {...defaultProps} giveValue={100} receiveValue={90} />)
    const receiveBar = container.querySelectorAll('rect')[1]
    expect(receiveBar).toHaveAttribute('fill', expect.stringContaining('fairness-gradient-warn'))
  })

  it('renders explain callout when showExplain is true', () => {
    const { container } = render(<FairnessBarSVG {...defaultProps} showExplain={true} />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('does not render explain callout by default', () => {
    const { container } = render(<FairnessBarSVG {...defaultProps} />)
    expect(screen.queryByText('?')).not.toBeInTheDocument()
  })

  it('handles zero values gracefully', () => {
    render(<FairnessBarSVG {...defaultProps} giveValue={0} receiveValue={0} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })
})
