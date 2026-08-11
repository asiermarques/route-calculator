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
