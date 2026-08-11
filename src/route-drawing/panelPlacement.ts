import type { CSSProperties } from 'react'

/** Clear of the marker itself (`WAYPOINT_RADIUS` in `RouteLayer.tsx`), so the
 * panel doesn't sit flush against the dot it belongs to. */
const PANEL_OFFSET = 12

/** Where to anchor the waypoint options panel relative to its marker's pixel
 * position: on whichever side points back toward the centre of the map, so
 * the panel grows away from whichever edge the marker is closest to — the
 * edges every fixed overlay control, and Leaflet's own zoom buttons and
 * attribution, live along (docs/DESIGN.md) — rather than reaching toward
 * them. */
export function panelPlacement(
  point: { x: number; y: number },
  mapSize: { x: number; y: number },
): CSSProperties {
  const anchorRight = point.x > mapSize.x / 2
  const anchorBottom = point.y > mapSize.y / 2

  return {
    position: 'absolute',
    ...(anchorRight
      ? { right: `${mapSize.x - point.x + PANEL_OFFSET}px` }
      : { left: `${point.x + PANEL_OFFSET}px` }),
    ...(anchorBottom
      ? { bottom: `${mapSize.y - point.y + PANEL_OFFSET}px` }
      : { top: `${point.y + PANEL_OFFSET}px` }),
  }
}
