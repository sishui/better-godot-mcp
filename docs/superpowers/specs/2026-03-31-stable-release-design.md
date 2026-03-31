# Stable Release: better-godot-mcp

## Goal

Resolve all open issues/PRs/security, achieve >95% test coverage, pass full E2E testing with real Godot 4.6.1 binary, then release stable version via PSR.

## Current State

- Version: v1.9.1-beta.1 (stable: v1.9.0)
- Tests: 644 passing, coverage 97.23% stmts / 90.39% branch / 98.57% lines
- Weak: `headless.ts` at 77.27% lines (55-71 uncovered)
- Open: Issue #322 (relay, already dropped), PR #342 (regex optimize), PR #341 (deps update)
- Security: All alerts dismissed/fixed
- Stale: ~28 remote branches
- Relay: Already removed from code, cleanup artifacts remain

## Phase 1: Cleanup (parallel)

1. **Review & merge PR #342** — Bolt regex optimization in scene-parser.ts, CI PASS
2. **Review & merge PR #341** — Non-major deps update (biome 2.4.10, MCP SDK 1.29.0), CI PASS
3. **Close Issue #322** — Relay feature dropped for godot-mcp
4. **Relay artifact cleanup** — Remove Caddy route, relay pages in mcp-relay-core, Doppler BETTER_GODOT_MCP_DOMAIN, Infisical empty project
5. **Delete stale remote branches** — ~28 branches from bolt/jules/fix/renovate

## Phase 2: Code Quality

1. **Improve `headless.ts` coverage** — Lines 55-71 uncovered, target >95%
2. **Verify lint/check/test pass** — `bun run check` + `bun run test`
3. **Ensure all coverage thresholds >95%** — Stmts, Branch, Funcs, Lines

## Phase 3: E2E Testing

1. **Setup sample Godot 4.x project** with scenes, scripts, resources, tilemaps, shaders, audio, navigation, physics, UI, signals, animations, input maps
2. **Test all 17 tools** via MCP protocol (stdio client) with real Godot 4.6.1 binary
3. **Test all actions/modes** per tool — not just happy path
4. **Use `test-live-mcp.mjs`** as base, extend for full coverage

## Phase 4: Release

1. Verify CI green on main
2. Trigger PSR release (workflow_dispatch) — version auto-determined by conventional commits
3. Verify npm + Docker + GHCR publish success

## Success Criteria

- All issues closed, all PRs merged or closed with review
- Zero open security alerts
- Test coverage >95% across all metrics
- E2E test passes for all 17 tools with real Godot binary
- CI/CD pipeline green
- Stable version published to npm/Docker/GHCR
