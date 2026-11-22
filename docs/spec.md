# Spec: datatable-plus V1

Status: approved — V1 scope confirmed

## Objective

Build `<c-datatable-plus>`, a reusable Lightning Web Component that renders records through the platform datatable and adds the agreed Core MVP capabilities:

- data loading from an Apex query service
- configurable columns
- column sorting
- pagination
- row selection
- search

The user is a Salesforce admin or developer placing the component on a record page, app page, or FlexiPage. Success means the component renders in the validation org, passes unit and Apex tests, remains accessible by keyboard, and exposes a stable public API that later versions can extend without breaking consumers.

## Assumptions

1. The platform datatable remains the renderer. We do not replace it with a custom table.
2. V1 data comes from a single object named by `objectApiName`; multi-object queries are deferred.
3. Columns are supplied by the caller as platform-compatible column definitions; no column-picker UI is included.
4. Search is opt-in through `searchFields`; the component does not guess which fields are searchable.
5. Selection is scoped to the current page and is cleared when the data is refreshed.
6. The validation org runs API version 68.0, matching `sfdx-project.json`.

These assumptions are approved for V1.

## Tech Stack

| Layer      | Choice                                      | Version/source                 |
| ---------- | ------------------------------------------- | ------------------------------ |
| Platform   | Salesforce Lightning Web Components         | API 68.0 (`sfdx-project.json`) |
| Renderer   | Platform datatable base component           | `lightning-datatable`          |
| Data       | Apex `@AuraEnabled(cacheable=true)` service | API 68.0                       |
| LWC tests  | `@salesforce/sfdx-lwc-jest`                 | 7.9.0 (`package.json`)         |
| Apex tests | Salesforce CLI Apex test runner             | `dtp-dev` validation org       |
| Formatting | Prettier with gofmt-inspired options        | 3.10.1 (`package.json`)        |

## Commands

```bash
npm install
npm run format
npm run format:check
npm run lint
npm run test:lwc
npm run test:lwc:coverage
npm run deploy
npm run deploy:validate
npm run test:apex
npm run verify
```

`npm run verify` is the task gate: formatter check, lint, LWC coverage, deploy validation, actual deploy, and Apex tests.

## Project Structure

```text
force-app/main/default/lwc/
  datatablePlusUtils/         shared pure helpers and unit tests
  datatablePlus/              <c-datatable-plus> shell, templates, and tests
  queryControls/              search and pagination controls and tests
force-app/main/default/classes/
  DatatablePlusQueryService.cls      Apex query service
  DatatablePlusQueryServiceTest.cls  Apex tests
  DatatablePlusQueryRequest.cls       top-level request DTO
  DatatablePlusQueryResponse.cls      top-level response envelope DTO
  DatatablePlusQueryError.cls         top-level error DTO
  DatatablePlusValidation.cls        existing input-validation helper
docs/
  capability-map.md           approved module boundaries and build order
  spec.md                     this document
  api.md                      public component and data-service contract
  decisions/                  architecture decision records
tasks/                      implementation plan and task checklist (after approval)
```

Tests live in `__tests__` folders beside LWC modules. Apex tests live beside Apex classes.

## Public API

See [api.md](api.md) for the full contract. Summary:

| Kind     | Name              | Default  | Purpose                                   |
| -------- | ----------------- | -------- | ----------------------------------------- |
| property | `objectApiName`   | required | Object whose records are queried          |
| property | `columns`         | required | Platform-compatible column definitions    |
| property | `keyField`        | `Id`     | Base datatable row key                    |
| property | `pageSize`        | `20`     | Rows requested per page                   |
| property | `searchFields`    | `[]`     | Fields included in search                 |
| property | `title`           | empty    | Optional heading above the table          |
| event    | `selectionchange` | —        | Current page selection changed            |
| event    | `datachange`      | —        | A query completed successfully            |
| event    | `error`           | —        | A query completed with a structured error |
| method   | `refresh()`       | —        | Re-run the current query                  |

All new properties are optional except the two required ones. All fields use camelCase. Events carry one `detail` object.

## Code Style

JavaScript, Apex, CSS, HTML, JSON, and Markdown are formatted with tabs, tab width 4, 100-column print width, single quotes, no trailing commas, and no bracket padding. JavaScript has no semicolons; Apex keeps required statement semicolons.

```js
import {normalizeRows} from 'c/datatablePlusUtils'

export function createQueryRequest(state) {
	return {
		objectApiName: state.objectApiName,
		pageNumber: state.pageNumber,
		pageSize: state.pageSize
	}
}
```

Apex classes use `with sharing` unless a documented reason requires `without sharing`.

## Testing Strategy

| Level         | Tool                         | Location                        | Expectation                                     |
| ------------- | ---------------------------- | ------------------------------- | ----------------------------------------------- |
| LWC unit      | `@salesforce/sfdx-lwc-jest`  | `**/lwc/**/__tests__/*.test.js` | 80% global threshold; test state and events     |
| Apex unit     | Salesforce CLI Apex runner   | `**/classes/*Test.cls`          | 75% org-wide floor; no `SeeAllData=true`        |
| Deploy        | `sf project deploy start`    | `npm run deploy:validate`       | Clean dry-run against `dtp-dev`                 |
| Accessibility | keyboard pass + markup check | manual task step                | Focus order, labels, and keyboard controls work |

Base component calls are asserted through the Jest stubs supplied by the test runner. No network calls are made in unit tests.

## Boundaries

- **Always:** validate Apex input at the service boundary; use the shared error envelope; keep commits small and verified; update README and docs in the same task.
- **Ask first:** add dependencies, change `CONSTRAINTS.md`, change the public API in a breaking way, use `without sharing`, or add a second object to the query.
- **Never:** put credentials in source, name third-party UI frameworks or libraries, remove failing tests to get green, skip the deploy gate, or implement a custom table renderer in V1.

## Success Criteria

- [ ] `<c-datatable-plus>` renders rows through the platform datatable in `dtp-dev`.
- [ ] `objectApiName`, `columns`, `keyField`, `pageSize`, `searchFields`, and `title` behave as documented in [api.md](api.md).
- [ ] Sorting emits a new query and the service applies the requested field and direction.
- [ ] Pagination exposes first, previous, next, and last controls and reports the correct total count.
- [ ] Search is debounced, validates search fields, and returns the structured error envelope for invalid input.
- [ ] Row selection emits `selectionchange` with the current page's rows and keys.
- [ ] `refresh()` re-runs the active query without changing its parameters.
- [ ] LWC coverage is at least 80% and Apex coverage is at least 75%.
- [ ] Deploy validation and Apex tests pass against `dtp-dev`.
- [ ] A keyboard pass confirms controls are reachable and labelled.
- [ ] README, docs index, API reference, ADRs, and capability map are updated before the implementation commit.

## Out of Scope (Deferred)

- Inline editing and row actions — adds write contracts and conflict handling.
- Grouping, column resizing, column picker, and drag-and-drop — custom interaction surfaces.
- Cross-page selection retention — needs an explicit identity and reconciliation model.
- Multi-object queries and relationship traversal — needs a query-builder contract.
- Offline or cached-write behavior — needs a sync strategy.

## Sources

All framework-specific patterns used by V1 were fetched through the in-app browser on 2026-11-22 and recorded with citations in [tooling.md](tooling.md). The recorded set covers the platform datatable component reference, the current wire-service guide, imperative and wired Apex method patterns, the `@AuraEnabled` annotation, dynamic SOQL and injection guidance, and the schema describe APIs. Automated HTTP retrieval from the documentation host returned HTTP 403 in this environment; the two `lwc.dev` guides were not reachable and are not used as sources. The old `data-wire.html` URL is replaced by `data-wire-service.html`.

The API 68.0 org was used to verify metadata deploy and retrieval behavior in Task 1.

## Resolved decisions

1. V1 uses imperative Apex calls, as recorded in [ADR-002](decisions/ADR-002-apex-query-service.md).
2. V1 selection is page-scoped, as recorded in [ADR-004](decisions/ADR-004-page-scoped-selection.md).
3. Invalid `searchFields` return the structured error envelope, as recorded in [ADR-003](decisions/ADR-003-structured-error-envelope.md).
