import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppMark } from './AppMark'

describe('AppMark', () => {
  it('names the app in text, not only in the glyph', () => {
    render(<AppMark />)

    // The mark is decorative; the name has to survive without it — including
    // for a screen reader, and for anyone who never loads the display font.
    expect(screen.getByText(/route/i)).toBeInTheDocument()
    expect(screen.getByText(/calculator/i)).toBeInTheDocument()
  })

  it('keeps the glyph out of the accessibility tree, since the name is beside it', () => {
    const { container } = render(<AppMark />)

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
