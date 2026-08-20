# Infrastructure modernization recommendations

This document captures the repository infrastructure audit as independently actionable recommendations. Each item has a stable identifier so it can be discussed, implemented, and closed separately.

## Status legend

- **Proposed**: ready for prioritization
- **Investigate**: requires an ownership or compatibility decision before implementation
- **In progress**: implementation has started elsewhere
- **Done**: implemented and verified

## Guidance reviewed

The audit considered current Shopify guidance for public repositories, npm Trusted Publishers, and first-party versus third-party GitHub Actions, together with each action's current owner documentation.

The resulting action-reference policy is nuanced:

- Treat third-party actions as dependencies and pin them to reviewed commit SHAs by default.
- For Shopify-owned actions, follow the action owner's documented supported rolling reference when central updates are part of its maintenance model.
- Follow a more specific platform guide when it deliberately requires a rolling reference. Current npm OIDC guidance is one such exception for `changesets/action@v1`.
- Keep Dependabot enabled for GitHub Actions so pinned third-party actions receive reviewable update PRs.

No blanket Shopify rule saying that all Shopify-owned actions must remain unpinned was found. The current first-party action documentation does, however, use rolling references.

## Current Shopify-owned action guidance

| Action                       | Repository usage | Current owner guidance                                                 | Finding                                                                                                                                                                                                                                               |
| ---------------------------- | ---------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Shopify/snapit`             | `@v0.1.0`        | `@main`, job-scoped `GITHUB_TOKEN`, npm OIDC, and explicit permissions | `v0.1.0` and `main` currently resolve to the same commit. Snapit validates commenter write/admin permission and rejects fork PRs before checking out PR code.                                                                                         |
| `Shopify/shopify-cla-action` | `@v1`            | `@v1` with `actions: write` and `pull-requests: write`                 | The reference matches owner guidance, but this repository lacks the documented explicit permissions. The action still declares the Node 16 action runtime and its rolling `v1` ref is behind `main`; confirm maintenance expectations with its owner. |

Snapit's metadata and implementation currently disagree about the command input: documentation declares `trigger_comment`, while the bundled implementation reads `comment_command`. This repository's existing `comment_command` works with the current implementation and should not be renamed until Snapit fixes or confirms the contract.

---

## Recommendations

### GitHub Actions, credentials, and release safety

#### INFRA-001 — Adopt an explicit GitHub Action reference policy

- **Status:** Proposed
- **Priority:** P0
- **Scope:** `.github/workflows/**`, `.github/dependabot.yml`
- **Recommendation:** Use owner-supported rolling refs for Shopify-owned actions, reviewed SHAs for third-party actions by default, and documented exceptions such as `changesets/action@v1` for npm OIDC.
- **Acceptance criteria:**
  - The reference policy is documented and applied to new or modified workflows.
  - Every non-SHA reference has a comment or documentation explaining why it is intentionally rolling.

#### INFRA-026 — Update and verify all GitHub Action versions

- **Status:** Proposed
- **Priority:** P1
- **Scope:** `.github/workflows/**`, including `.github/workflows/actions/prepare/action.yml`
- **Recommendation:** Inventory every external `uses:` reference and update all actions together to their current supported refs under INFRA-001's reference policy.
- **Target updates:**
  - Move `actions/checkout` and `actions/setup-node` from v4-era commits to their current v6 releases.
  - Move `pnpm/action-setup` from v3 to its current v4 release.
  - Move the old `changesets/action` v1.4.10 commit to the specifically recommended rolling `changesets/action@v1` OIDC path.
  - Verify `actions/upload-artifact`, the changelog reminder, `Shopify/shopify-cla-action`, and `Shopify/snapit` against their current owner guidance and update where needed.
- **Acceptance criteria:**
  - Every external action appears in a reviewed version inventory with its previous ref, new ref, ownership class, and release notes.
  - Runtime and breaking changes for each new major are addressed.
  - CI, CLA, changeset reminder, release PR creation, deploy, preview, and Snapit paths pass targeted validation.
  - GitHub Actions remain covered by Dependabot for subsequent reviewable updates.

#### INFRA-002 — Align Snapit with its supported authentication model

- **Status:** Proposed
- **Priority:** P0
- **Scope:** `.github/workflows/deploy.yml`
- **Recommendation:** Replace `SHOPIFY_GH_ACCESS_TOKEN` with the job-scoped `GITHUB_TOKEN` if a test snapshot confirms checkout, comments, and publication work. Add the documented `issues: write` permission and retain npm OIDC with provenance.
- **Notes:** Snapit already requires commenter `write` or `admin` permission and rejects fork PRs before checkout, dependency installation, build, or publish. A workflow-level author-association condition is optional defense-in-depth and runner-cost control, not the primary authorization gate.
- **Acceptance criteria:**
  - A same-repository PR snapshot can be requested by a writer/admin.
  - A read-only user and a fork PR cannot publish a snapshot.
  - No long-lived GitHub PAT is available to the Snapit job.
  - Published snapshots include npm provenance.

#### INFRA-003 — Resolve Snapit's documented-input mismatch

- **Status:** Investigate
- **Priority:** P1
- **Scope:** `Shopify/snapit`, `.github/workflows/deploy.yml`
- **Recommendation:** Report or fix the mismatch where action metadata documents `trigger_comment` but the implementation reads `comment_command`. Keep `comment_command` locally until a corrected Snapit release is verified.
- **Acceptance criteria:**
  - The upstream action has one documented and implemented input name.
  - Remote DOM uses the confirmed input.
  - A non-matching comment is a no-op and `/snapit` triggers exactly once.

#### INFRA-004 — Align CLA workflow permissions and behavior

- **Status:** Proposed
- **Priority:** P1
- **Scope:** `.github/workflows/cla.yml`
- **Recommendation:** Add the documented `actions: write` and `pull-requests: write` permissions, and verify the workflow still handles both PR updates and signed-comment reruns.
- **Acceptance criteria:**
  - Workflow permissions are explicit and no broader than the owner example.
  - A normal PR runs the CLA check.
  - A matching signed comment reruns the failed check.

#### INFRA-005 — Validate the Changesets npm OIDC path

- **Status:** Proposed
- **Priority:** P0
- **Scope:** `.github/workflows/changesets.yml`, `.github/workflows/deploy.yml`
- **Recommendation:** Validate version-PR creation, OIDC publication, tags, and GitHub releases against the current npm Trusted Publisher guidance.
- **Acceptance criteria:**
  - The version PR is created and updated correctly.
  - Publication uses OIDC with `id-token: write`, an empty `NPM_TOKEN`, and provenance.
  - No classic npm publishing token is required.
  - Expected npm versions, dist-tags, Git tags, and GitHub releases agree after publication.

#### INFRA-006 — Remove or replace long-lived GitHub PAT usage

- **Status:** Investigate
- **Priority:** P0
- **Scope:** `.github/workflows/changesets.yml`, `.github/workflows/deploy.yml`
- **Recommendation:** Inventory every use of `SHOPIFY_GH_ACCESS_TOKEN`. Prefer `GITHUB_TOKEN`; where bot-created PRs must trigger workflows, use a narrowly scoped, short-lived GitHub App token rather than a PAT.
- **Acceptance criteria:**
  - Each elevated-token use has a documented capability that `GITHUB_TOKEN` cannot provide.
  - Tokens are short-lived and minimally scoped.
  - Privileged checkout credentials are not persisted during dependency lifecycle scripts.

#### INFRA-007 — Declare least-privilege workflow permissions

- **Status:** Proposed
- **Priority:** P0
- **Scope:** `.github/workflows/*.yml`
- **Recommendation:** Add explicit workflow- or job-level `permissions` everywhere and use `persist-credentials: false` unless a later step demonstrably requires persisted Git credentials.
- **Acceptance criteria:**
  - Read-only checks have only `contents: read`.
  - Write and OIDC permissions exist only on the jobs that require them.
  - Fork PR checks receive no writable token or repository secrets.

#### INFRA-008 — Consolidate publishing and release tagging

- **Status:** Proposed
- **Priority:** P0
- **Scope:** `.github/workflows/changesets.yml`, `.github/workflows/deploy.yml`, `package.json`
- **Recommendation:** Give one protected workflow ownership of release build, package validation, npm publication, publication verification, Git tagging, and GitHub releases. Use one release-wide concurrency group and publish before tagging.
- **Acceptance criteria:**
  - A normal push to `main` cannot accidentally publish unchanged or manually versioned packages.
  - Only an intentional Changesets version release publishes.
  - Partial publication fails safely and does not create successful release tags.
  - The workflow verifies every expected package/version on npm before completing.

#### INFRA-009 — Retire or migrate the stale Shipit configuration

- **Status:** Investigate
- **Priority:** P0
- **Scope:** `shipit.production.yml`
- **Recommendation:** Confirm whether Shipit still owns any release behavior. Remove the file if retired; otherwise migrate it from Yarn to the repository's pinned pnpm version and ensure it cannot race GitHub Actions publication.
- **Acceptance criteria:**
  - Exactly one system owns npm publication.
  - No active path performs an unlocked Yarn install.
  - Required check names match the current CI jobs.

### Published package assurance

#### INFRA-010 — Validate builds and npm packages before merge

- **Status:** Proposed
- **Priority:** P0
- **Scope:** `.github/workflows/checks.yml`, `package.json`, `packages/*`
- **Recommendation:** Add a required PR job that runs a clean build, packs every public workspace, and validates the exact consumer artifacts with Publint and Are the Types Wrong.
- **Acceptance criteria:**
  - `pnpm build` runs on every PR.
  - All package tarballs pass Publint and declaration/export validation.
  - CI asserts expected tarball files and rejects missing build output.
  - Packed artifacts, not workspace source, are smoke-tested.

#### INFRA-011 — Add packed-package consumer fixtures

- **Status:** Proposed
- **Priority:** P1
- **Scope:** new consumer fixtures under the repository test infrastructure
- **Recommendation:** Install generated tarballs into clean fixtures and test ESM import, CommonJS require, TypeScript declarations, exported subpaths, and browser bundling.
- **Acceptance criteria:**
  - Every documented export is loaded from a packed tarball.
  - Internal `workspace:` ranges are rewritten correctly.
  - ESM, CJS, and declarations resolve without source aliases.
  - A representative browser bundle succeeds and tree-shaking metadata is checked.

#### INFRA-012 — Add explicit package file allowlists

- **Status:** Proposed
- **Priority:** P1
- **Scope:** `packages/*/package.json`
- **Recommendation:** Add reviewed `files` allowlists after INFRA-010 establishes tarball-content assertions.
- **Acceptance criteria:**
  - Packages contain build output, package metadata, README, license, and changelog as intended.
  - Tests, local configuration, and unrelated source files are excluded unless deliberately published.
  - Package sizes are recorded or bounded in CI.

### Runtime, tooling, and compatibility modernization

#### INFRA-013 — Upgrade the development runtime and package manager

- **Status:** In progress
- **Priority:** P1
- **Scope:** `.nvmrc`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, CI setup
- **Outcome:** Upgraded to Node 24.19.0, npm 11.17.0, pnpm 11.21.0, and Node 24 types. Updated Quilt Rollup and esbuild for Node 24 and Vite 8 compatibility, removed global npm installation, and enabled pnpm supply-chain protections.
- **Acceptance criteria:**
  - [x] Local setup and CI use Node 24.19.0 and the same integrity-pinned pnpm 11.21.0 release.
  - [x] Frozen-lockfile installation and pnpm supply-chain verification succeed against Shopify's proxy and npmjs.org.
  - [x] Lint, type checking, 174 unit tests, package builds, peer checks, and 13 CI-mode Playwright tests pass.
  - [x] Node's bundled npm exceeds the npm Trusted Publisher minimum without a global installation.
  - [ ] Deploy, preview, and Snapit npm OIDC publication are verified in GitHub Actions.

#### INFRA-014 — Land the Vite and Vitest modernization

- **Status:** Done
- **Priority:** P1
- **Scope:** PR [#615](https://github.com/Shopify/remote-dom/pull/615), Vitest/Vite configuration, `package.json`
- **Outcome:** Merged on 2026-08-20 as `5fb747f`, including the final Vitest-configuration hardening commit `97c0cd5`.
- **Completed acceptance criteria:**
  - [x] Unit, type, lint, CLA, changeset-reminder, and Playwright checks passed on the merged head.
  - [x] Tests use the new centralized `vitest.config.ts` configuration.
  - [x] Package-specific TypeScript settings preserve the required React and Preact behavior.
  - [x] The obsolete `vitest.workspace.js`, package-local Quilt Vite configs, and unused `@quilted/vite` dependency were removed.

#### INFRA-015 — Upgrade Playwright and expand browser coverage

- **Status:** Proposed
- **Priority:** P1
- **Scope:** `playwright.config.ts`, `.github/workflows/checks.yml`, `package.json`
- **Recommendation:** Upgrade Playwright, require Chromium on PRs, and add Firefox and WebKit on `main` or nightly before promoting them to required checks.
- **Acceptance criteria:**
  - DOM, custom-element, event, worker, and framework-adapter smoke tests run in all three engines.
  - Failures retain traces and reports.
  - Browser installation is reproducible and cached appropriately.

#### INFRA-016 — Define and test runtime and framework compatibility

- **Status:** Proposed
- **Priority:** P1
- **Scope:** `packages/*/package.json`, compatibility CI
- **Recommendation:** Decide the supported Node, React, Preact, signals, TypeScript, and browser ranges; test minimum and current versions from packed packages.
- **Acceptance criteria:**
  - EOL Node engine claims are removed in an appropriate semver release.
  - Every advertised peer range has a passing compatibility test.
  - React 19 support is either added and tested or explicitly documented as unsupported.
  - Browser targets and test coverage describe the same policy.

#### INFRA-017 — Upgrade the remaining build and example ecosystem

- **Status:** Proposed
- **Priority:** P2
- **Scope:** Rollup, Quilt build tooling, TypeScript, jsdom, React, Preact, Svelte, Vue, and example Vite plugins
- **Recommendation:** Upgrade related dependency families together after the runtime and test migrations. Evaluate TypeScript compiler upgrades separately because declaration output can change.
- **Acceptance criteria:**
  - No deprecated direct or avoidable transitive dependencies remain.
  - All examples build and run.
  - Package output and declaration diffs are reviewed intentionally.

### Quality and maintenance controls

#### INFRA-018 — Separate formatting from semantic linting

- **Status:** Proposed
- **Priority:** P2
- **Scope:** `package.json`, CI checks
- **Recommendation:** Rename the current Prettier-only `lint` behavior to a formatting check and add the repository-standard semantic TypeScript/JavaScript linter without duplicating compiler checks unnecessarily.
- **Acceptance criteria:**
  - Formatting and semantic lint failures are distinct.
  - CI catches unused, unsafe, or suspicious code patterns not covered by Prettier.
  - Local autofix commands are documented.

#### INFRA-019 — Add useful coverage reporting and thresholds

- **Status:** Proposed
- **Priority:** P2
- **Scope:** Vitest configuration and CI
- **Recommendation:** Add coverage reporting with conservative package-level thresholds, then increase thresholds around critical mutation, serialization, event, and adapter paths.
- **Acceptance criteria:**
  - CI publishes a readable coverage artifact or summary.
  - Thresholds prevent meaningful regressions without encouraging low-value tests.
  - Generated files and fixtures are excluded consistently.

#### INFRA-020 — Make CI commands explicit and remove redundant setup

- **Status:** Proposed
- **Priority:** P2
- **Scope:** `package.json`, `.github/workflows/actions/prepare/action.yml`, Playwright dependencies
- **Recommendation:** Add explicit `test:ci`/`test:watch` scripts, remove `pnpm prune` unless justified, and remove the duplicate direct `playwright` dependency if `@playwright/test` supplies all required APIs and binaries.
- **Acceptance criteria:**
  - CI never depends on implicit watch-mode detection.
  - A frozen install is the only dependency mutation in check jobs.
  - Local contributor commands remain simple and documented.

#### INFRA-021 — Improve dependency automation and vulnerability visibility

- **Status:** Proposed
- **Priority:** P2
- **Scope:** `.github/dependabot.yml`, package-proxy audit support
- **Recommendation:** Group related non-major updates, isolate toolchain/framework majors, reduce update noise, and restore a functioning vulnerability-audit path.
- **Acceptance criteria:**
  - Dependabot groups Vite/Vitest, framework, and build updates sensibly.
  - Major upgrades remain separately reviewable.
  - A documented audit command succeeds in CI or an equivalent repository alerting control is verified.

### Package contract and stewardship

#### INFRA-022 — Review the public package output contract

- **Status:** Investigate
- **Priority:** P3
- **Scope:** package Rollup configuration and `exports`
- **Recommendation:** After consumer fixtures exist, decide whether all current CJS, ESM, ESNext, `quilt:source`, and `typesVersions` paths remain necessary. Remove formats only through a deliberate major-version migration.
- **Acceptance criteria:**
  - Each published format and custom condition has a known consumer.
  - Duplicate or obsolete output is removed with migration notes.
  - Export maps remain compatible with supported Node, TypeScript, and bundlers.

#### INFRA-023 — Refresh contributor and repository stewardship documentation

- **Status:** Proposed
- **Priority:** P3
- **Scope:** `CONTRIBUTING.md`, `.github/`
- **Recommendation:** Update stale release instructions, document the changeset-only changelog flow, and consider adding `SECURITY.md` and `CODEOWNERS` if they match Shopify open-source ownership practices.
- **Acceptance criteria:**
  - Contributors are not asked to edit generated changelogs manually and add a changeset for the same change.
  - Supported setup, check, and release commands match CI.
  - Security reporting and infrastructure ownership paths are clear.

### Existing PR follow-through and standards coverage

#### INFRA-024 — Triage the stale infrastructure and dependency PR backlog

- **Status:** Proposed
- **Priority:** P1
- **Scope:** open pull requests and Dependabot configuration
- **Recommendation:** Land or rebase the useful coordinated upgrades, close superseded point upgrades, and recreate remaining updates against the chosen modern baseline.
- **Acceptance criteria:**
  - [x] PR #615 landed with the Vite 8/Vitest 4 migration.
  - [ ] PR #513 is closed as superseded by PR #615.
  - [ ] The old Vite, Rollup, TypeScript, Node types, Preact, and Quilt Threads Dependabot PRs are closed or recreated at current target versions.
  - [ ] PR #602 is rebased and evaluated as the React 19 compatibility implementation.
  - [ ] Useful tests from stale draft PR #463 are either ported to the current test architecture or deliberately declined.

#### INFRA-025 — Land and expand the Web Platform Test runner

- **Status:** In progress
- **Priority:** P1
- **Scope:** PR #617 and follow-up capability additions
- **Recommendation:** Land the pinned, checksummed WPT runner infrastructure and use its capability inventory to grow standards coverage for the worker-side DOM polyfill.
- **Acceptance criteria:**
  - PR #617 passes all required checks and merges with its archive-integrity and path-containment protections intact.
  - The capability inventory remains canonical and rejects missing or unlisted outcomes.
  - Follow-up PRs add focused upstream DOM, HTML, and SVG cases.
  - WPT coverage is treated as complementary to packed-package and cross-browser integration tests, not a replacement for them.

## Related pull request overlap

| Pull request                                           | Infrastructure value                                                                                                                | Recommended disposition                                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [#615](https://github.com/Shopify/remote-dom/pull/615) | Merged Vite 8/Vitest 4, centralized Vitest configuration, configuration hardening, and removal of package-local Quilt Vite configs. | Completed INFRA-014 on 2026-08-20; use it as the baseline and close superseded #513.   |
| [#617](https://github.com/Shopify/remote-dom/pull/617) | Adds pinned/checksummed WPT sources, a capability inventory, focused tests, caching, and a dedicated CI job.                        | Finish and land as INFRA-025; keep its scope distinct from cross-browser E2E.          |
| [#602](https://github.com/Shopify/remote-dom/pull/602) | Adds React 19 compatibility and updates React package metadata.                                                                     | Rebase and validate against packed artifacts as part of INFRA-016.                     |
| [#463](https://github.com/Shopify/remote-dom/pull/463) | Adds substantial polyfill unit coverage, but is a stale 2024 draft with package-local Vitest setup.                                 | Port valuable tests onto PR #615's centralized test configuration; do not merge as-is. |
| #435, #452, #486, #493, #504, #509, #510, #513, #515   | Old Dependabot point upgrades for Quilt Threads, Vite, Rollup, Preact, TypeScript, Vitest, and Node types.                          | Close as stale/superseded and recreate coordinated updates at current target versions. |

No open PR currently addresses the GitHub Action version refresh, release-workflow consolidation, PAT removal, explicit package validation, package file allowlists, semantic linting, or dependency-update grouping recommendations.

## Suggested execution order

1. INFRA-001 through INFRA-009 and INFRA-026: GitHub Actions, credentials, and release safety.
2. INFRA-010 through INFRA-012: published package assurance.
3. INFRA-013 through INFRA-017: runtime, tooling, and compatibility modernization; INFRA-014 is complete.
4. INFRA-024 through INFRA-025: existing PR follow-through and standards coverage.
5. INFRA-018 through INFRA-021: quality and maintenance controls.
6. INFRA-022 through INFRA-023: package contract and stewardship.

## Audit limitations

- The Shopify package proxy returned HTTP 405 for `pnpm audit`, so this audit does not claim the current dependency graph is vulnerability-free.
- Version observations and action guidance were checked on 2026-08-20 and should be revalidated when each recommendation is implemented.
