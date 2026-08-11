import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouteControls } from './RouteControls'

describe('RouteControls', () => {
  it('calls onUndo when Undo is clicked', async () => {
    const onUndo = vi.fn()
    const user = userEvent.setup()
    render(<RouteControls canUndo canClear onUndo={onUndo} onClear={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /undo/i }))

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

    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /clear/i })).toBeDisabled()
  })
})
