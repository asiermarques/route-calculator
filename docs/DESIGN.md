# Design

A minimal token set for a one-screen app: the map fills the viewport, and a
small number of overlay controls (address search, distance readout, undo,
clear) sit on top of it, plus the drawn route itself. Nothing here is more
elaborate than that scope needs.

## Tokens

Defined as CSS custom properties in `src/shared/design/tokens.css`, loaded
once globally. Every component's CSS module reads these — no raw hex/rgb
values or bare pixel spacing in component styles.

| Token | Value | Use |
| --- | --- | --- |
| `--color-surface` | `#ffffff` | Background of overlay panels (search bar, readout). |
| `--color-text` | `#1a1a1a` | Default text on a surface. |
| `--color-border` | `#cccccc` | Input/panel borders. |
| `--color-accent` | `#1a73e8` | Primary action (submit, buttons). |
| `--color-accent-text` | `#ffffff` | Text on an accent background. |
| `--color-error` | `#b3261e` | Error/not-found messaging. |
| `--color-focus` | `#0b57d0` | Keyboard focus ring, app-wide. |
| `--color-shadow` | `rgba(0, 0, 0, 0.3)` | Overlay panel shadow. |
| `--color-route` | `#1a73e8` | The drawn, snapped path. |
| `--color-waypoint` | `#d93025` | Waypoint markers — distinct from the path (FR-005). |
| `--color-waypoint-selected` | `#f9ab00` | The waypoint whose options are open or whose move is armed — distinct from both `--color-waypoint` and `--color-route` (FR-014). |
| `--space-xs` | `0.4rem` | Tight internal padding. |
| `--space-sm` | `0.5rem` | Default gap between controls. |
| `--space-md` | `0.75rem` | Panel padding. |
| `--space-lg` | `1rem` | Panel offset from the viewport edge. |
| `--size-control-row` | `2.75rem` | Minimum size of any interactive control, and the height of one row of them for stacking one panel above another. The two are deliberately one number — see the touch-target rule below. |
| `--size-readout-column` | `6rem` | Width the distance readout claims in the top-right, and that the address bar stops short of. |
| `--space-map-bottom` | `2.5rem` | Bottom offset that clears Leaflet's attribution strip. |
| `--space-map-bottom-right` | `6rem` | Bottom offset that clears Leaflet's attribution *and* its zoom control. |
| `--radius` | `0.25rem` | Inputs, buttons. |
| `--radius-lg` | `0.5rem` | Panels. |
| `--font-ui` | `14px/1.4 system-ui, sans-serif` | All overlay UI text. |
| `--font-ui-field` | `16px/1.4 system-ui, sans-serif` | Every `input` and `select`, and nothing else — see the field-size rule below. |
| `--z-overlay` | `1000` | Overlay controls above Leaflet's own panes. |
| `--z-modal` | `1100` | The credentials screen when reopened over the running app — above every `--z-overlay` control, not just the map. |

## Rules

- No raw colour or spacing literals in component CSS modules — go through a
  token, or add one here first if the value is genuinely new.
- **A phone is the small case this layout has to survive, not an afterthought.**
  The map fills the viewport and every control floats on top of it, so nothing
  here reflows or errors when the screen gets small — it just becomes too small
  to hit, or drifts off an edge where no scrollbar can reach it. The rules that
  follow are what keep that from happening, and `e2e/mobile.spec.ts` holds them
  in place at phone sizes with touch emulation on (`overlay-layout.spec.ts`
  separately checks that overlays don't cover each other at three widths).
- **Everything is `border-box`** (`src/index.css`). Overlay controls are sized
  by a minimum height that doubles as the row height the corner-stacking
  offsets are computed from; under `content-box` that height would exclude
  padding, making every control taller than its own token and every offset
  built on it short by the same amount.
- **Nothing interactive is smaller than `--size-control-row` (44px).** That
  covers buttons, text fields and selects, and it is the same token as the
  overlay row height precisely so a row of controls and the offset that stacks
  something above it can never drift apart. Leaflet's own zoom buttons are the
  exception, at its default 30px: restyling a third-party control's internals
  is a bigger commitment than this app needs, and they sit alone in their
  corner.
- **`input` and `select` use `--font-ui-field` (16px), not `--font-ui`.**
  Mobile Safari zooms the page in when a field with text under 16px takes
  focus, and does not zoom back out when it loses focus — on a full-viewport
  map that strands the visitor at a scale they never chose. This is the only
  reason the two font tokens differ; buttons and body text stay on
  `--font-ui`.
- **An overlay panel that can outgrow the viewport scrolls to both ends.** A
  flex item centred along an axis it overflows spills past the *start* edge of
  its scroll container as well as the end, and that half is unreachable — no
  scrollbar goes there. The credentials screen centres its form with `margin:
  auto` on the form rather than `align-items`/`justify-content` on the
  scroller, which centres when it fits and falls back to top-aligned when it
  doesn't.
- Overlay controls (anything that sits on top of the map) use `--z-overlay`
  so they consistently stack above Leaflet's internal panes and controls.
- **Nothing may be positioned so that it covers another control**, Leaflet's
  own zoom buttons and attribution included — stacking above them is what
  `--z-overlay` does, and a control drawn over another is a control the user
  cannot press. The bottom-right corner belongs to Leaflet, so app overlays
  there start at `--space-map-bottom-right`; elsewhere along the bottom edge,
  `--space-map-bottom` is enough to clear the attribution. The current
  placement is: address search top-left, distance readout top-right,
  undo/clear bottom-right above Leaflet's controls, add-waypoint bottom-left,
  routing status above everything else along the bottom, and "change routing
  provider" stacked directly below the distance readout, in the same
  top-right column — a single-glyph button no wider than the readout itself,
  since anything wider there would reach into the gap the address bar's
  `max-width` is computed to stop short of. `e2e/overlay-layout.spec.ts`
  asserts they stay apart at phone, tablet and desktop widths.
- The credentials screen breaks the "everything lives inside the map" pattern
  by design: on first load it *is* the whole page, since no map exists yet to
  sit on top of. Reopened (US-005) it becomes a full-viewport modal over the
  running app instead, on `--z-modal` — one level above `--z-overlay` — so it
  sits above every overlay control, not only the map underneath them.
- Dark mode / theming is out of scope for the first version — one palette,
  matching the product's "one screen, one job" principle. `src/index.css`
  therefore declares `color-scheme: light`: with `light dark`, the browser
  would draw form controls from the OS theme while every panel around them
  stayed on these light tokens.
- One focus ring for the whole app, declared once on `:focus-visible` in
  `src/index.css` so Leaflet's own controls get it too. Overlay panels sit on
  a busy map, so the keyboard position has to stay obvious — components do not
  remove or restyle it.
- Text that exists only for assistive technology uses the shared
  `visuallyHidden` class in `src/shared/design/a11y.module.css`, imported
  alongside the component's own module. It is for labelling something the
  screen already
  conveys visually (the distance readout's "Total distance:"), never for
  hiding content sighted users are meant to have.
- Leaflet vector layers (the route polyline, waypoint markers) take their
  color from these same tokens via `var(--token-name)`, not a hex literal in
  the component — Leaflet's SVG renderer resolves CSS custom properties in
  path attributes the same as it would in a stylesheet.
- **Cursor conveys what a click will do** (`004-waypoint-edit-affordances`).
  Over the map background the cursor is a crosshair — a click places a
  waypoint there — overriding Leaflet's own `grab`/`grabbing` cursor, which
  otherwise implies the map is for panning first. This is a knowing trade: the
  override uses `cursor: crosshair !important` on `.leaflet-container` in
  `MapView.module.css`, the only reliable way to beat classes Leaflet itself
  toggles (on the container while idle, on `<body>` while actively dragging)
  regardless of stylesheet load order — panning itself is untouched, only the
  cursor changes. Over a waypoint marker the cursor is a pointer instead
  (Leaflet's own `.leaflet-interactive` rule already provides this — a rule
  that directly matches an element always wins over an inherited value, so no
  extra override is needed there). While a move is armed (US-004) the map
  cursor is `move` instead of the crosshair, so it never promises a new
  waypoint where the click will relocate one; `RouteLayer` sets this directly
  on the Leaflet container via an inline style with `!important` priority —
  the one thing guaranteed to beat the stylesheet's own `!important` crosshair
  regardless of rule order. Cursor keywords are not colour or spacing values,
  so they are not tokenised — this rule is their record. None of this exists
  on touch, which has no cursor; there, the marked waypoint below is what
  carries the same information.
- **A waypoint marker is drawn at the size the pointer needs** (`RouteLayer`,
  `useCoarsePointer`): radius 6 for a mouse, 11 where `(pointer: coarse)`
  matches. Leaflet hit-tests a vector marker against exactly the circle it
  paints — there is no invisible padding to widen — so the drawn size *is* the
  tap target, and the mouse size is a 12px target on a phone. The touch size
  is the dot itself rather than a transparent halo around it, both because a
  bigger dot is easier to see on a small screen and because a hit area larger
  than the mark would swallow taps meant for the map beside it. This is the one
  place a size is set in JavaScript rather than by a stylesheet, since Leaflet
  takes the radius as a number.
- **The route line is not interactive** (`interactive={false}` on the
  `Polyline`). It answers no clicks of its own — a tap on it means the same as
  a tap on the map underneath — and left interactive it is a large target lying
  directly under every waypoint, so a click meant for a marker resolves to the
  line, bubbles to the map, and appends a waypoint instead of opening the
  options for the one that was aimed at. `bringToBack()` fixes the paint order
  but not this: the line stays hit-testable wherever it is drawn. Note this is
  a layer-construction option, not a style — inside `pathOptions` it would be
  applied via `setStyle` and silently do nothing.
- **The marked waypoint** (`004-waypoint-edit-affordances`, FR-014) is the
  waypoint whose options are open, or whose move is armed — styled with
  `--color-waypoint-selected` instead of `--color-waypoint` so it reads
  unambiguously even when two markers overlap, and so it can stand in for the
  cursor rule above on touch, which has no hover or cursor at all.
- **The waypoint options panel** (`004-waypoint-edit-affordances`) opens
  anchored to the waypoint it belongs to — anchoring alone doesn't separate
  two overlapping markers, which is what the marked waypoint above is for. It
  positions itself on whichever side of the marker points back toward the
  centre of the map (the half of the viewport the marker isn't in), so it
  grows away from the edges every fixed overlay and Leaflet's own zoom/
  attribution controls live along, rather than reaching toward them. Editing a
  waypoint (opening its options, deleting it, arming and completing a move) is
  pointer/touch-only by deliberate decision — undo and clear remain the
  keyboard-reachable correction path (`AddWaypointControl`'s precedent does
  not extend here).
