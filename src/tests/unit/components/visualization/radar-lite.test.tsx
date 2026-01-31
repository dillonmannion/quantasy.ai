import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { RadarLite } from '@/components/visualization/radar-lite'

describe('RadarLite', () => {
  const mockData = [
    { label: 'Speed', value: 80, max: 100 },
    { label: 'Power', value: 60, max: 100 },
    { label: 'Agility', value: 90, max: 100 },
    { label: 'Technique', value: 70, max: 100 },
    { label: 'Stamina', value: 85, max: 100 },
    { label: 'Mental', value: 75, max: 100 },
  ]

  it('renders with accessibility attributes', () => {
    render(<RadarLite data={mockData} ariaLabel="Player Stats" />)
    expect(screen.getByRole('img', { name: "Player Stats" })).toBeInTheDocument()
    expect(screen.getByText('Speed')).toBeInTheDocument()
  })

  it('renders correct number of axes', () => {
    const { container } = render(<RadarLite data={mockData} ariaLabel="Player Stats" />)
    const lines = container.querySelectorAll('.axes line')
    expect(lines).toHaveLength(6)
  })

  it('renders comparison polygon when provided', () => {
    const mockComparison = [
      { label: 'Speed', value: 50, max: 100 },
      { label: 'Power', value: 50, max: 100 },
      { label: 'Agility', value: 50, max: 100 },
      { label: 'Technique', value: 50, max: 100 },
      { label: 'Stamina', value: 50, max: 100 },
      { label: 'Mental', value: 50, max: 100 },
    ]
    
    const { container } = render(
      <RadarLite 
        data={mockData} 
        comparisonData={mockComparison} 
        ariaLabel="Comparison" 
      />
    )
    
    const polygons = container.querySelectorAll('.data-layers polygon')
    expect(polygons).toHaveLength(2)
  })

  it('handles zero values correctly (collapsed to center)', () => {
    const zeroData = [
      { label: 'A', value: 0, max: 100 },
      { label: 'B', value: 0, max: 100 },
      { label: 'C', value: 0, max: 100 },
    ]
    
    const { container } = render(<RadarLite data={zeroData} size={200} ariaLabel="Zero" />)
    const polygon = container.querySelector('.data-layers polygon')
    const points = polygon?.getAttribute('points')
    
    // Center is 100,100. All points should be 100,100
    // "100,100 100,100 100,100"
    expect(points).toMatch(/100,100.*100,100.*100,100/)
  })
})
