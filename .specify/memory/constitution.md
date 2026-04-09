<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0  (MINOR — Technology Constraints filled; Platform & Deployment
                                  sub-section added; TODO(TECH_STACK) resolved)

Modified principles : none
Added sections      : Technology Constraints > Platform & Deployment (new sub-section)
Removed sections    : none (TODO(TECH_STACK) placeholder removed and replaced)

Template audit
  ✅ .specify/templates/plan-template.md   — "Technical Context" block now has concrete values
                                             to reference. No structural change required.
  ✅ .specify/templates/spec-template.md   — Fully parametric. No update required.
  ✅ .specify/templates/tasks-template.md  — Fully parametric. No update required.
  ✅ .specify/templates/commands/          — Directory does not exist in this project.
  ✅ .specify/templates/agent-file-template.md — Parametric. No update required.

Deferred TODOs
  TODO(PROJECT_DOMAIN): Project purpose / domain is not yet documented. Update principles
    once the first feature spec is created.
-->

# beinge Constitution

## Core Principles

### I. Specification-First

Every feature MUST begin with a written specification (spec.md) reviewed and approved before
any implementation starts. Code written without a corresponding approved specification MUST NOT
be merged. Specifications are the single source of truth for acceptance criteria.

**Rationale**: Prevents scope creep, aligns stakeholders early, and provides a stable target
for tests and implementation alike.

### II. Test-First (NON-NEGOTIABLE)

Tests MUST be written and confirmed to fail before implementation begins (Red-Green-Refactor).
No implementation task is considered started until its corresponding failing tests exist.
All new public interfaces MUST have at least one contract or integration test.

**Rationale**: Enforces testable design, catches regressions early, and provides living
documentation of expected behaviour.

### III. Simplicity & YAGNI

The simplest solution that satisfies the current specification MUST be chosen. Abstractions,
generalisations, and configuration points MUST NOT be introduced speculatively. Complexity
that cannot be justified by an existing requirement MUST be removed before merge.

**Rationale**: Reduces maintenance burden and cognitive load; deferred complexity is cheaper
than premature complexity.

### IV. Observability

Every service boundary and significant internal operation MUST emit structured logs (key=value
or JSON) at an appropriate level. Error paths MUST log enough context to reproduce the
failure without attaching a debugger. Silent failures are not acceptable.

**Rationale**: Operational incidents require actionable signal; silent failures multiply
diagnosis time.

### V. Versioning & Breaking Changes

Public interfaces (APIs, CLIs, shared schemas) MUST follow Semantic Versioning
(MAJOR.MINOR.PATCH). Breaking changes MUST increment MAJOR and MUST include a documented
migration path. Deprecations MUST be signalled at least one MINOR release before removal.

**Rationale**: Consumers of public interfaces need predictable compatibility guarantees.

## Technology Constraints

### Stack

| Layer | Choice | Source |
|---|---|---|
| Runtime | **Bun** | https://bun.com |
| Backend framework | **Hono** | https://hono.dev |
| Frontend language | **HTML + CSS + JavaScript** (plain, no build step where possible) | — |
| Frontend components | **Lit** (web components, used where plain JS is insufficient) | https://lit.dev |
| Database | **PostgreSQL** | — |
| Authentication | **Clerk** (managed online service) | — |

**Frontend philosophy**: Plain HTML, CSS, and JavaScript MUST be the default choice for all
UI work. Lit MUST only be introduced when a piece of UI genuinely benefits from encapsulated
web-component semantics (reusability, scoped styles, lifecycle). Framework-level abstractions
(bundlers, transpilers, JSX, TypeScript) MUST NOT be added without explicit approval and a
justified requirement.

**Dependency policy**: New runtime dependencies MUST be discussed before introduction. Prefer
Bun built-ins and Web Platform APIs over third-party packages.

### Platform & Deployment

- **Server hosting**: Sliplane.io — the application server MUST be deployable as a single
  container on Sliplane.
- **Database hosting**: Sliplane.io PostgreSQL service — connection details MUST be injected
  via environment variables; no credentials in source code.
- **Authentication service**: Clerk — all authentication and session management MUST be
  delegated to Clerk; no custom auth implementation is permitted.
- **Environment parity**: Local development MUST mirror the Sliplane environment as closely
  as possible (same Bun version, same PostgreSQL major version, Clerk dev instance).

## Development Workflow

All work MUST follow the spec-kit lifecycle:

1. **Specify** (`/speckit-specify`) — produce spec.md; get approval.
2. **Plan** (`/speckit-plan`) — produce plan.md, research.md, data-model.md, contracts/.
3. **Tasks** (`/speckit-tasks`) — produce tasks.md; tasks MUST be story-aligned.
4. **Implement** (`/speckit-implement`) — execute tasks; run tests after each task group.
5. **Review** — all PRs MUST pass the Constitution Check gate in plan.md before merge.

Branch naming MUST follow the pattern `###-short-description` where `###` is the sequential
feature number. One feature per branch. Squash-merge is preferred to keep history readable.

## Governance

This constitution supersedes all other development practices in the beinge project.
Conflicting practices documented elsewhere MUST be updated to align.

**Amendment procedure**:
1. Open a pull request modifying `.specify/memory/constitution.md`.
2. State the principle(s) affected, the reason for change, and the semantic version bump type.
3. Obtain approval from at least one other contributor (or the project owner for solo projects).
4. Run `/speckit-constitution` after merge to propagate changes to dependent templates.

**Versioning policy** (for this document):
- MAJOR: Principle removed, renamed, or governance model restructured.
- MINOR: New principle or mandatory section added.
- PATCH: Clarification, wording improvement, or typo fix.

**Compliance review**: Every feature's plan.md MUST include a Constitution Check section
that is verified at Phase 0 start and again after Phase 1 design.

**Version**: 1.1.0 | **Ratified**: 2026-04-07 | **Last Amended**: 2026-04-07
