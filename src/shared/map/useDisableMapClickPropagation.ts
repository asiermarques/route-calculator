import { useEffect, useRef } from 'react'
import { DomEvent } from 'leaflet'

/** Ref for any overlay panel rendered inside the Leaflet map container
 * (address search, distance readout, undo/clear, routing status). Without
 * this, clicking or scrolling inside the panel bubbles through to Leaflet's
 * own click handling and gets misread as a click on the map itself — e.g.
 * clicking "Undo" would also add a new waypoint under the button. */
export function useDisableMapClickPropagation<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    DomEvent.disableClickPropagation(element)
    DomEvent.disableScrollPropagation(element)
  }, [])

  return ref
}
