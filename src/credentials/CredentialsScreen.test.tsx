import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CredentialsScreen } from './CredentialsScreen'

describe('CredentialsScreen', () => {
  it('offers both supported providers and a masked key field', () => {
    render(<CredentialsScreen onSubmit={vi.fn()} />)

    const select = screen.getByRole('combobox', { name: /routing provider/i })
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /mapbox/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /openrouteservice/i })).toBeInTheDocument()

    const keyInput = screen.getByLabelText(/api key/i)
    expect(keyInput).toHaveAttribute('type', 'password')
  })

  it('says what the app does before it asks for anything, on the screen a first-time visitor arrives at', () => {
    render(<CredentialsScreen onSubmit={vi.fn()} />)

    // This screen is the app's first impression and, for anyone who leaves
    // here, its only one (docs/DESIGN.md).
    expect(screen.getByRole('heading', { name: /draw a route/i })).toBeInTheDocument()
    expect(screen.getByText(/follows real streets/i)).toBeInTheDocument()
    // And the key is put as what it buys them, not as a toll.
    expect(screen.getByText(/no sign-up here/i)).toBeInTheDocument()
  })

  it('drops the pitch when reopened, where the visitor already has the app and wants one setting (US-005)', () => {
    render(<CredentialsScreen onSubmit={vi.fn()} onDismiss={vi.fn()} initialProvider="mapbox" />)

    expect(screen.getByRole('heading', { name: /change routing provider/i })).toBeInTheDocument()
    expect(screen.queryByText(/follows real streets/i)).not.toBeInTheDocument()
  })

  it('rejects an empty key without dismissing the screen, and explains what is missing (EDGE-003)', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<CredentialsScreen onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /start drawing/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/enter your api key/i)
  })

  it('rejects a whitespace-only key the same way (EDGE-003)', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<CredentialsScreen onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/api key/i), '   ')
    await user.click(screen.getByRole('button', { name: /start drawing/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('submits the selected provider and the trimmed key once both are supplied (US-001)', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<CredentialsScreen onSubmit={onSubmit} />)

    await user.selectOptions(screen.getByRole('combobox', { name: /routing provider/i }), 'mapbox')
    await user.type(screen.getByLabelText(/api key/i), '  pk.my-token  ')
    await user.click(screen.getByRole('button', { name: /start drawing/i }))

    expect(onSubmit).toHaveBeenCalledWith('mapbox', 'pk.my-token')
  })

  it('shows Mapbox-specific instructions for a public "pk." token when Mapbox is selected (US-003, FR-008)', async () => {
    const user = userEvent.setup()
    render(<CredentialsScreen onSubmit={vi.fn()} />)

    await user.selectOptions(screen.getByRole('combobox', { name: /routing provider/i }), 'mapbox')

    expect(screen.getByText(/public.*token/i)).toBeInTheDocument()
    expect(screen.getByText(/pk\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /account\.mapbox\.com/ })).toBeInTheDocument()
  })

  it('shows OpenRouteService-specific instructions for the dashboard API key when it is selected (US-003, FR-008)', async () => {
    const user = userEvent.setup()
    render(<CredentialsScreen onSubmit={vi.fn()} />)

    await user.selectOptions(screen.getByRole('combobox', { name: /routing provider/i }), 'openrouteservice')

    const instructions = screen.getByRole('region', { name: /how to get a openrouteservice key/i })
    expect(within(instructions).getByText(/dashboard/i)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /openrouteservice\.org/ }).length).toBeGreaterThan(0)
  })

  it('leaves no trace of the previous provider\'s instructions after switching (US-003 AC)', async () => {
    const user = userEvent.setup()
    render(<CredentialsScreen onSubmit={vi.fn()} />)

    await user.selectOptions(screen.getByRole('combobox', { name: /routing provider/i }), 'mapbox')
    expect(screen.getByRole('link', { name: /account\.mapbox\.com/ })).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /routing provider/i }), 'openrouteservice')

    expect(screen.queryByRole('link', { name: /mapbox\.com/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /openrouteservice\.org/ }).length).toBeGreaterThan(0)
  })

  it('states that the key stays in the browser, goes only to the chosen provider, and never reaches this app\'s operator (US-004 AC1)', () => {
    render(<CredentialsScreen onSubmit={vi.fn()} />)

    expect(screen.getByText(/stays in this browser/i)).toBeInTheDocument()
    expect(screen.getByText(/not (?:written to storage|stored)/i)).toBeInTheDocument()
    expect(screen.getByText(/never.*(?:this app|operator)/i)).toBeInTheDocument()
  })

  it('has no "remember me" affordance, and says a reload asks again (US-004 AC2)', () => {
    render(<CredentialsScreen onSubmit={vi.fn()} />)

    // No control to opt into being remembered — only prose explaining why.
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByRole('button', { name: /remember/i })).toBeNull()
    expect(screen.getByText(/no.*remember me/i)).toBeInTheDocument()
    expect(screen.getByText(/reload/i)).toBeInTheDocument()
  })

  it('tells the visitor to restrict their key to this app\'s domain (US-004 AC3)', () => {
    render(<CredentialsScreen onSubmit={vi.fn()} />)

    expect(screen.getByText(/restrict/i)).toBeInTheDocument()
    expect(screen.getByText(/domain/i)).toBeInTheDocument()
  })

  it('clears a previously entered key when the provider is switched (BR-004)', async () => {
    const user = userEvent.setup()
    render(<CredentialsScreen onSubmit={vi.fn()} />)

    await user.type(screen.getByLabelText(/api key/i), 'some-key')
    await user.selectOptions(screen.getByRole('combobox', { name: /routing provider/i }), 'mapbox')

    expect(screen.getByLabelText(/api key/i)).toHaveValue('')
  })

  it('preselects the given provider when reopened (US-005)', () => {
    render(<CredentialsScreen onSubmit={vi.fn()} initialProvider="mapbox" />)

    expect(screen.getByRole('combobox', { name: /routing provider/i })).toHaveValue('mapbox')
  })

  it('has no dismiss control on first entry, when nothing is configured yet (FR-001)', () => {
    render(<CredentialsScreen onSubmit={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })

  it('offers a dismiss control when reopened, that leaves credentials unchanged (US-005)', async () => {
    const onSubmit = vi.fn()
    const onDismiss = vi.fn()
    const user = userEvent.setup()
    render(<CredentialsScreen onSubmit={onSubmit} onDismiss={onDismiss} />)

    await user.type(screen.getByLabelText(/api key/i), 'typed-but-not-submitted')
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onDismiss).toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('still submits new credentials normally when reopened with a dismiss control present (US-005)', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<CredentialsScreen onSubmit={onSubmit} onDismiss={vi.fn()} initialProvider="openrouteservice" />)

    await user.type(screen.getByLabelText(/api key/i), 'a-working-key')
    await user.click(screen.getByRole('button', { name: /start drawing/i }))

    expect(onSubmit).toHaveBeenCalledWith('openrouteservice', 'a-working-key')
  })

  it('warns, before the key is typed, that an OpenRouteService key cannot be restricted and what a leak costs (003 US-003)', () => {
    render(<CredentialsScreen onSubmit={vi.fn()} initialProvider="openrouteservice" />)

    expect(screen.getByText(/cannot be restricted/i)).toBeInTheDocument()
    expect(screen.getByText(/usable from anywhere/i)).toBeInTheDocument()
    expect(screen.getByText(/blocked/i)).toBeInTheDocument()
  })

  it('accepts an OpenRouteService key and behaves as usual despite the warning (003 US-003 AC3)', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<CredentialsScreen onSubmit={onSubmit} initialProvider="openrouteservice" />)

    await user.type(screen.getByLabelText(/api key/i), 'a-real-key')
    await user.click(screen.getByRole('button', { name: /start drawing/i }))

    expect(onSubmit).toHaveBeenCalledWith('openrouteservice', 'a-real-key')
  })

  it('drops the OpenRouteService warning when Mapbox is selected instead (003 US-003 AC2)', async () => {
    const user = userEvent.setup()
    render(<CredentialsScreen onSubmit={vi.fn()} initialProvider="openrouteservice" />)
    expect(screen.getByText(/cannot be restricted/i)).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /routing provider/i }), 'mapbox')

    expect(screen.queryByText(/cannot be restricted/i)).not.toBeInTheDocument()
  })

  it('tells a Mapbox visitor to set URL restrictions to this app\'s own domain (003 US-004)', () => {
    render(<CredentialsScreen onSubmit={vi.fn()} initialProvider="mapbox" />)

    expect(screen.getByText(/url restriction/i)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(window.location.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument()
  })

  it('drops the Mapbox restriction step when OpenRouteService is selected instead (003 US-004 AC3)', async () => {
    const user = userEvent.setup()
    render(<CredentialsScreen onSubmit={vi.fn()} initialProvider="mapbox" />)
    expect(screen.getByText(/url restriction/i)).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /routing provider/i }), 'openrouteservice')

    expect(screen.queryByText(/url restriction/i)).not.toBeInTheDocument()
  })
})
