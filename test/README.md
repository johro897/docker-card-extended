# Tests

A single self-contained HTML file, zero dependencies (matches the card
itself — no build chain, no npm). Loads the real `docker-card.js` into a
real browser and drives it with fake `hass` objects — same pattern as
`music-multiroom-card`'s and `tplink-switch-card`'s test suites.

## Running it

Relative `<script src>` loading needs a real HTTP origin (not a bare
`file://` double-click, which some browsers/sandboxes block scripts from).
Serve the repo root with any static file server and open
`/test/docker-card.test.html`, e.g.:

```bash
python -m http.server 8000
```

Results show inline on the page (pass/fail per case + a summary), and
also log to the browser console.

## What it covers

Config normalization (`containers`/legacy `container` singular key,
id-keyed dict vs. list, `stopped_color`→`not_running_color` aliasing at
both card and per-container level), container status computation
(`_containerStatus`/`_prettyStatus`/`_computeOverallStatus`, including
language switching), the resource-value/disk-usage formatters
(`_fmtResourceValue`/`_fmtStateWithUnit`/`_isBlank`), HTML-escaping
(`_esc`) and URL-scheme filtering (`_safeHttpUrl`), the `_isDirty()`
dirty-check, translation lookup (`_t`/`_lang`), the toggle/restart/pause/
recreate service-resolution helpers, the full toggle flow (including the
missing-service revert-and-notify path), a malicious container name never
producing real markup, an unsafe `javascript:` release-notes URL never
rendering as a link, and the Prune / WUD-scan arm→confirm→service-call
flows driven through real DOM clicks.

The visual editor (#26) is covered at the logic level: `<ha-form>` is an
inert element outside a real HA frontend, so the tests dispatch the
`value-changed` events it would emit and check the resulting `config-changed`
payloads (unknown keys preserved, add/remove/reorder, legacy `container` key,
no row rebuild on `hass` updates, labels in all four languages). How
`ha-form`, `ha-entity-picker` and `ha-icon-picker` actually render is NOT
covered and needs a real Home Assistant.

Deliberately NOT covered: the CPU/memory sparkline graphs
(`_historyPoints`/`_sparklineSvg`/`_axisHtml`) — they depend on
`hass.callApi`'s real `history/period` response shape, which is explicitly
flagged in `CLAUDE.md` as unverified against a real HA instance; a fake
here would just encode the same guess the card already makes, not add
confidence. `ha-switch`/`ha-icon` also don't render as anything meaningful
outside a real HA frontend, so toggle/restart/pause interactions are
exercised by calling the `_handle*`/`_get*Service` methods directly with a
plain object standing in for the DOM element, rather than through a real
`<ha-switch>`.

## Adding a case

Each test is `test('description', () => { ... })` (or `async` where a
service call needs awaiting) with `assertEqual`/`assertTrue`/
`assertDeepEqual` — see the existing cases for the pattern for building a
fresh card instance and a fake `hass`. Add a new case whenever a real bug
is fixed, mirroring `music-multiroom-card`'s test suite.
