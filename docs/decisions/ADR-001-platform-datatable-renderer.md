# ADR-001: Use the platform datatable as the rendering core

## Status

Accepted — implemented in V1

## Date

2026-11-22

## Context

The product must provide a feature-rich table while remaining a maintainable Salesforce platform component. Building a table from raw markup would duplicate platform behavior for sorting headers, cell formatting, keyboard navigation, and accessibility.

## Decision

`<c-datatable-plus>` delegates row rendering to the platform datatable. Custom LWC layers only manage data requests, search, pagination, selection forwarding, and public API state.

## Alternatives Considered

### Custom table markup

- Pros: Complete control over every cell and interaction.
- Cons: Reimplements platform accessibility and rendering behavior; large maintenance surface.
- Rejected: Duplicates platform capabilities and increases regression risk.

### Copy the base component source

- Pros: Could be modified directly.
- Cons: Forks platform code that cannot be maintained or upgraded cleanly.
- Rejected: Creates a long-lived fork with no supported upgrade path.

## Consequences

- V1 capabilities are limited to what the base component exposes through properties and events.
- The wrapper must forward base events rather than intercept cell rendering.
- Any future custom renderer requires a new ADR that supersedes this one.

## Sources

- [Platform datatable component reference](https://developer.salesforce.com/docs/platform/lightning-component-reference/guide/lightning-datatable.html?type=Develop) — the base component provides column formatting, row selection, sorting events, keyboard navigation, and accessibility attributes.
