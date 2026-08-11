import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DEFAULT_CENTER, DEFAULT_ZOOM, OSM_ATTRIBUTION, OSM_TILE_URL } from './constants'

const mapContainerProps = vi.fn()
const tileLayerProps = vi.fn()

vi.mock('react-leaflet', () => ({
  MapContainer: (props: Record<string, unknown>) => {
    mapContainerProps(props)
    return (
      <div data-testid="map-container">
        {props.children as React.ReactNode}
      </div>
    )
  },
  TileLayer: (props: Record<string, unknown>) => {
    tileLayerProps(props)
    return <div data-testid="tile-layer" />
  },
}))

const { MapView } = await import('./MapView')

describe('MapView', () => {
  it('renders a map container filling the viewport with the default centre and zoom', () => {
    render(<MapView />)

    expect(screen.getByTestId('map-container')).toBeInTheDocument()
    expect(mapContainerProps).toHaveBeenCalledWith(
      expect.objectContaining({
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      }),
    )
  })

  it('renders the OpenStreetMap tile layer with required attribution', () => {
    render(<MapView />)

    expect(tileLayerProps).toHaveBeenCalledWith(
      expect.objectContaining({
        url: OSM_TILE_URL,
        attribution: OSM_ATTRIBUTION,
      }),
    )
  })

  it('leaves zooming to the app\'s own control rather than Leaflet\'s corner widget', () => {
    render(<MapView />)

    // `zoomControl: false` and no `<ZoomControl>`: the zoom buttons live in the
    // footer bar (`shared/map/ZoomControls`), at the size every other control
    // is, which is what lets that bar run the full width of the map.
    expect(mapContainerProps).toHaveBeenCalledWith(
      expect.objectContaining({ zoomControl: false }),
    )
  })

  it('renders its children inside the map container so overlays can use the map instance', () => {
    render(
      <MapView>
        <div data-testid="overlay">overlay</div>
      </MapView>,
    )

    expect(screen.getByTestId('map-container')).toContainElement(
      screen.getByTestId('overlay'),
    )
  })
})
