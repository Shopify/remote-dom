# Remote DOM WPT runner

Private test infrastructure for running selected upstream Web Platform Tests unchanged against the workspace copy of `@remote-dom/polyfill`.

The runner downloads a pinned WPT archive, parses selected `testharness.js` HTML files in a browser control page, and executes their markup and scripts in a fresh module worker containing `new Window()` from the polyfill. It does not construct a Remote DOM host receiver; transport and host rendering are separate integration concerns.

## Commands

From the repository root:

```bash
# Prepare or reuse the pinned WPT source.
pnpm wpt:prepare

# Run every classified file with strict capability enforcement.
pnpm test:wpt

# Explore an arbitrary test without claiming support.
pnpm test:wpt -- dom/nodes/Document-getElementById.html

# Enforce the table for one classified file.
pnpm test:wpt -- --capabilities '__runner__/runner-smoke.html?runner=smoke'

# Open the debug page and inspect original and generated source.
pnpm wpt:dev

# Canonically sort capabilities.tsv after editing it.
pnpm wpt:format
```

Useful runner options include `--headed`, `--verbose`, `--timeout 60s`, `--port 5174`, and `--strict-port`.

Set `WPT_ROOT=/path/to/wpt` to use an existing checkout. The runner verifies `resources/testharness.js` and skips all downloads. Set `WPT_CACHE_DIR` to override the download cache.

## Pinned source and cache

`wpt.lock.json` pins an immutable WPT revision and SHA-256 archive checksum. Pin updates must change and review both values.

The cache root resolves in this order:

1. `WPT_CACHE_DIR`
2. `<repo>/.cache/wpt` when `CI` is set
3. `${XDG_CACHE_HOME}/remote-dom/wpt`
4. `${HOME}/.cache/remote-dom/wpt`

Each revision installs under `<cache-root>/<revision>/source`. Download and extraction happen in process-unique temporary paths. A completed source tree is moved into place atomically, so concurrent worktrees can safely race to populate the shared cache. Old revisions are not deleted automatically.

WPT files are pinned but remain untrusted test inputs. The preparation script validates archive paths and checksums before extraction, and the browser server rejects traversal. Do not execute downloaded repository scripts outside the isolated runner.

## Capability inventory

`capabilities.tsv` contains one physical row per WPT subtest with four columns:

```text
path<TAB>status<TAB>case<TAB>note
```

- `path`: WPT path, including a query string when applicable
- `status`: exactly `supported` or `deferred`
- `case`: exact `testharness.js` subtest name
- `note`: required for deferred cases and normally empty for supported cases

Use `\\t`, `\\n`, `\\r`, and `\\\\` for literal tab, newline, carriage return, and backslash characters. Other escapes, malformed rows, duplicate `(path, case)` pairs, and noncanonical ordering fail validation.

The formatter sorts by path and case with locale-independent code-unit ordering and writes LF line endings with one final newline. The runner rejects an unformatted table and prints the formatter command.

During an enforced run:

- failed supported cases fail the command;
- failed deferred cases remain visible with their notes but do not fail it;
- passing deferred cases are printed as promotion candidates;
- missing or unlisted cases, harness errors, worker errors, and timeouts always fail.

The same schema can later be split mechanically into `dom.tsv`, `html.tsv`, `svg.tsv`, and similar files if one table becomes unwieldy.

## Initial limitations

The first version supports `testharness.js` HTML files, classic top-level scripts, static HTML/SVG markup, and absolute or relative in-repository script resources. It skips `testharnessreport.js` and captures completion programmatically.

It intentionally does not support `.window.js`, WebIDL preloading, modules, nested scripts or browsing contexts, reftests, crashtests, WPT server substitutions, navigation, or layout assertions. Add execution infrastructure only when a selected capability requires it; never patch a claimed DOM API in runner shims.
