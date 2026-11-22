# ADR-002: Use an Apex query service with imperative calls

## Status

Accepted — implemented in V1

## Date

2026-11-22

## Context

V1 must load records with sorting, search, and pagination. The component needs explicit control over request state and consistent handling of expected errors. Declarative wire adapters are optimized for reactive reads, but V1 requests combine several user-driven inputs and need a single error envelope.

## Decision

Implement one `@AuraEnabled(cacheable=true)` Apex query service and call it imperatively from `<c-datatable-plus>`. The service accepts a typed request and returns the response envelope documented in [api.md](../api.md).

## Alternatives Considered

### Declarative wire adapters

- Pros: Built-in reactive refresh and caching.
- Cons: Error shapes are harder to normalize across validation and query failures; request sequencing is less explicit.
- Rejected for V1: The imperative contract is easier to test and keeps error semantics consistent.

### Client-side SOQL through Lightning Data Service

- Pros: No custom Apex.
- Cons: Does not support the required arbitrary object plus field-list query shape with pagination and search validation.
- Rejected: Insufficient for the agreed Core MVP.

## Consequences

- Apex code owns field validation and SOQL construction.
- The component owns loading, error, and request state.
- The query service owns validation and returns expected failures in the documented envelope; `DatatablePlusValidation` remains a standalone helper.
- A future declarative approach must be recorded in a superseding ADR.

## Sources

- [Call Apex Methods](https://developer.salesforce.com/docs/platform/lwc/guide/apex.html)
- [Call Apex Methods Imperatively](https://developer.salesforce.com/docs/platform/lwc/guide/apex-call-imperative.html)
- [Use the Wire Service to Get Data](https://developer.salesforce.com/docs/platform/lwc/guide/data-wire-service.html)
