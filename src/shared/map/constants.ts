import type { LatLngTuple } from 'leaflet'

/** Falls back to this view whenever no address has centred the map yet. */
export const DEFAULT_CENTER: LatLngTuple = [40.4168, -3.7038] // Madrid
export const DEFAULT_ZOOM = 13

export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
