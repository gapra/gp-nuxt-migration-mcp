# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2026-04-29

### Changed
- Code generation templates now use Nuxt 3/4 built-in `$fetch` instead of native `fetch()` — aligns with Nuxt best practices and removes false-positive network access detection by supply chain security scanners
- Add `CHANGELOG.md` to published npm package files

## [1.2.0] - 2026-04-29

### Fixed
- Remove native `fetch()` calls from code generation templates — replaced with Nuxt 3/4 built-in `$fetch` to eliminate false-positive network access detection by supply chain security scanners

## [1.1.0] - 2026-04-29

### Fixed
- Extract inline `postbuild` script to `scripts/add-shebang.js` to remove obfuscated-looking code pattern that triggered AI-detected security risk
- Add `.gitignore`
- Add `.env.example` for easier configuration setup

## [1.0.2] - 2026-04-28

### Changed
- Update npm keywords and package description for better discoverability

## [1.0.1] - 2026-04-28

### Added
- Tailwind CSS support in design system migration agent
- Nuxt 4 / ESM / `asyncData` migration patterns
- npm version, downloads, and license badges in README

### Changed
- Rename package to `@gapra/nuxt-migration-mcp`
- Setup npm publishing configuration

## [1.0.0] - 2026-04-24

### Added
- Initial release
- MCP server with specialized orchestrator, analysis, and generator agents
- Audit tools: Options API, Vuex, `asyncData`, ESM compatibility, tracking/feature flags
- Code generators: Pinia stores, composables, Vue components, API functions, TypeScript types
- Nuxt 2 → Nuxt 3/4 migration workflow
