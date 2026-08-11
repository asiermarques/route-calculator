import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMap } from 'react-leaflet'
import { geocodeAddress } from './geocode'
import { useDisableMapClickPropagation } from '../shared/map/useDisableMapClickPropagation'
import a11y from '../shared/design/a11y.module.css'
import styles from './AddressSearchBar.module.css'

const MATCH_ZOOM = 16
const ERROR_ID = 'address-search-error'

type Status = { kind: 'idle' } | { kind: 'searching' } | { kind: 'error'; message: string }

/** Address input overlaid on the map. Submitting geocodes the query via
 * Nominatim and centres the map on the best match (FR-001). It only ever
 * moves the view — it never creates a waypoint (BR-001). Search is
 * submit-triggered, never per keystroke, per Nominatim's usage policy. */
export function AddressSearchBar() {
  const map = useMap()
  const formRef = useDisableMapClickPropagation<HTMLFormElement>()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    // An empty submit has nothing to geocode, and Nominatim's usage policy
    // asks for a reasonable request rate — don't spend a call on it.
    if (query.trim() === '') return

    setStatus({ kind: 'searching' })

    try {
      const match = await geocodeAddress(query)
      if (match === null) {
        setStatus({ kind: 'error', message: 'Address not found.' })
        return
      }
      map.setView([match.lat, match.lon], MATCH_ZOOM)
      setStatus({ kind: 'idle' })
    } catch {
      setStatus({ kind: 'error', message: 'Address search is unavailable right now. Try again.' })
    }
  }

  const hasError = status.kind === 'error'

  return (
    <form ref={formRef} className={styles.bar} onSubmit={handleSubmit} aria-label="Address search">
      <label className={a11y.visuallyHidden} htmlFor="address-search-input">
        Address
      </label>
      <input
        id="address-search-input"
        className={styles.input}
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search for an address"
        aria-describedby={hasError ? ERROR_ID : undefined}
        aria-invalid={hasError || undefined}
      />
      <button className={styles.button} type="submit" disabled={status.kind === 'searching'}>
        {status.kind === 'searching' ? 'Searching…' : 'Search'}
      </button>
      {/* Progress lives in a region that is always mounted, so a screen reader
       * is already observing it when the search starts — the button's own
       * label change would go unannounced, since it is disabled by then. */}
      <p className={a11y.visuallyHidden} role="status">
        {status.kind === 'searching' ? 'Searching for the address…' : ''}
      </p>
      {hasError && (
        <p id={ERROR_ID} className={styles.message} role="alert">
          {status.message}
        </p>
      )}
    </form>
  )
}
