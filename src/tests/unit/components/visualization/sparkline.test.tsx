import { render, screen } from '@testing-library/react'
import { Sparkline } from '@/components/visualization/sparkline'
import { describe, it, expect } from 'vitest'

describe('Sparkline', () => {
  it('renders correctly with default props', () => {
    render(<Sparkline data={[10, 20, 15]} ariaLabel="Test sparkline" />)
    const svg = screen.getByRole('img', { name: "Test sparkline" })
    expect(svg).toBeInTheDocument()
    expect(screen.getByTitle("Test sparkline")).toBeInTheDocument()
  })

  it('renders "No data" message when data is empty', () => {
    render(<Sparkline data={[]} ariaLabel="Empty sparkline" />)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('renders a single dot when data has one point', () => {
    render(<Sparkline data={[10]} ariaLabel="Single point" />)
    const svg = screen.getByRole('img', { name: "Single point" })
    const path = svg.querySelector('path')
    expect(path).not.toBeInTheDocument()
    const circle = svg.querySelector('circle')
    expect(circle).toBeInTheDocument()
  })

  it('renders path and dot when data has multiple points', () => {
    render(<Sparkline data={[10, 20, 15, 25]} ariaLabel="Trend" />)
    const svg = screen.getByRole('img', { name: "Trend" })
    const path = svg.querySelector('path')
    expect(path).toBeInTheDocument()
    const circle = svg.querySelector('circle')
    expect(circle).toBeInTheDocument()
  })

  it('uses custom dimensions', () => {
    render(<Sparkline data={[1, 2]} width={100} height={50} ariaLabel="Sized" />)
    const svg = screen.getByRole('img', { name: "Sized" })
    expect(svg).toHaveAttribute('width', '100')
    expect(svg).toHaveAttribute('height', '50')
    expect(svg).toHaveAttribute('viewBox', '0 0 100 50')
  })

  it('uses custom color', () => {
    const color = 'var(--chart-2)'
    render(<Sparkline data={[1, 2]} color={color} ariaLabel="Colored" />)
    const svg = screen.getByRole('img', { name: "Colored" })
    const path = svg.querySelector('path')
    expect(path).toHaveAttribute('stroke', color)
  })
})
