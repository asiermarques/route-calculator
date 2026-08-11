import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WaypointOptionsPanel } from './WaypointOptionsPanel'

const NO_STYLE = {}
const ORIGIN_STYLE = { left: 0, top: 0 }
const PIXEL_STYLE = { left: '42px', top: '17px' }

describe('WaypointOptionsPanel', () => {
  it('offers delete and move for the waypoint, and nothing else', () => {
    render(<WaypointOptionsPanel style={ORIGIN_STYLE} onDelete={vi.fn()} onMove={vi.fn()} />)

    expect(screen.getByRole('group', { name: /waypoint options/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /move/i })).toBeInTheDocument()
  })

  it('calls onDelete when Delete is pressed', async () => {
    const onDelete = vi.fn()
    const user = userEvent.setup()
    render(<WaypointOptionsPanel style={NO_STYLE} onDelete={onDelete} onMove={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /delete/i }))

    expect(onDelete).toHaveBeenCalled()
  })

  it('calls onMove when Move is pressed', async () => {
    const onMove = vi.fn()
    const user = userEvent.setup()
    render(<WaypointOptionsPanel style={NO_STYLE} onDelete={vi.fn()} onMove={onMove} />)

    await user.click(screen.getByRole('button', { name: /move/i }))

    expect(onMove).toHaveBeenCalled()
  })

  it('positions itself using the style it is given, anchoring it to the waypoint', () => {
    render(<WaypointOptionsPanel style={PIXEL_STYLE} onDelete={vi.fn()} onMove={vi.fn()} />)

    const panel = screen.getByRole('group', { name: /waypoint options/i })
    expect(panel.style.left).toBe('42px')
    expect(panel.style.top).toBe('17px')
  })
})
