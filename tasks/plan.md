# Implementation Plan: datatable-plus V1

Source spec: [docs/spec.md](../docs/spec.md)

## Overview

Build the agreed Core MVP as thin vertical slices: first the shared contract and data helpers, then the Apex query service, then the UI controls and `<c-datatable-plus>` shell, and finally verification and release documentation. Each task leaves the project deployable and ends with the full `npm run verify` gate.

## Architecture Decisions

- The platform datatable remains the renderer; custom components own only data, controls, and state.
- The Apex service is called imperatively and returns one structured envelope for success and expected failure.
- Request and response shapes live in a shared JavaScript utility module and are mirrored in top-level Apex DTO classes; ADR-005 records why inner classes are not used.
- Public API changes are additive. Events carry one documented `detail` object.
- Every framework-specific pattern is cited from official documentation in `docs/tooling.md` before code is written in its task. Browser verification succeeded for all V1 references; unreachable references are marked unverified rather than used as sources.

## Task List

### Phase 1: Foundation

- [ ] Task 3: Record official API citations
    - Acceptance: `docs/tooling.md` lists each V1 reference with fetched status and the cited pattern; unreachable references are marked unverified and are not used as sources.
    - Verify: `npm run format:check`; documentation review.
    - Dependencies: none.
    - Files likely touched: `docs/tooling.md`, `docs/spec.md`, `docs/api.md`, `docs/decisions/*.md`.
    - Estimated scope: XS.

- [ ] Task 4: Build shared query request helpers
    - Acceptance: request creation, page-number clamping, and page-size clamping have tests; default and boundary values are covered.
    - Verify: `npm run lint`, `npm run test:lwc:coverage`, `npm run format:check`.
    - Dependencies: Task 3.
    - Files likely touched: `force-app/main/default/lwc/datatablePlusUtils/datatablePlusUtils.js`, `force-app/main/default/lwc/datatablePlusUtils/__tests__/datatablePlusUtils.test.js`.
    - Estimated scope: S.

### Phase 2: Data Service

- [ ] Task 5: Add Apex request validation and response envelope
    - Acceptance: top-level request, response, and error DTOs plus validation rules are implemented; invalid input returns `ok: false` with a documented error code.
    - Verify: `npm run deploy:validate`, `npm run test:apex`, `npm run format:check`.
    - Dependencies: Task 4 and ADR-005.
    - Files likely touched: `DatatablePlusQueryRequest.cls`, `DatatablePlusQueryResponse.cls`, `DatatablePlusQueryError.cls`, `DatatablePlusQueryService.cls`, `DatatablePlusQueryServiceTest.cls`.
    - Estimated scope: M.

- [ ] Task 6: Add Apex sorting, search, and pagination
    - Acceptance: fields are describe-validated before SOQL construction; search text is bound as a parameter; sort direction is constrained; pagination returns correct rows and total count.
    - Verify: `npm run deploy:validate`, `npm run test:apex`, `npm run format:check`.
    - Dependencies: Task 5.
    - Files likely touched: `DatatablePlusQueryService.cls`, `DatatablePlusQueryServiceTest.cls`.
    - Estimated scope: M.

### Checkpoint: Data Service

- [ ] Apex tests pass with at least 75% coverage.
- [ ] Deploy validation passes against `dtp-dev`.
- [ ] `docs/api.md` still matches the implemented request and response shapes.

### Phase 3: User Interface

- [ ] Task 7: Build query controls
    - Acceptance: search input emits a debounced search request; first, previous, next, and last controls emit page requests; controls are labelled and keyboard reachable.
    - Verify: `npm run lint`, `npm run test:lwc:coverage`, `npm run format:check`.
    - Dependencies: Task 4.
    - Files likely touched: `queryControls/queryControls.html`, `.js`, `.css`, `.js-meta.xml`, `__tests__/queryControls.test.js`.
    - Estimated scope: M.

- [ ] Task 8: Render rows and load data in the shell
    - Acceptance: `<c-datatable-plus>` exposes documented public properties, calls the Apex service, renders rows through the platform datatable, and shows loading and error states.
    - Verify: `npm run lint`, `npm run test:lwc:coverage`, `npm run deploy:validate`, `npm run format:check`.
    - Dependencies: Tasks 6 and 7.
    - Files likely touched: `datatablePlus/datatablePlus.html`, `.js`, `.css`, `.js-meta.xml`, `__tests__/datatablePlus.test.js`.
    - Estimated scope: M.

- [ ] Task 9: Wire sorting, pagination, search, selection, and refresh
    - Acceptance: base sort and selection events update state and emit documented events; query-control events trigger new requests; `refresh()` reuses the active request.
    - Verify: `npm run lint`, `npm run test:lwc:coverage`, `npm run format:check`.
    - Dependencies: Task 8.
    - Files likely touched: `datatablePlus/datatablePlus.js`, `__tests__/datatablePlus.test.js`.
    - Estimated scope: M.

### Checkpoint: Core UI Flow

- [ ] LWC tests pass with at least 80% coverage.
- [ ] All public properties, events, and `refresh()` are covered by tests.
- [ ] A manual org or Jest-rendered keyboard pass confirms labelled, reachable controls.

### Phase 4: Verification and Release

- [ ] Task 10: Complete V1 verification and documentation
    - Acceptance: full gate passes; README, docs index, API reference, ADR statuses, and capability map reflect the shipped V1; review findings are resolved; one descriptive commit is pushed.
    - Verify: `npm run verify`, five-axis review, secret and naming scans.
    - Dependencies: Task 9.
    - Files likely touched: `README.md`, `docs/README.md`, `docs/spec.md`, `docs/api.md`, `docs/decisions/*.md`, `docs/capability-map.md`.
    - Estimated scope: S.

### Checkpoint: Complete

- [ ] All V1 success criteria in `docs/spec.md` are met.
- [ ] Main is deployable and the Task 10 commit is pushed.

## Risks and Mitigations

| Risk                                                  | Impact | Mitigation                                                                                          |
| ----------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| Official documentation changes or becomes unreachable | Medium | Re-fetch before the affected task; update `docs/tooling.md` and validate behavior against API 68.0. |
| SOQL injection through field names                    | High   | Describe-validate every field and bind all search text as a parameter.                              |
| Base component event payload mismatch                 | Medium | Assert payloads in Jest stubs and verify in the validation org.                                     |
| Selection clearing surprises consumers                | Medium | Document page-scoped behavior in `docs/api.md` and ADR-004.                                         |
| Global coverage drops as modules are added            | Medium | Add tests in the same slice as each module; enforce 80% in Jest.                                    |

## Approval Required

- Approve this plan, including ADR-005's top-level Apex DTO shape, before implementation starts.
