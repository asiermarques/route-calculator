import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const setView = vi.fn()

vi.mock('react-leaflet', () => ({
  useMap: () => ({ setView }),
}))

const geocodeAddress = vi.fn()
vi.mock('./geocode', () => ({ geocodeAddress: (...args: unknown[]) => geocodeAddress(...args) }))

const { AddressSearchBar } = await import('./AddressSearchBar')

describe('AddressSearchBar', () => {
  it('centres and zooms the map on the best match when an address is submitted', async () => {
    geocodeAddress.mockResolvedValue({ lat: 40.4168, lon: -3.7038 })
    const user = userEvent.setup()
    render(<AddressSearchBar />)

    await user.type(screen.getByRole('textbox', { name: /address/i }), 'Puerta del Sol')
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(geocodeAddress).toHaveBeenCalledWith('Puerta del Sol')
    expect(setView).toHaveBeenCalledWith([40.4168, -3.7038], expect.any(Number))
  })

  it('shows a not-found message and leaves the map untouched when there is no match', async () => {
    geocodeAddress.mockResolvedValue(null)
    const user = userEvent.setup()
    render(<AddressSearchBar />)

    await user.type(screen.getByRole('textbox', { name: /address/i }), 'nowhereatall')
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(await screen.findByText(/not found/i)).toBeInTheDocument()
    expect(setView).not.toHaveBeenCalled()
  })

  it('shows an error message and leaves the map untouched when geocoding fails', async () => {
    geocodeAddress.mockRejectedValue(new Error('network down'))
    const user = userEvent.setup()
    render(<AddressSearchBar />)

    await user.type(screen.getByRole('textbox', { name: /address/i }), 'Puerta del Sol')
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(await screen.findByText(/error|unavailable|couldn.t/i)).toBeInTheDocument()
    expect(setView).not.toHaveBeenCalled()
  })

  it('never geocodes per keystroke while the user is typing', async () => {
    const user = userEvent.setup()
    render(<AddressSearchBar />)

    await user.type(screen.getByRole('textbox', { name: /address/i }), 'Puerta del Sol')

    expect(geocodeAddress).not.toHaveBeenCalled()
  })
})
