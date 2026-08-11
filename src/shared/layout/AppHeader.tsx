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
  /** Anything that configures the app rather than drawing a route, currently
   * the way back to the credentials screen (`credentials`). */
  actions?: ReactNode
}

/** The one bar the app is operated from: its name, the address search, the
 * distance it has measured, and the settings way out — a single panel over the
 * top of the map, rather than four controls scattered into its corners.
 *
 * It lives in `shared/` because it is the shell rather than a feature: the
 * three slices whose controls it holds still don't know about each other, and
 * `App.tsx` is what fills the slots (docs/ARCHITECTURE.md).
 *
 * On a phone it stacks — name and distance on the first row, search across the
 * second — and becomes a single row once there is width for one (docs/DESIGN.md).
 * Like every overlay inside the map it stops its own clicks from reaching
 * Leaflet, which would otherwise read typing in the search field as a click on
 * the map and drop a waypoint under the bar. */
export function AppHeader({ search, readout, actions }: AppHeaderProps) {
  const ref = useDisableMapClickPropagation<HTMLElement>()

  return (
    <header ref={ref} className={styles.header}>
      <div className={styles.brand}>
        <AppMark />
      </div>
      <div className={styles.search}>{search}</div>
      <div className={styles.readout}>{readout}</div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  )
}
