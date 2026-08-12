import type { ReactNode } from 'react'
import { useDisableMapClickPropagation } from '../map/useDisableMapClickPropagation'
import { AppMark } from '../brand/AppMark'
import styles from './AppHeader.module.css'

type AppHeaderProps = {
  /** The address search (`address-search`). */
  search: ReactNode
  /** The locate control (`locate-position`) — a second way to put the map
   * somewhere, so it shares the search row rather than getting a slot of its
   * own (005 UX requirements). */
  locate: ReactNode
  /** The total distance (`route-drawing`) — the app's answer, and the reason
   * this bar exists at the size it does. */
  readout: ReactNode
}

/** The panel the route is *read* from: the app's name, the two ways to put the
 * map somewhere — the address search and the locate control beside it — and
 * the distance measured, gathered into one corner rather than scattered into
 * four. Everything that acts on the route or on the app is in
 * `AppFooter`, which is the toolbar half of the same shell; positioning the
 * map is neither, which is why locate sits here and not there
 * (docs/DESIGN.md).
 *
 * It lives in `shared/` because it is the shell rather than a feature: the
 * slices whose controls it holds still don't know about each other, and
 * `App.tsx` is what fills the slots (docs/ARCHITECTURE.md).
 *
 * On a phone it stacks — name and distance on the first row, search and
 * locate across the second — and becomes a single row across the top at 44rem.
 * At 60rem it stops being one panel at all: the `<header>` becomes the frame
 * two panels are stacked in, in the top right corner, where the footer has
 * become a rail down the left and the two face each other across the map. Both
 * arrangements come out of this one set of markup — the wrapper around the
 * wordmark and the search row is `display: contents` until it becomes a panel
 * of its own, so a phone lays out exactly as it did when the header was one
 * box (docs/DESIGN.md), the same device `AppFooter` uses for its own two
 * arrangements.
 *
 * Like every overlay inside the map it stops its own clicks from reaching
 * Leaflet, which would otherwise read typing in the search field as a click on
 * the map and drop a waypoint under the bar. That still holds once it is a
 * frame: it draws nothing and answers nothing itself, but events from the
 * panels inside it still bubble through. */
export function AppHeader({ search, locate, readout }: AppHeaderProps) {
  const ref = useDisableMapClickPropagation<HTMLElement>()

  return (
    <header ref={ref} className={styles.header}>
      <div className={styles.find}>
        <div className={styles.brand}>
          <AppMark />
        </div>
        <div className={styles.search}>
          {search}
          {locate}
        </div>
      </div>
      <div className={styles.readout}>{readout}</div>
    </header>
  )
}
