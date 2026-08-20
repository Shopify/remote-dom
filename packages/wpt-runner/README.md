# Remote DOM WPT runner — input pipeline

Private test infrastructure for acquiring, validating, serving, and adapting upstream Web Platform Tests. This layer downloads a pinned WPT archive, validates it, publishes a contained checkout, serves prepared files with canonical path containment, and adapts supported top-level markup and classic scripts into generated source. It does not execute WPT code.

## Commands

From the repository root:

```bash
# Prepare or reuse the pinned WPT source.
pnpm wpt:prepare
```

Set `WPT_ROOT=/path/to/wpt` to use an existing checkout. The script verifies `resources/testharness.js` and skips all downloads. Set `WPT_CACHE_DIR` to override the download cache.

## Pinned source and cache

`wpt.lock.json` pins an immutable WPT revision and SHA-256 archive checksum. Pin updates must change and review both values.

The cache root resolves in this order:

1. `WPT_CACHE_DIR`
2. `<repo>/.cache/wpt` when `CI` is set
3. `${XDG_CACHE_HOME}/remote-dom/wpt`
4. `${HOME}/.cache/remote-dom/wpt`

Each revision installs under `<cache-root>/<revision>/source`, with the runner-owned completion marker beside `source` at the revision root. A revision-scoped process lock makes concurrent worktrees wait for one download and extraction, with abandoned-owner recovery and bounded waiting. Preparation still uses a process-unique temporary revision that moves into place atomically. Keeping the marker outside `source` leaves the extracted WPT checkout untouched. Old revisions are not deleted automatically.

WPT files are pinned but remain untrusted test inputs. The preparation script validates archive paths and checksums before extraction. Do not execute downloaded repository scripts outside the isolated runner.

## Serving and containment

The Vite server serves prepared WPT files through the `/__wpt-file` route and runner fixtures through the `/__runner__/` prefix. Every served path is resolved with canonical `realpath` containment against its served root, so traversal attempts and symlinks that escape the root are rejected. Missing files return an error without exposing an unchecked path. Served responses use ETag revalidation, so shared resources such as `testharness.js` avoid repeated response bodies on conditional requests. The server binds to a loopback host and restricts Vite filesystem access to the package, fixture, and WPT roots.

## Adaptation

The adapter parses selected `testharness.js` HTML files and generates source that preserves supported top-level HTML/SVG markup and classic-script order. Supported script resources are resolved in-repository and reconstructed in a shared function scope. This layer produces generated source only; it does not execute the generated source.

## Supported script-semantic limitations

The first version supports parser-ordered classic top-level scripts executed in one shared function scope, static HTML/SVG markup, and absolute or relative in-repository script resources. It skips `testharnessreport.js` and does not observe independent script-global declarations, per-script strictness, or continuation after intentional parse and runtime errors. Those HTML script-processing semantics remain deferred alongside `.window.js`, WebIDL preloading, modules, nested scripts or browsing contexts, Window messaging, reftests, crashtests, WPT server substitutions, navigation, and layout assertions.
