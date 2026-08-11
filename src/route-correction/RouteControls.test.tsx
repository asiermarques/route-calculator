import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouteControls } from './RouteControls'

describe('RouteControls', () => {
  it('calls onUndo when Undo is clicked', async () => {
    const onUndo = vi.fn()
    const user = userEvent.setup()
    render(<RouteControls canUndo canClear onUndo={onUndo} onClear={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /remove last waypoint/i }))

    expect(onUndo).toHaveBeenCalled()
  })

  it('calls onClear when Clear is clicked', async () => {
    const onClear = vi.fn()
    const user = userEvent.setup()
    render(<RouteControls canUndo canClear onUndo={vi.fn()} onClear={onClear} />)

    await user.click(screen.getByRole('button', { name: /clear/i }))

    expect(onClear).toHaveBeenCalled()
  })

  it('disables both controls when the route is empty', () => {
    render(<RouteControls canUndo={false} canClear={false} onUndo={vi.fn()} onClear={vi.fn()} />)

    expect(screen.getByRole('button', { name: /remove last waypoint/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /clear/i })).toBeDisabled()
  })

  it('states its effect rather than implying it reverses an edit (FR-015)', () => {
    render(<RouteControls canUndo canClear onUndo={vi.fn()} onClear={vi.fn()} />)

    const button = screen.getByRole('button', { name: /remove last waypoint/i })
    // The accessible name comes from the visible label itself, not a separate
    // aria-label — so a screen reader hears exactly what a sighted user reads.
    expect(button).toHaveAccessibleName(button.textContent!)
  })
})
