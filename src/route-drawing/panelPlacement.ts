import type { CSSProperties } from 'react'

/** Gap between the edge of the marker and the edge of the panel, so the panel
 * doesn't sit flush against the dot it belongs to. Added to the marker's own
 * radius rather than standing in for it: the touch-sized marker is nearly
 * twice the radius of the mouse-sized one (`RouteLayer.tsx`), and a constant
 * offset that cleared one would be swallowed by the other. */
const PANEL_GAP = 6

/** Where to anchor the waypoint options panel relative to its marker's pixel
 * position: on whichever side points back toward the centre of the map, so
 * the panel grows away from whichever edge the marker is closest to — the
 * edges every fixed overlay control, and Leaflet's own zoom buttons and
 * attribution, live along (docs/DESIGN.md) — rather than reaching toward
 * them. */
export function panelPlacement(
  point: { x: number; y: number },
  mapSize: { x: number; y: number },
  markerRadius: number,
): CSSProperties {
  const offset = markerRadius + PANEL_GAP
  const anchorRight = point.x > mapSize.x / 2
  const anchorBottom = point.y > mapSize.y / 2

  return {
    position: 'absolute',
    ...(anchorRight
      ? { right: `${mapSize.x - point.x + offset}px` }
      : { left: `${point.x + offset}px` }),
    ...(anchorBottom
      ? { bottom: `${mapSize.y - point.y + offset}px` }
      : { top: `${point.y + offset}px` }),
  }
}
