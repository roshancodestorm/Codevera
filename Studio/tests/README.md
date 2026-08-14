# Studio headless tests

CDP-driven headless-Chrome suites for the Studio editor. They were written to
verify the two big features end-to-end and to guard against regressions:

- `bundle-sync-test.cjs` — wire-level: a fresh collab client must not re-request
  state forever when the server has nothing to send (guards the infinite
  STEP1<->STEP2 loop; empty yjs updates are `00 00`, not 1 byte).
- `bundle-content-test.cjs` — wire-level: alice pushes a Y.Text update, bob in
  the same workspace must receive it via the server's UPDATE broadcast.
- `collab-2tab.cjs` — full UI: two tabs, one workspace. Verifies live presence
  chips, page-add sync, remote cursor, page-switch follow, text element add,
  text edit, and element drag position — all in real time.
- `mp4-test.cjs` — exports a 2-slide deck as MP4 through the UI and validates
  the file (container magic, size) plus real video playback in-page.

## Prerequisites

- Node.js with the repo root `node_modules` (the tests use `ws` from there).
- Chrome installed at the default path (override with `CHROME_PATH`).
- The Studio server running (default `http://127.0.0.1:5174/`, override with
  `STUDIO_URL`):

```
$env:PORT=5174; node server.js
```

## Run

```
powershell -ExecutionPolicy Bypass -File Studio\tests\run-all.ps1
```

or individually:

```
node Studio\tests\collab-2tab.cjs
node Studio\tests\mp4-test.cjs
```

Exit code 0 = pass. Artifacts (Chrome profiles, exported videos) go to
`Studio/tests/tmp/` which is git-ignored.
