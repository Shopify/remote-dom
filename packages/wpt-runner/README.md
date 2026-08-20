# Remote DOM WPT runner — input preparation

Private test infrastructure for acquiring and validating upstream Web Platform Tests. This layer downloads a pinned WPT archive, validates it, and publishes a contained checkout for later serving and adaptation. It does not execute WPT code.

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
