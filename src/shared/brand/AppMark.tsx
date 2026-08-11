import styles from './AppMark.module.css'

type AppMarkProps = {
  /** Renders the lockup at the size of a screen title rather than of a
   * control row — used by the credentials screen, which is the whole page
   * when a visitor first arrives. */
  size?: 'rail' | 'screen'
}

/** The app's name and mark, as one lockup. Shared rather than owned by a
 * slice: it appears on the headline rail over the map (`DistanceReadout`) and
 * on the credentials screen, which is the first thing a visitor sees on a
 * public deploy.
 *
 * The glyph is inline SVG, not an `<img>`: it takes its colours from the
 * design tokens like every other mark on screen, and it costs no request under
 * a policy whose `img-src` exists for map tiles. It draws what the app does —
 * a route, turning, with a node at each end. */
export function AppMark({ size = 'rail' }: AppMarkProps) {
  return (
    <span className={size === 'screen' ? `${styles.lockup} ${styles.screen}` : styles.lockup}>
      {/* Decorative: the name is right beside it in text, so a screen reader
        * announcing the glyph too would only say it twice. */}
      <svg className={styles.glyph} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path
          className={styles.line}
          d="M7 25.5 L15.5 21.5 L12 13.5 L25 8"
          fill="none"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle className={styles.node} cx="7" cy="25.5" r="3.4" strokeWidth="1.8" />
        <circle className={styles.node} cx="25" cy="8" r="4.2" strokeWidth="1.8" />
      </svg>
      <span className={styles.wordmark}>
        <span className={styles.name}>Route</span>{' '}
        <span className={styles.qualifier}>Calculator</span>
      </span>
    </span>
  )
}
