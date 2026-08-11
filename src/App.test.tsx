import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('./shared/map/MapView', () => ({
  MapView: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map-view">{children}</div>
  ),
}))

vi.mock('./address-search/AddressSearchBar', () => ({
  AddressSearchBar: () => <div data-testid="address-search-bar" />,
}))

const { default: App } = await import('./App')

describe('App', () => {
  it('renders the map screen with the address search bar over it', () => {
    render(<App />)

    expect(screen.getByTestId('map-view')).toBeInTheDocument()
    expect(screen.getByTestId('map-view')).toContainElement(
      screen.getByTestId('address-search-bar'),
    )
  })
})
