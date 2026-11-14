# Q02 backend/UI scope inventory of the as-found export

Run `qrwty-r1-20261114`, arm A, unit Q02. The untouched export of **QRWTY · production candidate
v1** at revision 83 ([artifact](artifact/), [per-file data](payload-manifest.json)). This is an
inventory for Q05, **not a count**: there is no G0, no template share and no source-loc-v2 number
here. The line column is raw nonblank physical lines with comments kept, to show size only. Q05
runs the pinned method on the baseline it freezes in `app/` with a reviewed scope file.

Categories follow the frozen [loc-method](../../benchmarks/neutral-pack/v1/frozen/loc-method.md).
Ownership is the export manifest's own word for each file.

## The 84 payload files

| Category (frozen method) | Ownership (manifest) | Files | Raw nonblank lines | Counted where |
| --- | --- | ---: | ---: | --- |
| Backend `src/` (TS) | generated-scaffold | 35 | 2,574 | Backend (source-loc-v2), subject to Q05's scope review |
| Backend `src/` (TS): stub bodies, yours to write | generated-extension | 11 | 88 | Backend |
| Product SQL, yours to write | generated-extension | 8 | 125 | Support: SQL |
| Generated SQL (`000-foundation.sql`) | generated-scaffold | 5 | 10 | Support: SQL |
| Scripts (`scripts/*.mjs`) | generated-scaffold | 9 | 636 | Support: scripts |
| Docker, Compose, edge and local infrastructure config | generated-scaffold | 6 | 341 | Support: deployment config |
| `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `.gitignore` | generated-scaffold | 4 | 1,095 | Excluded: manifests and build config |
| `README.md` | generated-scaffold | 1 | 6 | Support: docs |
| `.jeeves/` and `diagnostics/` | generator-metadata (4), generated-scaffold (1) | 5 | 5 | Excluded: generator metadata |
| **UI** | — | **0** | **0** | The export has no browser code. QRWTY's UI goes in `web/` (Q12) |
| **Total** | | **84** | | 3,805,071 bytes |

## Backend `src/` by directory

| Directory | Files | Raw nonblank lines | What it is |
| --- | ---: | ---: | --- |
| `src/runtime/` | 13 | 1,693 | Process lifecycle, HTTP admission, AMQP publish/consume with confirms and `.failed` routing, Postgres pool, token verification, tile guard, module clients |
| `src/processes/` | 6 | 573 | One per application tile: compiled `config`, client construction, stub mounting |
| `src/modules/*.slots.ts` | 11 | 180 | Typed `Dependencies` per stub (scaffold, rewritten on export) |
| `src/modules/dependencies.ts`, `entry.ts` | 2 | 90 | Shared client interfaces; `ModuleRequest`/`ModuleResponse`/`ModuleMessage` |
| `src/modules/<tile>/<module>.ts` | 11 | 88 | **Stub bodies** (8 lines each): each throws `Not implemented: <name>` |
| `src/features/` | 3 | 38 | `local-bindings.ts`, `application-bindings.ts` (one data constant each), `service-resources.ts` |

**Unused in this design** (reported beside the counts as open work, per the method):

- `src/features/application-bindings.ts` and `src/features/service-resources.ts` are not reached
  from any `src/processes/` entry ([import graph](records/import-graph.json)). They come from the
  `local.video-composition` emitter.
- Declared dependencies imported by neither `src/` nor `scripts/`: `hls.js`,
  `@aws-sdk/s3-request-presigner`, `@opensearch-project/opensearch`, `zod`. `@aws-sdk/client-s3`
  is imported only by `scripts/bootstrap.mjs`, which this design never runs (no object storage).
- The Dockerfile's `ffmpeg` and `media` stages (and `ffmpeg-os.lock`). Compose builds only the
  `app` target; `media` runs `dist/services/media.js`, which this export does not emit.

## Proposed scope for Q05 to review (not a decision)

YouTube v3's reviewed scope (Jeeves `field-projects/youtube/v3/notes/benchmarks/backend-scope.json`)
is the nearest precedent. Applied to this export's layout once it sits under `app/`:

```json
{
  "version": 1,
  "backendPaths": ["src/runtime", "src/features", "src/modules", "src/processes"],
  "uiPaths": [],
  "configurationPaths": ["src/features/application-bindings.ts", "src/features/local-bindings.ts"]
}
```

Open questions for that review: whether the unreached `service-resources.ts` stays in scope as
unused generated source (the method counts it mechanically; the open-work report names it), and
where QRWTY's BFF/edge code lands, which this export does not contain. Q03/Q04 template work may
change the baseline before Q05 freezes it; this inventory describes revision 83 at Jeeves
`59bfbc6` only.
