# Oduva Marga — Coding Standards

**Status:** Living document. Update it whenever tooling, lint config, or an
established naming/style convention changes in any module — not just at
creation time.

**Relationship to other docs:**
- [`.specify/memory/constitution.md`](.specify/memory/constitution.md) sets
  the non-negotiable *principles* (Principle V, "Code Quality &
  Consistency," is the main one this document serves, but Principles I, II,
  VI, and VII also constrain code shape). Where this document and the
  constitution disagree, the constitution wins — fix this document, don't
  work around it.
- This document is the concrete *how*: the actual tools, flags, and naming
  conventions in this repo today that satisfy those principles, verified
  against the real config files rather than assumed.
- [`Infrastructure/INFRASTRUCTURE_DECISIONS.md`](Infrastructure/INFRASTRUCTURE_DECISIONS.md)
  covers topology/deploy/container decisions, not code style — don't
  duplicate across the two.
- [`/CLAUDE.md`](CLAUDE.md) tells any Claude Code session working in this
  repo when to update this file.

**How to read this document:** it's organized by module (Java services,
Angular frontend, Expo mobile app), then cross-cutting conventions, then a
"Known Gaps" section that says outright where the constitution asks for
something the tooling doesn't enforce yet. That last section exists so this
document doesn't silently overstate what's actually enforced.

---

## Cross-cutting (all modules)

- **Encoding/line endings:** UTF-8. `oduva-marga-bff/.gitattributes` and
  `oduva-marga-service/.gitattributes` force `gradlew` to LF and `*.bat` to
  CRLF regardless of checkout platform; no repo-wide `.gitattributes` exists
  at the root.
- **Secrets:** never committed to source, per constitution Principle III —
  injected via environment variables (see `Infrastructure/.env.example`) or
  GitHub Actions Secrets (see `.github/workflows/deploy.yml`).
- **Comments:** explain *why*, not *what*, and only when the reasoning isn't
  obvious from the signature or the surrounding code (constitution
  Principle V). Don't add a comment a well-named function/variable already
  makes redundant.
- **Branch/PR naming:** the observed convention in this repo's history is
  `<github-username>/<type>/<short-description>` as the branch name (e.g.
  `chandanbsd/features/user-enrollment`), with GitHub appending the PR
  number to the merge commit title automatically. This is a documented
  observation of existing practice, not a mandate from the constitution —
  follow it for consistency with existing history.

## Java (`oduva-marga-bff`, `oduva-marga-service`)

- **Toolchain:** Java 25 via the Gradle toolchain block in each module's
  `build.gradle` (`JavaLanguageVersion.of(25)`). Spring Boot 4.1.0, Spring
  Dependency Management plugin 1.1.7. Build only through each module's own
  Gradle wrapper (`./gradlew`) — never a globally installed `gradle`, per
  `Infrastructure/INFRASTRUCTURE_DECISIONS.md` ID-009.
- **Dependency injection:** constructor injection only. Field-level
  `@Autowired` is not permitted (constitution Principle V).
- **Package structure:** package-by-feature, not package-by-layer. Current
  root packages are `com.oduvamarga.bff` (BFF) and `com.oduvamarga.core`
  (core service); both are still template-fidelity at the time of writing
  (see `Infrastructure/INFRASTRUCTURE_DECISIONS.md` ID-008) with only a
  handful of classes each, so the feature-package split hasn't yet been
  exercised in anger — apply it as soon as a second feature area is added,
  rather than letting a `configuration`/`controller`/`service` layer split
  take hold by default.
- **Controllers:** no business logic in controllers — they translate
  HTTP/DTOs and delegate; the BFF additionally must not own domain logic at
  all (constitution Principle II) and must not talk to the datastore
  directly.
- **Formatting:** 4-space indentation, standard Java brace style (opening
  brace on the same line), as used in the existing source (e.g.
  `SecurityFilterConfiguration.java`). No formatter (Spotless, google-java-format)
  is configured yet — see Known Gaps.
- **Naming:** standard Java conventions — `PascalCase` for classes,
  `camelCase` for methods/fields, `UPPER_SNAKE_CASE` for constants. Test
  classes use the `*Tests` suffix (`OduvaMargaBffApplicationTests`,
  `OduvaMargaApplicationTests`), matching Spring Initializr's default.
- **Testing:** JUnit 5 via `useJUnitPlatform()` in both `build.gradle`
  files; `spring-boot-starter-test` is the standard test dependency.
  Test-first is mandatory per constitution Principle I — a failing test
  precedes the implementation, not the other way around.

## Angular frontend (`oduva-mage-front-end`)

- **Style guide:** official Angular style guide, standalone components,
  `strict` TypeScript (constitution Principle V) — all already enabled in
  `tsconfig.json`: `strict`, `noImplicitOverride`,
  `noPropertyAccessFromIndexSignature`, `noImplicitReturns`,
  `noFallthroughCasesInSwitch`, plus `strictInjectionParameters`,
  `strictInputAccessModifiers`, and `strictTemplates` under
  `angularCompilerOptions`. Any use of `any` requires an inline comment
  justifying why strict typing isn't possible there.
- **Selectors:** component selectors are `app-` prefixed kebab-case
  elements; directive selectors are `app` prefixed camelCase attributes —
  enforced by `.eslintrc.json`'s `@angular-eslint/component-selector` and
  `@angular-eslint/directive-selector` rules.
- **Formatting:** 2-space indentation, single quotes in `.ts` files, final
  newline required, trailing whitespace trimmed — all from `.editorconfig`.
  No Prettier config exists; `.editorconfig` plus ESLint's built-in rules
  are the only enforced formatting today.
- **Linting:** `npm run lint` (`ng lint`) runs `eslint:recommended`,
  `@typescript-eslint/recommended`, `@angular-eslint/recommended`, and the
  Angular template accessibility ruleset against `.html` templates. A PR
  must not merge with lint failures (constitution Principle V) — see Known
  Gaps for the current CI enforcement status.
- **Testing:** Karma + Jasmine for unit tests (`npm run test`), Playwright
  for e2e specs under `e2e/*.spec.ts` (`npm run e2e`, which builds against
  the `mock` configuration first).
- **Layering:** the frontend calls only the BFF, never the core service
  directly, and holds no business logic beyond presentation/view-state
  (constitution Principle II).

## Mobile app (`oduva-marga-mobile-app/oduva-marga`, Expo / React Native)

- **Stack:** Expo SDK ~57, Expo Router (file-based routing under `src/app`),
  React 19.2.3, React Native 0.86.2, TypeScript ~6.0.3 with `strict: true`
  extending `expo/tsconfig.base`.
- **Read this first:** this module's own `AGENTS.md` (imported into its
  `CLAUDE.md` via `@AGENTS.md`) states Expo's APIs have changed and
  instructs reading the exact versioned docs at
  `https://docs.expo.dev/versions/v57.0.0/` before writing any code in this
  module. That instruction is authoritative for this module and isn't
  restated here — don't let this document's guidance substitute for it.
- **File naming:** kebab-case filenames throughout `src/` (e.g.
  `themed-text.tsx`, `use-color-scheme.ts`, `app-tabs.tsx`), not
  `PascalCase.tsx`. Follow this even though the exported component/hook
  itself is `PascalCase`/`camelCase` per normal React/TS convention.
- **Platform-specific code:** structural platform divergence is expressed
  with Expo/Metro's file-suffix convention (`.web.tsx`, `.web.ts`) — see
  `animated-icon.web.tsx`, `app-tabs.web.tsx`, `use-color-scheme.web.ts` —
  rather than runtime `Platform.OS` branching inside a single file, when the
  divergence is large enough to warrant a separate file.
- **Path aliases:** `@/*` resolves to `src/*` and `@/assets/*` to `assets/*`
  (see `tsconfig.json`'s `paths`) — use these instead of long relative
  `../../..` imports.
- **Linting:** `npm run lint` runs `expo lint`. There is no repo-local
  ESLint config file in this module (no `.eslintrc*` or `eslint.config.js`)
  — it relies entirely on Expo's bundled config, so linting behavior here
  tracks whatever the installed `expo` version ships, not a config checked
  into this repo.

## Known gaps vs. the constitution

Verified against the actual config files as of this writing — these are
gaps, not decisions, and are recorded here so this document doesn't imply
enforcement that doesn't exist:

- **No Java static analysis is configured.** Constitution Principle V
  requires Checkstyle/SpotBugs (or equivalent) as a CI gate for the BFF and
  core service; neither `build.gradle` has a Checkstyle, SpotBugs, or
  Spotless plugin block.
- **Lint is not wired into CI at all.** `.github/workflows/deploy.yml` only
  builds container images and deploys via `podman-compose` — it never runs
  `ng lint`, `expo lint`, `./gradlew test`, or any Java analysis. Today,
  lint/test only run when a developer runs them locally; the constitution's
  "no PR merges without passing CI lint/analysis/tests" requirement
  (Development Workflow & Quality Gates) is not yet enforced by tooling.
- **No TypeScript formatter is configured in either TS module.** The
  frontend has `.editorconfig` (2-space, single-quote `.ts`) but no
  Prettier config; the mobile app has neither `.editorconfig` nor a
  formatter — formatting there is whatever the author's editor defaults to.

Closing these gaps is implementation work, not a documentation change —
this section exists to track them, not to resolve them.

## Maintaining this document

Update this file in the same change that adds/changes a linter or formatter
config, introduces a new module, or establishes a naming/style convention
that isn't already covered above. If you fix one of the "Known Gaps" above,
move it out of that section into the relevant module section rather than
just deleting it — say what changed and why, the same append-don't-erase
principle `Infrastructure/INFRASTRUCTURE_DECISIONS.md` follows.
