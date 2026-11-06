# Content sources and regeneration

This directory is internal editorial input. It must not be served by the public build.

The tracked research snapshots in `research/` replace dependencies on a particular editor's Downloads or output folders. They are reference input, not current visitor copy and not evidence that every recorded fact has been rechecked.

Run from the repository root:

```sh
node scripts/import-content.mjs
node scripts/import-astana.mjs
node scripts/import-aktau.mjs
node scripts/import-turkistan.mjs
node tests/content-build.mjs
```

The Almaty and Astana importers also accept an explicit research JSON path. Reviewed fields are applied afterwards, so importing an earlier research snapshot cannot restore the retired wording or map provider.

- Almaty: edit the existing `almaty-copy`, `almaty-visitor-info`, `almaty-nature` and `almaty-city` layers. `almaty-visitor-info.placeOverrides` holds exact local copy addresses and approved Google Maps links, keyed by stable place ID.
- Astana: the tracked research package is followed by `astana-city` additions and `practicalOverrides`. Replacing a practical `copy` object intentionally removes retired phrase templates.
- Aktau and Turkistan: their `*-city.json` packages are the maintained inputs to the corresponding importers.
- Burabay, Oskemen, shared journey plans and runtime visitor policies currently remain authored JavaScript modules. They have no workbook importer; do not invent one or regenerate them from older handoffs.

Do not edit generated `assets/content-data.js`, `astana-data.js`, `aktau-data.js` or `turkistan-data.js` by hand. Edit the source, regenerate, then review the generated diff. `tests/content-build.mjs` regenerates all four in a temporary copy and fails if the committed outputs differ. It also checks the address/language regressions and rejects overrides for missing IDs.

The product and sample HTML have their own builders under `guides/almaty/`. These remain generated from the reviewed visitor modules; changing a content input is not complete until the affected product has been rebuilt and tested.
