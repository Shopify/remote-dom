# Remote DOM WPT runner

Private test infrastructure for running selected upstream Web Platform Tests against the workspace copy of `@remote-dom/polyfill`.

The runner downloads a pinned WPT archive, parses selected `testharness.js` HTML files in a browser control page, and executes their supported markup and scripts in a fresh module worker containing `new Window()` from the polyfill. It does not construct a Remote DOM host receiver; transport and host rendering are separate integration concerns.

## Commands

From the repository root:

```bash
# Prepare or reuse the pinned WPT source.
pnpm wpt:prepare

# Open the interactive runner and inspect original and generated source.
pnpm wpt:dev
```

Set `WPT_ROOT=/path/to/wpt` to use an existing checkout. The runner verifies `resources/testharness.js` and skips all downloads. Set `WPT_CACHE_DIR` to override the download cache.

The interactive page accepts a WPT path, runs it in a fresh worker, and displays the harness result, warnings, console output, original markup, harness source, and generated test source.

## Pinned source and cache

`wpt.lock.json` pins an immutable WPT revision and SHA-256 archive checksum. Pin updates must change and review both values.

The cache root resolves in this order:

1. `WPT_CACHE_DIR`
2. `<repo>/.cache/wpt` when `CI` is set
3. `${XDG_CACHE_HOME}/remote-dom/wpt`
4. `${HOME}/.cache/remote-dom/wpt`

Each revision installs under `<cache-root>/<revision>/source`, with the runner-owned completion marker beside `source` at the revision root. A revision-scoped process lock makes concurrent worktrees wait for one download and extraction, with abandoned-owner recovery and bounded waiting. Preparation uses a process-unique temporary revision that moves into place atomically. Old revisions are not deleted automatically.

WPT files are pinned but remain untrusted test inputs. The preparation script validates archive paths and checksums before extraction, and the browser server rejects traversal and escaping symlinks.

## Execution and isolation

The browser control page converts supported top-level markup and classic scripts into generated source. Every selected file runs in a fresh module worker and a fresh polyfill `Window`.

Runner responses travel over a private transferred `MessagePort`. The parent validates all response payloads and accepts only the first completion, error, timeout, or cancellation. Cleanup always closes the channel and terminates the worker.

The Vite server applies a worker-specific Content Security Policy that blocks network connections and nested workers while allowing the same-origin module loading and generated-code execution required by the runner. The control page keeps a separate policy so it can load prepared WPT resources.

## Initial limitations

This version supports selected `testharness.js` HTML files, parser-ordered classic top-level scripts executed in one shared function scope, static HTML/SVG markup, and absolute or relative in-repository script resources. It skips `testharnessreport.js` and captures completion programmatically.

Before running a file, verify that it does not require independent script-global declarations, per-script strictness, or continuation after intentional parse and runtime errors. Deferred areas include `.window.js`, WebIDL preloading, modules, nested scripts or browsing contexts, Window messaging, reftests, crashtests, WPT server substitutions, navigation, and layout assertions.
