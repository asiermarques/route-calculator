import { useState } from 'react'
import type { FormEvent } from 'react'
import { PROVIDER_NAMES } from '../shared/routing/config'
import type { ProviderName } from '../shared/routing/config'
import { PROVIDER_INFO } from './providerInfo'
import styles from './CredentialsScreen.module.css'

const ERROR_ID = 'credentials-key-error'

type CredentialsScreenProps = {
  onSubmit: (provider: ProviderName, apiKey: string) => void
  /** Preselects this provider instead of the first in the list — used when
   * reopening the screen to correct a mistake, so the visitor's own choice
   * is still there (US-005). */
  initialProvider?: ProviderName
  /** When given, the screen offers a way to close it without submitting,
   * leaving whatever credentials are already in use unchanged (US-005).
   * Omitted on first entry, when nothing is configured yet and there is
   * nothing to fall back to (FR-001). */
  onDismiss?: () => void
}

/** Collects a routing provider and its API key (FR-001–FR-003): blocking on
 * first entry, or reopenable from the running app to correct a mistake
 * (US-005). Carries the how-to-get-a-key instructions for the selected
 * provider inline (US-003) and states what happens to the key (US-004), so
 * a first-time visitor can finish without leaving the page for anything but
 * the provider's own site. */
export function CredentialsScreen({ onSubmit, initialProvider, onDismiss }: CredentialsScreenProps) {
  const [provider, setProvider] = useState<ProviderName>(initialProvider ?? PROVIDER_NAMES[0])
  const [apiKey, setApiKey] = useState('')
  const [touched, setTouched] = useState(false)

  const info = PROVIDER_INFO[provider]
  const trimmedKey = apiKey.trim()
  const isKeyMissing = touched && trimmedKey === ''
  // The domain a Mapbox visitor restricts their token to is this
  // deployment's own — showing it beats telling them to work it out (003
  // US-004).
  const domain = window.location.origin

  function handleProviderChange(next: ProviderName) {
    setProvider(next)
    // BR-004: a key is never carried across a provider change.
    setApiKey('')
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (trimmedKey === '') return
    onSubmit(provider, trimmedKey)
  }

  return (
    <div className={styles.screen}>
      <form className={styles.form} onSubmit={handleSubmit} aria-label="Routing provider credentials">
        <h1 className={styles.heading}>Connect a routing provider</h1>
        <p className={styles.intro}>
          Drawing a route needs a routing provider&rsquo;s API key. Pick a provider and
          paste your own key — your routes are computed against your quota, not
          this app&rsquo;s.
        </p>

        <label className={styles.field}>
          <span>Routing provider</span>
          <select
            className={styles.select}
            value={provider}
            onChange={(event) => handleProviderChange(event.target.value as ProviderName)}
          >
            {PROVIDER_NAMES.map((name) => (
              <option key={name} value={name}>
                {PROVIDER_INFO[name].label}
              </option>
            ))}
          </select>
        </label>

        <section className={styles.instructions} aria-label={`How to get a ${info.label} key`}>
          <p>
            1. Create a free account at{' '}
            <a href={info.signupUrl} target="_blank" rel="noreferrer">
              {info.signupUrl}
            </a>
            .
          </p>
          <p>
            2. Generate {info.credentialKind}, from{' '}
            <a href={info.keyPageUrl} target="_blank" rel="noreferrer">
              {info.keyPageUrl}
            </a>
            .
          </p>
          <p>{info.freeTierNote}</p>
          {info.restrictionStep && <p>3. {info.restrictionStep(domain)}</p>}
        </section>

        {info.unrestrictableWarning && (
          <p className={styles.warning} role="note">
            {info.unrestrictableWarning}
          </p>
        )}

        <label className={styles.field}>
          <span>API key</span>
          <input
            className={styles.input}
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            aria-describedby={isKeyMissing ? ERROR_ID : undefined}
            aria-invalid={isKeyMissing || undefined}
          />
        </label>
        {isKeyMissing && (
          <p id={ERROR_ID} className={styles.message} role="alert">
            Enter your API key to continue.
          </p>
        )}

        <p className={styles.privacy}>
          Your key stays in this browser tab. It is sent only to {info.label} —
          never to this app&rsquo;s own server — and is not written to storage
          anywhere, so there is no &ldquo;remember me&rdquo;: reloading this page
          will ask again.
        </p>

        <div className={styles.actions}>
          <button className={styles.button} type="submit">
            Continue
          </button>
          {onDismiss && (
            <button className={styles.cancelButton} type="button" onClick={onDismiss}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
