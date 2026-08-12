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
map's corners, and the split between them is *reporting* against *acting*:
`AppHeader` for what describes the route — the app's name, the address search,
the total distance — and `AppFooter` for everything the visitor does, which is
undo/clear, the way back to the credentials screen, zoom, and the routing
status. Both are in `src/shared/layout/`. Nothing else floats: the corner that
is left is Leaflet's own, for its attribution. Two bars and an untouched map
between them is the whole layout.

The split is what the two are, not where they sit. On a phone they are two bars,
top and bottom. On anything wider they are two panels facing each other across
the map: acting down the left edge, reporting in the top right corner (below).

The change-provider button is in the footer and not beside the distance
because of that split, not because of where it fits: it is a thing you press,
and next to the figure it was the only control in a bar that otherwise only
reports. In the footer it reads as the third item of a toolbar — remove last
waypoint, clear, change provider — which is what it is.

The locate control (`005-locate-visitor-position`) reads the split the other
way and still lands in the header. It is also pressable, like change-provider,
but what it does with a reading — its own or the one it takes automatically
the moment the map becomes usable, which is what raises the browser's own
permission prompt — is put the map somewhere, which is what the header
already does for the address search beside it. Reporting against acting
isn't really the question for either of the two search controls; positioning
against acting is, and the map is positioned from the header while the route
is acted on from the footer. Locate sits in the search row rather than beside
the distance for the same reason change-provider sits in the footer's tool
row rather than beside it: it's a peer of the address search, not of the
figure.

The two controls trade a technique as well as a row. Locate's own failure
message uses the same `flex-basis: 100%` line-break the address search
already used for its own — one pattern serving both rather than two, now that
there are two controls in the row to carry it (see "The search row" below).

On a wide screen the footer stops being a bar: at 60rem the two panels it is
really made of — the actions and zoom — stand up into a **rail down the left
edge**, one above the other, each about one control wide. A bar is the
arrangement a phone forces, where there is no width to spend on a column beside
the map and the controls need the edges; carried on to a laptop it is a band of
dark panel drawn across the bottom of a map the controls only occupy a third
of. Stood up, the same controls give the entire bottom of the map back and cost
one narrow column at an edge — which is what a tool palette has looked like
since long before this app.

The header goes the same way at the same width, and it is the larger half of
the change: measured on a laptop the bar is 1408×97 against the rail's 66px of
column. What it costs is not area — the same card stacked onto the rail would
cover the same map — it is that a band across the width **cuts the map in
two**, and the strip it leaves above itself is 100px deep, which is not enough
map to draw a route in. Taken off, the map is one surface from edge to edge.
So at 60rem the bar stands up into a **card in the top right corner**, its
three things stacked in the order they were in across it: name, search, answer.

Right, and not stacked onto the rail on the left, is arithmetic rather than
taste. The card is about 200px tall and the rail about 300px; 500px of stacked
panel is 85% of the column height a laptop actually has, and under about 570px
of viewport it does not fit at all — with no fallback left, since the rail
already spends its own on bottom-aligning. A column filled like that is a
sidebar, which is the bottom bar turned on its side. It would also leave the
distance boxed between a text field and a toolbar, when the figure is the
second loudest thing on the screen by design. Facing each other across the map,
each has a corner of its own and the map has its middle.

The trade the rail makes is worth naming. On a full-viewport map the left edge
is not dead space the way it is in a drawing tool — it is drawing surface, and
the rail takes a 64px column of it. It buys back a band across the whole width,
which is the larger of the two, and the panel it takes is at the edge a route
is least often drawn against. The card makes the same trade at the opposite
corner, and the two together take about 7% of a laptop's viewport where the two
bars took 13%.

Both are `60rem` because that is one decision, not two: below it there is
neither the width for a column beside the map nor the width for a card that
isn't most of the screen, and above it both are true at once. A phone is
untouched by all of this — two bars, top and bottom, exactly as before.

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
| `--color-void` | `#050807` | Behind everything, seen only in the moment before the first tiles land. |
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
| `--color-scrim` | `rgba(4, 7, 6, 0.5)` | The veil the credentials screen draws over the map behind it. Thin: the map turns itself dark under it and the screen blurs it, so this only has to settle the backdrop a stop below the card. |
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
| `--size-control-row` | `3rem` | Size of any interactive control, and the height of one row of them. A notch above the 44px a finger needs, deliberately — see the touch-target rule below. |
| `--space-map-bottom` | `2.5rem` | Bottom offset that clears Leaflet's attribution strip — where the footer bar starts. |
| `--font-ui` | `500 14px/1.45 Barlow` | All overlay UI text. |
| `--font-ui-field` | `400 16px/1.45 Barlow` | Every `input` and `select`, and nothing else — see the field-size rule below. |
| `--font-label` | `600 11px/1 Saira Condensed` | Uppercase micro-labels. Always paired with `--tracking-label`: condensed capitals set solid are unreadable. |
| `--font-action` | `600 14px/1 Saira Condensed` | Button labels, uppercase — which is also what keeps a long one ("Remove last waypoint") on a single row on a phone. |
| `--font-distance` | `700 clamp(2.5rem, 11vw, 4.25rem)/0.82 Saira Condensed` | The distance figure. Scales with the viewport, since the bar it sits in goes from a phone's width to a laptop's. |
| `--tracking-label`, `--tracking-action` | `0.14em`, `0.06em` | Letter-spacing for the two uppercase styles above. |
| `--z-overlay` | `1000` | Overlay controls above Leaflet's own panes. |
| `--z-modal` | `1100` | The credentials screen, over the map on first load and over the running app when reopened — above every `--z-overlay` control, not just the map. |

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
- **The header is a bar or a card, and the hatch has to turn with it.** The
  texture behind it is drawn to run *along* a bar and fade out before the
  wordmark and the figure, which is a horizontal mask. Stood up into the card
  that mask lies behind the whole panel, including the distance — a texture
  competing with the one number the app exists to produce. It fades down the
  card instead, gone before the figure. The mask's stops are alpha and not
  palette colours, which is the one place a raw value is allowed here.
- **The search row is two controls sharing one line, not one stretched to fit
  both.** The address search used to be the only thing in its grid area, sized
  with `width: 100%`; locate (`005-locate-visitor-position`) landed beside it,
  so the area became a `flex-wrap` row and the search form gave up `width:
  100%` for `flex: 1 1 auto; min-width: 0` — grow to fill what locate doesn't
  need, shrink below its own content width on a narrow phone, which a flex
  item can't do on its automatic minimum otherwise. Locate's own failure
  message reuses the address search's own trick for breaking onto a line of
  its own — `flex-basis: 100%` inside a `flex-wrap` row of *definite* width —
  rather than inventing a second way to do the same thing; its wrapping `div`
  is `display: contents` so the button and the message are direct items of the
  search row, the same device `AppFooter` uses to keep its own wrapped
  controls direct items of the bar.
- **The bars stack before they shrink.** On a phone the header is two rows —
  the name and the distance facing each other across the first, the search
  spanning the second — because no arrangement fits a field, a button and a
  display figure on one 360px line. It becomes a single row at `44rem`, which is
  also where a phone in landscape lands. The footer does the same by wrapping:
  the tool row (undo, clear, change provider) and the zoom pair share a row
  while they fit and take one each when they don't, which on a phone is always
  — three tools and a zoom pair are some 60px wider than a 393px screen. Nothing
  is positioned from either bar's height, so both are free to be intrinsic.
- **A control that wraps to its own row is still at the end of the bar it
  wraps out of.** `justify-content` only spaces items that share a line, so the
  zoom pair carries `margin-left: auto` instead: an auto margin collects the
  free space of whichever line the item actually lands on. Without it the pair
  drops to the start edge of the second row, under the tools and at the one end
  of a phone a thumb doesn't reach.
- **An empty live region must not open a row.** A zero-height flex item still
  starts a flex line, and the bar's row `gap` is still drawn above whatever
  follows it — invisible on a dark panel, and read as the controls sitting a
  few pixels low (they were 17px from the top of the footer and 9px from the
  bottom). The routing status is therefore `position: absolute` while it is
  `:empty`, which takes it out of flow without taking it out of the
  accessibility tree — `display: none` would do both, and a live region hidden
  that way is announced unreliably when it comes back.
- **The footer is one bar or one rail, from one set of markup.** Below `60rem`
  the `<footer>` is the panel and the wrapper around the actions is
  `display: contents`, so the status and undo/clear wrap against the bar
  exactly as they did when it was flat. At `60rem` that wrapper becomes a panel
  and the `<footer>` becomes the frame the two panels are stacked in: a
  shrink-to-fit column down the left edge, from the header's own offset to the
  attribution, transparent and `pointer-events: none`, with the panels taking
  their own clicks back. That last part is not a detail — an invisible strip
  over the map that answers clicks (and swallows them,
  `useDisableMapClickPropagation`) makes the space it opens look like map and
  behave like a panel.
- **The rail hugs the bottom of its frame and only centres itself when there is
  height for it** (`min-height: 38rem`, one extra declaration). Centred is
  where it belongs — clear of both ends rather than pooling in a corner — but
  the header's height is intrinsic and nothing may be positioned from it, so
  the fallback has to be the alignment that cannot reach the header from any
  distance, which is the one furthest from it.
- **In the rail a correction control is an icon, and its label is one hover or
  one focus away** (`RouteControls`). A column one control wide cannot carry
  "Remove last waypoint", so the label leaves the face of the button and
  becomes a tooltip beside it — on `:focus-visible` as well as `:hover`, since
  a control whose name only ever appears to a mouse is a control the keyboard
  operates blind. It is hidden with `opacity`, never `display: none` or
  `visibility: hidden`: those take the label out of the accessibility tree, and
  the label *is* the button's accessible name. There is no `aria-label`
  anywhere in this pair, precisely so the name cannot drift from the sentence
  on screen. The icons are the conventional pair — an undo arrow and a
  waste basket — knowing that the arrow implies a reversibility the label
  spends its words denying (FR-015, BR-006); the label is what settles it, and
  it is never more than a hover away. Both arrangements carry exactly one of
  the two: the bar draws the label and not the icon, since two icons plus two
  labels is some 56px added to a row that already gives back its side padding
  at `25rem` to stay on one line.
- **Below `25rem` both bars narrow their viewport-edge offset** from
  `--space-lg` to `--space-sm`. At 360px the corrections and the zoom pair are
  a dozen pixels wider than the row they share, and without those pixels the
  footer takes a third row of a screen that has 640px of height in all — while
  the alternative that fits, letting the zoom pair hang over the panel's edge,
  is not one. `AppHeader` narrows at the same width for no reason of its own,
  so the two bars stay the same width as each other.
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
  Stood up in the rail the pair is `column-reverse`, so zoom in is the upper of
  the two — where every map that has ever stacked this pair puts it, Leaflet's
  own control included. The DOM order stays out-then-in, which is what the bar
  needs and what a phone therefore keeps; the two are separately labelled, so
  the order they are reached in says nothing the label doesn't.
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
- **The map says how it is used, once** (`src/route-drawing/MapHint`). An
  untouched map with a bar above it and a bar below says nothing about the
  surface between them being the input, and the app's one instruction — a route
  is drawn by clicking the map — has nowhere in either bar to live. So it is
  said over the middle of the map and then taken back: a pill that names the
  gesture in the words of the pointer in use ("Click"/"Tap", from
  `useCoarsePointer`), and leaves on the earlier of two events — five seconds,
  or the first waypoint. Both matter: the timer means a visitor who ignores it
  isn't left with a label over their map, and the waypoint means acting on it
  is what dismisses it. It never returns, including for a route cleared back
  to empty — someone who has drawn one knows how.
  This is the second thing allowed to float over the map, and it is allowed
  because it is not a control: `pointer-events: none`, so the click it asks for
  passes through it to the map underneath and does the very thing it describes.
  Its lifetime is two `setTimeout`s rather than the end of its own animation,
  because the fade is switched off under `prefers-reduced-motion` and a hint
  that ends with its animation would never end for the visitor who asked for
  less motion.
- **Nothing may be positioned so that it covers another control**, Leaflet's
  attribution included — stacking above it is what
  `--z-overlay` does, and a control drawn over another is a control the user
  cannot press. This is now mostly a property of the two bars: inside them,
  layout keeps the controls apart, and the only free-floating *control* left is
  the waypoint options panel, which anchors itself away from the edges. The map
  hint floats too but answers no clicks, so it can't take one from anything
  underneath — `e2e/mobile.spec.ts` still holds it clear of both bars, since a
  hint drawn across the search field is unreadable even when it is harmless.
  The bottom edge
  still carries Leaflet's attribution, so the footer starts above it
  (`--space-map-bottom`) and otherwise runs the full width.
  `e2e/overlay-layout.spec.ts` asserts every control stays apart at phone,
  tablet and desktop widths.
- **The routing status is a row of the footer's actions, not a panel that
  appears.**
  Availability of a third-party service is a normal operating condition here
  (docs/ARCHITECTURE.md), so what the provider is doing belongs in the shell.
  The element stays in the DOM while it is empty — it is a live region, and one
  inserted together with its first message is announced unreliably — so it is
  never `display: none`, and it carries its own margin instead of the bar
  giving it a `gap` that would show while it is empty.
- **In the rail it is a pill hung off the side, level with the zoom panel.**
  A routing error is prose and a column one control wide has no row for prose,
  so the region leaves the panel — through a slot `AppFooter` owns, which is
  `display: contents` in the bar so the region is still a direct item of it
  there. Level with *zoom* and not with the tools, which is not a matter of
  taste: the two correction buttons defer their labels to a tooltip on that
  exact side, so a pill beside them is a message with a tooltip landing on it
  every time the visitor reaches for undo. The pill grows downward into open
  map from there, and never up towards the header. Its chrome is conditional on
  it having something to say (`:not(:has(> :empty))`) — the region is still
  mounted and empty the rest of the time, and an empty pill is a stray box
  drawn on the map.
- **The credentials screen is shown over the map, never instead of it.** It is
  a full-viewport modal on `--z-modal` — one level above `--z-overlay`, so it
  sits above every overlay control and not only the map underneath them — on
  both of its showings: reopened over the running app (US-005), and on first
  load, where the map is mounted outside the credentials gate for it to be
  shown over (`App.tsx`). It is the one screen a visitor to a public deploy
  sees before anything else, which is why it carries the app's name
  (`shared/brand/AppMark`); what it is over is the thing they came for, rather
  than a black rectangle in front of nothing.
- **That screen introduces the app before it asks for anything.** It is the
  first thing a visitor sees and, if they leave, the only thing — so it opens
  with what the app does and what the key buys *them* (their own free routing
  account: no sign-up here, no quota shared with strangers), and the button
  says `Start drawing` rather than `Continue`, which describes the form's
  plumbing instead of theirs. What it says about the key's safety is unchanged
  and non-negotiable (US-004, ADR-0002) — it just no longer leads. The
  unrestrictable-key warning keeps `--color-error` on its left edge and its
  veil and sets its prose at normal text contrast: six red lines on a first
  impression read as an app nervous about itself, and the fact is worth
  reading, not surviving. Reopened over a running app it is a different errand
  — one setting, not a first visit — so the pitch is dropped and the heading
  names the task; the presence of `onDismiss` is what tells the two apart.
- **The map behind that screen is dormant, and that is a functional
  requirement, not a finish** (FR-001). Drawn, and unreachable: the wrapper
  around it takes the `inert` attribute, which is what covers the tab stop
  Leaflet gives its own container for the arrow-key pan — a control the visitor
  can tab to behind a modal is as reachable as one they can click, and
  `pointer-events: none` would not have covered it. None of the app's own
  controls exist while the gate is closed, so there is nothing there to draw a
  route with either. The instance itself is deliberately *not* conditional on
  credentials: supplying a key adds the controls to a map that is already
  loaded rather than swapping it for a second one, and Leaflet reads its
  interaction options once at construction, so a map built inert would have
  stayed inert. It follows that `className` on `MapContainer` is fixed at mount
  by react-leaflet — anything that toggles goes on the wrapper.
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
- **Dormant, the tiles are inverted rather than merely dimmed** —
  `invert(1) grayscale(1) brightness(0.92) contrast(0.88)`, same pane, on the
  wrapper's dormant class. A bright street map is the one thing on this palette
  that cannot be put behind something without looking like it is being covered
  up; turned dark it joins the instrument instead — pale roads on near black,
  the credentials card the only lit surface. The route is in the overlay pane
  and so is untouched by this: reopen the screen over a drawn route and the
  accent line is still the one thing in colour.
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
  keyboard-reachable correction path. So is *placing* one, since the control
  that dropped a waypoint at the map's centre was removed as unnecessary: what
  the keyboard has left is Leaflet's pan, the zoom pair, and the two controls
  that take a route back apart (`e2e/keyboard.spec.ts`).
- **Motion is used once per event, never as ambience.** The header, the search
  and the map controls arrive in a short staggered entrance on load; the map
  hint rises in behind them and fades out when its time is up; the
  distance figure and the rule under it replay a 300–460ms entrance whenever a
  new total lands, which is the confirmation that the number changed on a
  screen with a map moving under it; the routing status pulses while a segment
  is in flight; the credentials card rises into place on each showing of the
  screen, and the map behind it takes 420ms to dim into (and back out of) its
  dormant state, which is the same event seen from the other side. Every one of
  them is switched off under `prefers-reduced-motion: reduce`, and none of them
  gates an interaction.
