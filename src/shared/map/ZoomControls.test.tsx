import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const map = {
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  getZoom: vi.fn(() => 14),
  getMinZoom: vi.fn(() => 0),
  getMaxZoom: vi.fn(() => 18),
  on: vi.fn(),
  off: vi.fn(),
}

vi.mock('react-leaflet', () => ({ useMap: () => map }))

const { ZoomControls } = await import('./ZoomControls')

afterEach(() => {
  cleanup()
  map.getZoom.mockReturnValue(14)
})

describe('ZoomControls', () => {
  it('zooms the map in', async () => {
    const user = userEvent.setup()
    render(<ZoomControls />)

    await user.click(screen.getByRole('button', { name: /zoom in/i }))

    expect(map.zoomIn).toHaveBeenCalled()
  })

  // One press per test: the control sits in a panel that stops Leaflet reading
  // its clicks as map clicks, and in jsdom that guard swallows a second
  // synthetic click landing in the same panel within half a second — see
  // `src/App.test.tsx`.
  it('zooms the map out', async () => {
    const user = userEvent.setup()
    render(<ZoomControls />)

    await user.click(screen.getByRole('button', { name: /zoom out/i }))

    expect(map.zoomOut).toHaveBeenCalled()
  })

  it('stops offering a zoom that cannot happen at either end of the range', () => {
    map.getZoom.mockReturnValue(18)
    render(<ZoomControls />)

    expect(screen.getByRole('button', { name: /zoom in/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeEnabled()

    cleanup()
    map.getZoom.mockReturnValue(0)
    render(<ZoomControls />)

    expect(screen.getByRole('button', { name: /zoom out/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeEnabled()
  })

  it('follows the map rather than the zoom it was mounted at', () => {
    render(<ZoomControls />)

    // Leaflet is the source of truth for the current zoom — the buttons are not
    // the only way it changes (scroll, pinch, double-click, keyboard, an
    // address search recentring the view), so the disabled state has to come
    // from the map's own events.
    const listened = map.on.mock.calls.map(([event]) => event)
    expect(listened).toContain('zoomend')
    expect(listened).toContain('zoomlevelschange')
  })

  it('stops listening when it goes away', () => {
    const { unmount } = render(<ZoomControls />)
    map.off.mockClear()

    unmount()

    expect(map.off).toHaveBeenCalled()
  })
})
