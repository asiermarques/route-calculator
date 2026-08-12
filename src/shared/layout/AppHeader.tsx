import type { ReactNode } from 'react'
import { useDisableMapClickPropagation } from '../map/useDisableMapClickPropagation'
import { AppMark } from '../brand/AppMark'
import styles from './AppHeader.module.css'

type AppHeaderProps = {
  /** The address search (`address-search`). */
  search: ReactNode
  /** The total distance (`route-drawing`) — the app's answer, and the reason
   * this bar exists at the size it does. */
  readout: ReactNode
}

/** The panel the route is *read* from: the app's name, the address search that
 * puts the map somewhere, and the distance it has measured — one panel rather
 * than three controls scattered into the map's corners. Everything that acts
 * on the route or on the app is in `AppFooter`, which is the toolbar half of
 * the same shell.
 *
 * It lives in `shared/` because it is the shell rather than a feature: the
 * slices whose controls it holds still don't know about each other, and
 * `App.tsx` is what fills the slots (docs/ARCHITECTURE.md).
 *
 * On a phone it stacks — name and distance on the first row, search across the
 * second — becomes a single row across the top at 44rem, and stands up into a
 * card in the top right corner at 60rem, where the footer has become a rail
 * down the left and the two face each other across the map (docs/DESIGN.md).
 * Like every overlay inside the map it stops its own clicks from reaching
 * Leaflet, which would otherwise read typing in the search field as a click on
 * the map and drop a waypoint under the bar. */
export function AppHeader({ search, readout }: AppHeaderProps) {
  const ref = useDisableMapClickPropagation<HTMLElement>()

  return (
    <header ref={ref} className={styles.header}>
      <div className={styles.brand}>
        <AppMark />
      </div>
      <div className={styles.search}>{search}</div>
      <div className={styles.readout}>{readout}</div>
    </header>
  )
}
