import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMap } from 'react-leaflet'
import { geocodeAddress } from './geocode'
import styles from './AddressSearchBar.module.css'

const MATCH_ZOOM = 16

type Status = { kind: 'idle' } | { kind: 'searching' } | { kind: 'error'; message: string }

/** Address input overlaid on the map. Submitting geocodes the query via
 * Nominatim and centres the map on the best match (FR-001). It only ever
 * moves the view — it never creates a waypoint (BR-001). Search is
 * submit-triggered, never per keystroke, per Nominatim's usage policy. */
export function AddressSearchBar() {
  const map = useMap()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
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

  return (
    <form className={styles.bar} onSubmit={handleSubmit}>
      <label className={styles.label} htmlFor="address-search-input">
        Address
      </label>
      <input
        id="address-search-input"
        className={styles.input}
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search for an address"
      />
      <button className={styles.button} type="submit" disabled={status.kind === 'searching'}>
        {status.kind === 'searching' ? 'Searching…' : 'Search'}
      </button>
      {status.kind === 'error' && <p className={styles.message}>{status.message}</p>}
    </form>
  )
}
