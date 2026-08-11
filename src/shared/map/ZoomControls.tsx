import { useEffect, useState } from 'react'
import { useMap } from 'react-leaflet'
import { useDisableMapClickPropagation } from './useDisableMapClickPropagation'
import styles from './ZoomControls.module.css'

/** Zoom in and out, in the footer bar with the rest of the shell.
 *
 * This is the app's own control rather than Leaflet's `ZoomControl`
 * (docs/DESIGN.md). Leaflet's is fixed to a corner of the map at its own 30px
 * size, which left the bottom bar carving a gutter around it and one pair of
 * controls two thirds the size of every other — the last thing on the screen
 * still floating on its own. Zooming is `map.zoomIn()`/`zoomOut()`, which is
 * all Leaflet's control does too; what has to be reproduced with it is the
 * disabled state at the ends of the zoom range, so the buttons stop offering a
 * zoom that cannot happen. */
export function ZoomControls() {
  const map = useMap()
  const ref = useDisableMapClickPropagation<HTMLDivElement>()
  const [zoom, setZoom] = useState(() => map.getZoom())

  useEffect(() => {
    const update = () => setZoom(map.getZoom())
    // `zoomlevelschange` as well as `zoomend`: the range itself moves when a
    // tile layer is added or removed, which changes which end we are at
    // without the view having moved at all.
    map.on('zoomend', update)
    map.on('zoomlevelschange', update)
    return () => {
      map.off('zoomend', update)
      map.off('zoomlevelschange', update)
    }
  }, [map])

  return (
    <div ref={ref} className={styles.controls} role="group" aria-label="Zoom">
      <button
        className={styles.button}
        type="button"
        onClick={() => map.zoomOut()}
        disabled={zoom <= map.getMinZoom()}
        aria-label="Zoom out"
      >
        <span aria-hidden="true">−</span>
      </button>
      <button
        className={styles.button}
        type="button"
        onClick={() => map.zoomIn()}
        disabled={zoom >= map.getMaxZoom()}
        aria-label="Zoom in"
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  )
}
