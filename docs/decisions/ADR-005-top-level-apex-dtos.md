# ADR-005: Use top-level Apex DTOs and sObject rows at the service boundary

## Status

Accepted

## Date

2026-11-22

## Context

The V1 service contract needs a typed request, a typed response envelope, and a typed error. The initial design used Apex inner classes, but the official LWC Apex guide states that an Apex inner class used as a parameter or return value for an Apex method called by a Lightning web component is not supported. The same guide lists sObjects and collections of supported types as valid inputs and outputs.

## Decision

`DatatablePlusQueryRequest`, `DatatablePlusQueryResponse`, and `DatatablePlusQueryError` are top-level Apex classes in separate metadata files. The response `rows` value is a `List<SObject>` produced by `Database.query` or `Database.queryWithBinds`, not a map. Apex inner classes are not used at the LWC service boundary.

## Alternatives Considered

### Apex inner classes

- Pros: Keeps DTOs visually grouped with the service class.
- Cons: Not a supported parameter or return type for Apex methods called by an LWC.
- Rejected: Would make the documented contract fail at the platform boundary.

### Map-based rows

- Pros: Flexible arbitrary field names.
- Cons: Maps are not listed as a supported output collection type for LWC-callable Apex methods, and the LWC Apex guide warns that map values are not serialized when passed to Apex.
- Rejected: Adds serialization risk without a documented benefit over sObject rows.

## Consequences

- The service has four small Apex classes instead of one nested DTO file.
- Row field names in the client match the requested object fields because the rows are serialized sObjects.
- `Database.queryWithBinds` remains available for binding user-supplied search text safely.
- Any change back to nested DTOs requires a superseding ADR and a platform validation spike.

## Sources

- [Expose Apex Methods to Components](https://developer.salesforce.com/docs/platform/lwc/guide/apex-expose-method.html) — supported input/output types and the inner-class limitation.
- [Call Apex Methods Imperatively](https://developer.salesforce.com/docs/platform/lwc/guide/apex-call-imperative.html) — map serialization warning for LWC-to-Apex calls.
- [Dynamic SOQL](https://developer.salesforce.com/docs/platform/apex-dev/references/apex-dev/apex-dynamic-soql.html) — dynamic queries can return generic sObject data and use bind variables.
