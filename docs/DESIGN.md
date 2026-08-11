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
| `--color-shadow` | `rgba(0, 0, 0, 0.3)` | Overlay panel shadow. |
| `--color-route` | `#1a73e8` | The drawn, snapped path. |
| `--color-waypoint` | `#d93025` | Waypoint markers — distinct from the path (FR-005). |
| `--space-xs` | `0.4rem` | Tight internal padding. |
| `--space-sm` | `0.5rem` | Default gap between controls. |
| `--space-md` | `0.75rem` | Panel padding. |
| `--space-lg` | `1rem` | Panel offset from the viewport edge. |
| `--radius` | `0.25rem` | Inputs, buttons. |
| `--radius-lg` | `0.5rem` | Panels. |
| `--font-ui` | `14px/1.4 system-ui, sans-serif` | All overlay UI text. |
| `--z-overlay` | `1000` | Overlay controls above Leaflet's own panes. |

## Rules

- No raw colour or spacing literals in component CSS modules — go through a
  token, or add one here first if the value is genuinely new.
- Overlay controls (anything that sits on top of the map) use `--z-overlay`
  so they consistently stack above Leaflet's internal panes and controls.
- Dark mode / theming is out of scope for the first version — one palette,
  matching the product's "one screen, one job" principle.
- Leaflet vector layers (the route polyline, waypoint markers) take their
  color from these same tokens via `var(--token-name)`, not a hex literal in
  the component — Leaflet's SVG renderer resolves CSS custom properties in
  path attributes the same as it would in a stylesheet.
