# Design

## The idea

The app draws a route to answer one question — how many kilometres is it — so
the design is built around two things being the loudest on the screen: **the
route**, and **the number**. Everything else is instrument housing.

That gives the app its look: the map is the only bright surface, every control
is a dark panel floating over it, and one high-visibility accent — the colour
of a race bib or a track marking — belongs to the route, the distance unit, and
the primary action, and to nothing else. The contrast is not decoration: a pale
panel over pale map tiles has no edge, a dark one always does.

The controls are gathered into **two bars** rather than scattered into the
map's corners: `AppHeader` along the top for everything that describes the
route — the app's name, the address search, the total distance, the way back to
the credentials screen — and `AppFooter` along the bottom for everything that
acts on it: add-waypoint, undo/clear, and the routing status. Both are in
`src/shared/layout/`. Nothing else floats: the corner that is left is Leaflet's
own, for its attribution. Two bars and an untouched map
between them is the whole layout.

## Type

Two families, both self-hosted from `public/fonts/` and declared in
`src/shared/design/fonts.css`. **They are never loaded from a font CDN**: a
third-party origin on this page is exactly what `CLAUDE.md` forbids while the
app holds a visitor's routing key, and the production CSP permits
`font-src 'self'` only.

| Family | Token | Used for |
| --- | --- | --- |
| **Saira Condensed** (600, 700) | `--font-family-display` | The distance figure, the wordmark, every uppercase micro-label, and button labels. A condensed grotesk with the tall tight figures of a race clock — which is also what lets a big number fit across a phone. |
| **Barlow** (400, 500, 600) | `--font-family-ui` | Fields, prose, error and status text. The same technical grotesk at normal width, legible at the 16px a mobile field is obliged to use. |

## Tokens

Defined as CSS custom properties in `src/shared/design/tokens.css`, loaded
once globally. Every component's CSS module reads these — no raw hex/rgb
values or bare pixel spacing in component styles.

| Token | Value | Use |
| --- | --- | --- |
| `--color-surface` | `#0b0f0e` | Every overlay panel: the header bar, the routing status, the waypoint options, the credentials card. |
| `--color-surface-raised` | `#181f1c` | A control *inside* a panel — a field, a hovered button. On this palette raised means lighter. |
| `--color-void` | `#050807` | Behind everything, seen only before the map exists (first load of the credentials screen). |
| `--color-text` | `#f1f5ef` | Default text on a surface. |
| `--color-text-muted` | `#9aa79d` | Secondary prose and micro-labels. 6.7:1 on `--color-surface` — dimmed, never below what body text needs. |
| `--color-border` | `rgba(215, 255, 60, 0.16)` | Panel and field hairlines. Light-on-dark, not a grey line: a solid mid-grey border reads heavier than the panel it encloses. |
| `--color-border-strong` | `rgba(215, 255, 60, 0.34)` | The same hairline on hover. |
| `--color-accent` | `#d7ff3c` | The route, the distance unit, the primary action. Nothing else. |
| `--color-accent-strong` | `#e8ff7a` | Hover on a control already filled with the accent. |
| `--color-accent-text` | `#0b0f0e` | Text on an accent background. |
| `--color-accent-veil` | `rgba(215, 255, 60, 0.07)` | The hatched band behind the header bar. |
| `--color-accent-glow` | `rgba(215, 255, 60, 0.12)` | The light above the credentials card. |
| `--color-error` | `#ff7a5c` | Error/not-found messaging, and the one destructive button (Delete). |
| `--color-error-veil` | `rgba(255, 122, 92, 0.08)` | Fill of the unrestrictable-key warning callout. |
| `--color-focus` | `#d7ff3c` | Keyboard focus ring, app-wide. |
| `--color-shadow` | `rgba(0, 0, 0, 0.85)` | The colour the elevation tokens are built from. |
| `--color-scrim` | `rgba(4, 7, 6, 0.86)` | The veil the credentials screen draws over what is behind it. |
| `--shadow-panel` | long drop + inset top highlight | Any floating panel. The highlight is the top edge catching light, which is what stops a black rectangle reading as a hole. |
| `--shadow-control` | shorter drop | A single button floating on the map. |
| `--shadow-modal` | longest drop | The credentials card. |
| `--color-route` | `#d7ff3c` | The core of the drawn, snapped path. |
| `--color-route-casing` | `#0b0f0e` | The outline drawn under it — see "the route is two lines" below. |
| `--color-waypoint` | `#0b0f0e` | Waypoint fill — distinct from the path (FR-005), and dark because the map under it is not: street tiles are mostly white and pale grey, so a dark dot is the highest-contrast mark available against them. |
| `--color-waypoint-ring` | `#ffffff` | The ring around every waypoint, which is what separates it from the route's own dark casing where the line runs underneath. |
| `--color-waypoint-selected` | `#ff5a1f` | Fill of the waypoint whose options are open or whose move is armed — distinct from both `--color-waypoint` and `--color-route` (FR-014). |
| `--space-xs` … `--space-lg` | `0.4rem` … `1rem` | Tight padding, default gap, panel padding, viewport-edge offset. |
| `--radius` | `0.375rem` | Inputs, buttons. |
| `--radius-lg` | `0.75rem` | Panels. |
| `--radius-pill` | `999px` | The add-waypoint control. |
| `--size-control-row` | `3rem` | Size of any interactive control, and the height of one row of them. A notch above the 44px a finger needs, deliberately — see the touch-target rule below. |
| `--space-map-bottom` | `2.5rem` | Bottom offset that clears Leaflet's attribution strip — where the footer bar starts. |
| `--font-ui` | `500 14px/1.45 Barlow` | All overlay UI text. |
| `--font-ui-field` | `400 16px/1.45 Barlow` | Every `input` and `select`, and nothing else — see the field-size rule below. |
| `--font-label` | `600 11px/1 Saira Condensed` | Uppercase micro-labels. Always paired with `--tracking-label`: condensed capitals set solid are unreadable. |
| `--font-action` | `600 14px/1 Saira Condensed` | Button labels, uppercase — which is also what keeps a long one ("Add waypoint at map centre") on a single row on a phone. |
| `--font-distance` | `700 clamp(2.5rem, 11vw, 4.25rem)/0.82 Saira Condensed` | The distance figure. Scales with the viewport, since the bar it sits in goes from a phone's width to a laptop's. |
| `--tracking-label`, `--tracking-action` | `0.14em`, `0.06em` | Letter-spacing for the two uppercase styles above. |
| `--z-overlay` | `1000` | Overlay controls above Leaflet's own panes. |
| `--z-modal` | `1100` | The credentials screen when reopened over the running app — above every `--z-overlay` control, not just the map. |

## Rules

- No raw colour or spacing literals in component CSS modules — go through a
  token, or add one here first if the value is genuinely new. The one exception
  is an alpha stop in a `mask-image`, which is not a colour: a mask reads only
  the alpha channel.
- **A phone is the small case this layout has to survive, not an afterthought.**
  The map fills the viewport and every control floats on top of it, so nothing
  here reflows or errors when the screen gets small — it just becomes too small
  to hit, or drifts off an edge where no scrollbar can reach it. The rules that
  follow are what keep that from happening, and `e2e/mobile.spec.ts` holds them
  in place at phone sizes with touch emulation on (`overlay-layout.spec.ts`
  separately checks that overlays don't cover each other at three widths).
- **The bars stack before they shrink.** On a phone the header is two rows —
  the name and the distance facing each other across the first, the search
  spanning the second — because no arrangement fits a field, a button and a
  display figure on one 360px line. It becomes a single row at `44rem`, which is
  also where a phone in landscape lands. The footer does the same by wrapping,
  with no breakpoint of its own: add-waypoint and undo/clear share a row while
  they fit and take one each when they don't. Nothing is positioned from either
  bar's height, so both are free to be intrinsic.
- **Everything is `border-box`** (`src/index.css`). Overlay controls are sized
  by a minimum height that doubles as the row height the corner-stacking
  offsets are computed from; under `content-box` that height would exclude
  padding, making every control taller than its own token and every offset
  built on it short by the same amount.
- **Nothing interactive is smaller than `--size-control-row`, which is 48px,
  not the 44px a finger needs.** That covers buttons, text fields and selects,
  and it is the same token as the row height precisely so a row of controls and
  anything sized from it can never drift apart. The extra 4px is not padding
  for its own sake: a control sized to the minimum exactly can still be painted
  a fraction under it when the row it sits in lands on a half-pixel, and
  `e2e/mobile.spec.ts` — correctly — counts 43.99px as too small to hit. There is
  no longer an exception to this: **zooming is the app's own control**
  (`src/shared/map/ZoomControls`), not Leaflet's `ZoomControl`, which is fixed
  to a corner at its own 30px and left one pair of buttons two thirds the size
  of everything else — and forced the footer bar to carve a gutter around it.
  Ours calls the same `map.zoomIn()`/`zoomOut()` and reproduces the one thing
  that came with the widget: the disabled state at the ends of the zoom range.
  What is still Leaflet's along the bottom is the attribution, whose *colours*
  are brought onto this palette in `MapView.module.css` — a white strip in the
  corner of an otherwise dark instrument reads as something the page failed to
  style — but which is otherwise untouched, and which nothing may cover.
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
  attribution included — stacking above it is what
  `--z-overlay` does, and a control drawn over another is a control the user
  cannot press. This is now mostly a property of the two bars: inside them,
  layout keeps the controls apart, and the only free-floating panel left is the
  waypoint options, which anchors itself away from the edges. The bottom edge
  still carries Leaflet's attribution, so the footer starts above it
  (`--space-map-bottom`) and otherwise runs the full width.
  `e2e/overlay-layout.spec.ts` asserts every control stays apart at phone,
  tablet and desktop widths.
- **The routing status is a row of the footer, not a panel that appears.**
  Availability of a third-party service is a normal operating condition here
  (docs/ARCHITECTURE.md), so what the provider is doing belongs in the shell.
  The element stays in the DOM while it is empty — it is a live region, and one
  inserted together with its first message is announced unreliably — so it is
  never `display: none`, and it carries its own margin instead of the bar
  giving it a `gap` that would show while it is empty.
- The credentials screen breaks the "everything lives inside the map" pattern
  by design: on first load it *is* the whole page, since no map exists yet to
  sit on top of. Reopened (US-005) it becomes a full-viewport modal over the
  running app instead, on `--z-modal` — one level above `--z-overlay` — so it
  sits above every overlay control, not only the map underneath them. It is
  also the one screen a visitor to a public deploy sees before anything else,
  which is why it carries the app's name (`shared/brand/AppMark`).
- One palette, deliberately — a dark one, matching the product's "one screen,
  one job" principle. `src/index.css` therefore declares `color-scheme: dark`:
  a `<select>` drop-down, a scrollbar and a caret all come from the OS theme,
  and under `light` a white drop-down would open out of a near-black field.
- One focus ring for the whole app, declared once on `:focus-visible` in
  `src/index.css` so Leaflet's own controls get it too. Overlay panels sit on
  a busy map, so the keyboard position has to stay obvious — components do not
  remove or restyle it. The `outline-offset` is as load-bearing as the colour:
  drawn outside the control, the ring always lands on the dark panel behind it,
  including on the one button that is itself filled with the accent.
- Text that exists only for assistive technology uses the shared
  `visuallyHidden` class in `src/shared/design/a11y.module.css`, imported
  alongside the component's own module. It is for labelling something the
  screen already conveys visually, never for hiding content sighted users are
  meant to have. The distance figure no longer uses it: its label is on screen,
  because an unlabelled big number is as ambiguous to look at as it is to hear.
- Leaflet vector layers (the route polylines, waypoint markers) take their
  colour from these same tokens via `var(--token-name)`, not a hex literal in
  the component — Leaflet's SVG renderer resolves CSS custom properties in
  path attributes the same as it would in a stylesheet.
- **The map tiles are held back** — `filter: saturate(0.62) contrast(1.04)
  brightness(1.03)` on `.leaflet-tile-pane` — so the route can be the loudest
  thing on the screen. On the tile pane alone, never on the container: a filter
  on an ancestor creates a containing block, and every marker, overlay and
  control would be dulled along with the map, including the accent the route is
  drawn in.
- **The route is two lines, not one** (`RouteLayer`): a dark casing
  (`--color-route-casing`, weight 13) under a bright core (`--color-route`,
  weight 7), both with round caps and joins. The accent alone is a pale line
  over pale map tiles; the casing is what gives it an edge over every tile it
  crosses. Both are sent to the back on mount, core first and casing second —
  `bringToBack` puts a layer at the very back, so the one sent last ends up
  underneath.
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
  `useCoarsePointer`): radius 7 for a mouse, 13 where `(pointer: coarse)`
  matches, plus a 3px ring. Leaflet hit-tests a vector marker against exactly
  the circle it paints, widened only by half its stroke — there is no invisible
  padding — so the drawn size *is* the tap target, and the mouse size is a 17px
  target on a phone. The touch size is the dot itself rather than a transparent
  halo around it, both because a bigger dot is easier to see on a small screen
  and because a hit area larger than the mark would swallow taps meant for the
  map beside it. A waypoint is told apart from the route by two contrasts, not
  one — its fill against the bright core, its ring against the dark casing — so
  neither can be dropped. This is the one place a size is set in JavaScript rather than
  by a stylesheet, since Leaflet takes the radius as a number — and
  `e2e/waypoint-editing.spec.ts`'s overlapping-waypoint spec places its second
  click from these numbers, so it moves when they do.
- **The route line is not interactive** (`interactive={false}` on both
  `Polyline`s). It answers no clicks of its own — a tap on it means the same as
  a tap on the map underneath — and left interactive it is a large target lying
  directly under every waypoint, so a click meant for a marker resolves to the
  line, bubbles to the map, and appends a waypoint instead of opening the
  options for the one that was aimed at. The casing makes this more important,
  not less: it is the wider of the two. `bringToBack()` fixes the paint order
  but not this: the line stays hit-testable wherever it is drawn. Note this is
  a layer-construction option, not a style — inside `pathOptions` it would be
  applied via `setStyle` and silently do nothing.
- **The marked waypoint** (`004-waypoint-edit-affordances`, FR-014) is the
  waypoint whose options are open, or whose move is armed — filled with
  `--color-waypoint-selected` instead of `--color-waypoint` *and* drawn 3px
  larger, so it reads unambiguously even when two markers overlap, and so it
  can stand in for the cursor rule above on touch, which has no hover or cursor
  at all. Colour alone has to compete with a route line in the same weight
  class; size is the difference that survives a glance.
- **The waypoint options panel** (`004-waypoint-edit-affordances`) opens
  anchored to the waypoint it belongs to — anchoring alone doesn't separate
  two overlapping markers, which is what the marked waypoint above is for. It
  positions itself on whichever side of the marker points back toward the
  centre of the map (the half of the viewport the marker isn't in), so it
  grows away from the edges the two bars and Leaflet's attribution live along,
  rather than reaching toward them. Editing a
  waypoint (opening its options, deleting it, arming and completing a move) is
  pointer/touch-only by deliberate decision — undo and clear remain the
  keyboard-reachable correction path (`AddWaypointControl`'s precedent does
  not extend here).
- **Motion is used once per event, never as ambience.** The header, the search
  and the map controls arrive in a short staggered entrance on load; the
  distance figure and the rule under it replay a 300–460ms entrance whenever a
  new total lands, which is the confirmation that the number changed on a
  screen with a map moving under it; the routing status pulses while a segment
  is in flight. Every one of them is switched off under
  `prefers-reduced-motion: reduce`, and none of them gates an interaction.
