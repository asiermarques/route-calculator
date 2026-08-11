import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { DomEvent } from 'leaflet'
import { useDisableMapClickPropagation } from './useDisableMapClickPropagation'

function TestOverlay() {
  const ref = useDisableMapClickPropagation<HTMLDivElement>()
  return <div ref={ref} data-testid="overlay" />
}

describe('useDisableMapClickPropagation', () => {
  it('disables click and scroll propagation on the element it is attached to', () => {
    const disableClick = vi.spyOn(DomEvent, 'disableClickPropagation')
    const disableScroll = vi.spyOn(DomEvent, 'disableScrollPropagation')

    render(<TestOverlay />)

    expect(disableClick).toHaveBeenCalledWith(expect.any(HTMLElement))
    expect(disableScroll).toHaveBeenCalledWith(expect.any(HTMLElement))

    disableClick.mockRestore()
    disableScroll.mockRestore()
  })
})
