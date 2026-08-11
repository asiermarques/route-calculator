import { describe, expect, it } from 'vitest'
import { panelPlacement } from './panelPlacement'

const MAP_SIZE = { x: 1000, y: 800 }
/** The mouse-sized waypoint radius (`RouteLayer.tsx`); the panel clears it by
 * `PANEL_GAP`, so these expectations are the marker position plus 6 + 6. */
const MARKER_RADIUS = 6

describe('panelPlacement', () => {
  it('anchors below and to the right of a marker in the top-left quadrant', () => {
    const style = panelPlacement({ x: 100, y: 100 }, MAP_SIZE, MARKER_RADIUS)

    expect(style.left).toBe('112px')
    expect(style.top).toBe('112px')
    expect(style.right).toBeUndefined()
    expect(style.bottom).toBeUndefined()
  })

  it('anchors below and to the left of a marker in the top-right quadrant', () => {
    const style = panelPlacement({ x: 900, y: 100 }, MAP_SIZE, MARKER_RADIUS)

    expect(style.right).toBe('112px')
    expect(style.top).toBe('112px')
    expect(style.left).toBeUndefined()
  })

  it('anchors above and to the right of a marker in the bottom-left quadrant', () => {
    const style = panelPlacement({ x: 100, y: 700 }, MAP_SIZE, MARKER_RADIUS)

    expect(style.left).toBe('112px')
    expect(style.bottom).toBe('112px')
    expect(style.top).toBeUndefined()
  })

  it('anchors above and to the left of a marker in the bottom-right quadrant', () => {
    const style = panelPlacement({ x: 900, y: 700 }, MAP_SIZE, MARKER_RADIUS)

    expect(style.right).toBe('112px')
    expect(style.bottom).toBe('112px')
  })

  it('clears a bigger marker by more, so the touch-sized dot is not covered', () => {
    const touchSized = panelPlacement({ x: 100, y: 100 }, MAP_SIZE, 11)

    expect(touchSized.left).toBe('117px')
    expect(touchSized.top).toBe('117px')
  })

  it('always grows toward the centre of the map, away from the fixed corner controls', () => {
    const topLeftMarker = panelPlacement({ x: 10, y: 10 }, MAP_SIZE, MARKER_RADIUS)
    expect(topLeftMarker.left).toBeDefined()
    expect(topLeftMarker.top).toBeDefined()

    const bottomRightMarker = panelPlacement({ x: 990, y: 790 }, MAP_SIZE, MARKER_RADIUS)
    expect(bottomRightMarker.right).toBeDefined()
    expect(bottomRightMarker.bottom).toBeDefined()
  })
})
