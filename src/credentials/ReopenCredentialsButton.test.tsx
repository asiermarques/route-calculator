import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReopenCredentialsButton } from './ReopenCredentialsButton'

describe('ReopenCredentialsButton', () => {
  it('opens the credentials screen when clicked (US-005)', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<ReopenCredentialsButton onClick={onClick} />)

    await user.click(screen.getByRole('button', { name: /change routing provider/i }))

    expect(onClick).toHaveBeenCalled()
  })

  it('is named by text on screen rather than by an aria-label, so the two cannot drift', () => {
    render(<ReopenCredentialsButton onClick={vi.fn()} />)

    // The glyph is a gear, which says "this configures something" and nothing
    // about what — so the sentence that says it is a real element, hidden with
    // opacity by the stylesheet and never taken out of the accessibility tree.
    const button = screen.getByRole('button', { name: /change routing provider/i })
    expect(button).not.toHaveAttribute('aria-label')
    expect(button).toContainElement(screen.getByText('Change routing provider'))
  })

  it('is reachable from the keyboard alone, like every other control', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<ReopenCredentialsButton onClick={onClick} />)

    await user.tab()
    expect(screen.getByRole('button', { name: /change routing provider/i })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onClick).toHaveBeenCalled()
  })
})
