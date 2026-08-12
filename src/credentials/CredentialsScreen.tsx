import { useState } from 'react'
import type { FormEvent } from 'react'
import { PROVIDER_NAMES } from '../shared/routing/config'
import type { ProviderName } from '../shared/routing/config'
import { PROVIDER_INFO } from './providerInfo'
import { AppMark } from '../shared/brand/AppMark'
import styles from './CredentialsScreen.module.css'

const ERROR_ID = 'credentials-key-error'

/** A provider URL as a link label: no scheme, no `www.`, and nothing after the
 * fragment, which on OpenRouteService's dashboard is client-side routing and
 * says nothing to the person reading it. The link still goes to the full URL —
 * this is only what it reads as. A screen that a first-time visitor is meeting
 * the app through can't afford three lines of raw URL wrapped mid-token. */
function linkLabel(url: string): string {
  return url
    .replace(/^https?:\/\/(?:www\.)?/, '')
    .replace(/\/?#.*$/, '')
    .replace(/\/$/, '')
}

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
 * the provider's own site.
 *
 * On a public deploy this is the app's first screen, and for a first-time
 * visitor it is the *only* screen: it therefore has to say what the app does
 * before it asks for anything, and put the key in terms of what the visitor
 * gets — their own free routing account, no sign-up here, no quota shared with
 * strangers — rather than as a toll to be justified. What it says about the
 * key's safety is the same as it always was (US-004, ADR-0002); what it no
 * longer does is lead with it.
 *
 * Reopened, it is a different errand — the visitor has the app and wants to
 * change one setting — so the pitch is dropped and the heading names the task
 * instead. `onDismiss` is what tells the two apart: it exists only when there
 * are credentials to fall back to, which is exactly when this is not a first
 * visit. */
export function CredentialsScreen({ onSubmit, initialProvider, onDismiss }: CredentialsScreenProps) {
  const [provider, setProvider] = useState<ProviderName>(initialProvider ?? PROVIDER_NAMES[0])
  const [apiKey, setApiKey] = useState('')
  const [touched, setTouched] = useState(false)

  const info = PROVIDER_INFO[provider]
  const isReopened = onDismiss !== undefined
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
        {/* On a public deploy this screen is the app's first impression, and
          * the only one shown before the map exists — so it carries the name. */}
        <div className={styles.brand}>
          <AppMark size="screen" />
        </div>
        {isReopened ? (
          <h1 className={styles.heading}>Change routing provider</h1>
        ) : (
          <>
            <h1 className={styles.heading}>Draw a route. Get the distance.</h1>
            <p className={styles.intro}>
              Click along the map and every leg follows real streets, so the kilometres are
              the ones you&rsquo;d actually run, ride or walk.
            </p>
            <p className={styles.intro}>
              It routes on a free account of your own — no sign-up here, no quota shared
              with anyone else. Two minutes, once:
            </p>
          </>
        )}

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
          <ol className={styles.steps}>
            <li>
              Create a free account at{' '}
              <a href={info.signupUrl} target="_blank" rel="noreferrer">
                {linkLabel(info.signupUrl)}
              </a>
              .
            </li>
            <li>
              Copy {info.credentialKind}, from{' '}
              <a href={info.keyPageUrl} target="_blank" rel="noreferrer">
                {linkLabel(info.keyPageUrl)}
              </a>
              .
            </li>
            {info.restrictionStep && <li>{info.restrictionStep(domain)}</li>}
          </ol>
          <p className={styles.freeTier}>{info.freeTierNote}</p>
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
          Your key stays in this browser tab: it goes to {info.label} and never to this
          app&rsquo;s own server, and it is not written to storage anywhere — so there is
          no &ldquo;remember me&rdquo;, and a reload asks again.
        </p>

        <div className={styles.actions}>
          {/* Named for what it opens, not for the form it submits: this is the
            * one button between a first-time visitor and the thing they came
            * for, and "Continue" describes the screen's plumbing rather than
            * theirs. It reads the same on the reopened screen, where changing
            * a provider is also on the way back to drawing. */}
          <button className={styles.button} type="submit">
            Start drawing
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
