import { useDisableMapClickPropagation } from '../shared/map/useDisableMapClickPropagation'
import styles from './ReopenCredentialsButton.module.css'

type ReopenCredentialsButtonProps = {
  onClick: () => void
}

/** Always-reachable way back to the credentials screen (US-005), so a
 * visitor who mistyped a key or picked the wrong provider can correct it
 * without reloading and losing the route they've drawn. It sits at the end of
 * the footer's tool row, beside undo and clear (docs/DESIGN.md): changing the
 * provider is something the visitor does to the app, and the footer is the bar
 * things are done from — the header only reports.
 *
 * A single glyph rather than a text label, because it is the one control there
 * that isn't part of drawing a route: a third uppercase label would compete
 * with the two that are, and a phone's tool row has no width to give it. It is
 * therefore the only control in either bar that is icon-only in *both*
 * arrangements, which is why its name is a tooltip in both — the corrections
 * beside it only need one in the rail, where their labels come off their faces
 * (docs/DESIGN.md).
 *
 * The name is a `<span>` on screen and not an `aria-label`, the same choice
 * `RouteControls` makes for the same reason: the visible sentence *is* the
 * accessible name, so the two cannot drift apart, and it is hidden with
 * `opacity` rather than `display`/`visibility` so it stays in the
 * accessibility tree while it is not drawn. */
export function ReopenCredentialsButton({ onClick }: ReopenCredentialsButtonProps) {
  const ref = useDisableMapClickPropagation<HTMLDivElement>()

  return (
    <div ref={ref} className={styles.control}>
      <button className={styles.button} type="button" onClick={onClick}>
        {/* A drawn gear rather than the ⚙️ emoji: an emoji is rendered by the
          * platform's own font, at its own colours, and lands as a small
          * coloured picture in the one corner of an otherwise monochrome
          * palette. This one inherits `currentColor` like every other glyph.
          *
          * Eight teeth and a hub ring, at the same 1.9 stroke as the undo arrow
          * and the waste basket beside it. The tooth depth (root 7.0, tip 9.5)
          * is set against that stroke rather than against the viewBox: at the
          * 20px this is actually drawn at, a shallower cog closes up into a
          * blob and a finer one loses the teeth altogether. */}
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M 18.7 10.1 L 21.3 10.3 L 21.3 13.7 L 18.7 13.9 L 18.1 15.4 L 19.8 17.4 L 17.4 19.8 L 15.4 18.1 L 13.9 18.7 L 13.7 21.3 L 10.3 21.3 L 10.1 18.7 L 8.6 18.1 L 6.6 19.8 L 4.2 17.4 L 5.9 15.4 L 5.3 13.9 L 2.7 13.7 L 2.7 10.3 L 5.3 10.1 L 5.9 8.6 L 4.2 6.6 L 6.6 4.2 L 8.6 5.9 L 10.1 5.3 L 10.3 2.7 L 13.7 2.7 L 13.9 5.3 L 15.4 5.9 L 17.4 4.2 L 19.8 6.6 L 18.1 8.6 Z" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
        <span className={styles.label}>Change routing provider</span>
      </button>
    </div>
  )
}
