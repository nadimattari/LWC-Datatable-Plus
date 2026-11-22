# ADR-004: Scope selection to the current page in V1

## Status

Accepted

## Date

2026-11-22

## Context

The base datatable reports selected rows for the rows it currently renders. Preserving selection across pages would require tracking row identity, reconciling refreshed data, and defining behavior for deleted records.

## Decision

V1 selection is page-scoped. The component clears `selectedRows` and `selectedRowKeys` after each query result and emits `selectionchange` with the current page only.

## Alternatives Considered

### Retain selection across pages

- Pros: Better for bulk workflows spanning many pages.
- Cons: Requires an identity and reconciliation contract; ambiguous when rows change or disappear.
- Rejected for V1: Adds a second feature contract not in the agreed Core MVP.

### Do not expose selection at all

- Pros: Smaller API.
- Cons: Removes an explicitly requested Core MVP capability.
- Rejected: Out of scope with the approved V1 goal.

## Consequences

- Consumers must persist selection themselves if they need cross-page workflows.
- Pagination, search, and failed queries will clear selection after each query result.
- A later version can add opt-in cross-page selection additively.

## Sources

- [Platform datatable component reference](https://developer.salesforce.com/docs/platform/lightning-component-reference/guide/lightning-datatable.html?type=Develop) — `rowselection` returns the selected rows for the rows currently rendered, and `selected-rows` preselects rows by key.
