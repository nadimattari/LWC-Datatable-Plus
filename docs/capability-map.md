# Capability Map: datatable-plus V1

Status: implemented — V1 module boundaries

| Module id          | Responsibility                                                                   | Depends on                         |
| ------------------ | -------------------------------------------------------------------------------- | ---------------------------------- |
| data-contract      | Shared request, response, error, property, event, and top-level Apex DTO shapes  | —                                  |
| apex-query-service | Field validation, SOQL construction, sorting, searching, and pagination          | data-contract                      |
| query-controls     | Search input and pagination controls that emit query-change requests             | data-contract                      |
| datatable-shell    | `<c-datatable-plus>` public API, state, base rendering, and selection forwarding | apex-query-service, query-controls |
| verification       | Unit tests, Apex tests, deploy validation, accessibility pass, and docs updates  | all product modules                |

Build order: `data-contract` → `apex-query-service` and `query-controls` → `datatable-shell` → `verification`.

Dependency direction is one-way. `query-controls` never imports from `datatable-shell`; it emits a request through the shared contract. `datatable-shell` owns all state and orchestration.

V1 delivery: every module in this map is implemented. The shell wires controls, sorting, selection, refresh, and stale-response guarding through the Apex service. Verification results and the restricted-user gap are recorded in [tooling.md](tooling.md#v1-verification).

## V1 boundary

Only the capabilities in this map are in V1. Advanced editing, grouping, column resizing, column-picker UI, drag-and-drop, and multi-object queries are deferred to a later version.
