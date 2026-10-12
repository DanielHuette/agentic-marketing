# Benchmark results

Run at 2026-10-09T00:43:19+00:00 against live sources.

Sources are snapshotted into `benchmark/snapshots/` on every live run, so a result
can be audited after the page behind it has changed. The digest of each snapshot is
in `results.json`.

### Figure pass

- Verdicts as declared: **16 of 16**
- Unbacked findings flagged: 6
- Unbacked findings missed: 0
- Backed findings wrongly flagged: 0
- Backed findings passed: 10

| Case | Kind | Expected | Actual | |
|---|---|---|---|---|
| `handwerk-umsatz` | truthful | supported | supported | ok |
| `handwerk-beschaeftigte` | truthful | supported | supported | ok |
| `handwerk-umsatz-erfunden` | fabricated | unsupported | unsupported | ok |
| `handwerk-umsatz-umgedreht` | semantic | supported | supported | ok |
| `register-betriebe-variante` | variant | supported | supported | ok |
| `register-zuwachs-variante` | variant | supported | supported | ok |
| `register-betriebe-erfunden` | fabricated | unsupported | unsupported | ok |
| `register-gemischt` | mixed | partial | partial | ok |
| `dienstleistungen-umsatz` | truthful | supported | supported | ok |
| `dienstleistungen-umgedreht` | semantic | supported | supported | ok |
| `industrie-auftragseingang` | truthful | supported | supported | ok |
| `industrie-maut` | truthful | supported | supported | ok |
| `industrie-maut-erfunden` | fabricated | unsupported | unsupported | ok |
| `konjunktur-erwerbstaetige` | truthful | supported | supported | ok |
| `konjunktur-erfunden` | fabricated | unsupported | unsupported | ok |
| `adresse-tot` | unreachable | unreachable | unreachable | ok |

### Model pass

- Verdicts as declared: **16 of 16**
- Unbacked findings flagged: 8
- Unbacked findings missed: 0
- Backed findings wrongly flagged: 0
- Backed findings passed: 8

| Case | Kind | Expected | Actual | |
|---|---|---|---|---|
| `handwerk-umsatz` | truthful | supported | supported | ok |
| `handwerk-beschaeftigte` | truthful | supported | supported | ok |
| `handwerk-umsatz-erfunden` | fabricated | unsupported | unsupported | ok |
| `handwerk-umsatz-umgedreht` | semantic | unsupported | unsupported | ok |
| `register-betriebe-variante` | variant | supported | supported | ok |
| `register-zuwachs-variante` | variant | supported | supported | ok |
| `register-betriebe-erfunden` | fabricated | unsupported | unsupported | ok |
| `register-gemischt` | mixed | partial | partial | ok |
| `dienstleistungen-umsatz` | truthful | supported | supported | ok |
| `dienstleistungen-umgedreht` | semantic | unsupported | unsupported | ok |
| `industrie-auftragseingang` | truthful | supported | supported | ok |
| `industrie-maut` | truthful | supported | supported | ok |
| `industrie-maut-erfunden` | fabricated | unsupported | unsupported | ok |
| `konjunktur-erwerbstaetige` | truthful | supported | supported | ok |
| `konjunktur-erfunden` | fabricated | unsupported | unsupported | ok |
| `adresse-tot` | unreachable | unreachable | unreachable | ok |

### Sources that did not answer

- `verschwunden`: https://www.destatis.de/DE/diese-seite-gibt-es-nicht-benchmark.html answered 404
