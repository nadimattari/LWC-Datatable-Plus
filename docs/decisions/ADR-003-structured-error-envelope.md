# ADR-003: Use one structured error envelope

## Status

Accepted — implemented in V1

## Date

2026-11-22

## Context

Expected validation failures and unexpected query failures must be handled by the component in the same way. Throwing platform exceptions for expected input problems produces sanitized messages and inconsistent shapes in unit tests and clients.

## Decision

The Apex service returns `ok: true` or `ok: false` in the same envelope. Expected failures include a machine-readable `errorCode` and a safe message. Unexpected exceptions are caught by the service, logged, and converted to `QUERY_FAILED` with a generic client message.

## Alternatives Considered

### Throw `AuraHandledException` for every failure

- Pros: Familiar platform pattern.
- Cons: Message contents are sanitized in Apex tests and the client cannot rely on error codes.
- Rejected: Cannot support the documented error contract.

### Return `null` on failure

- Pros: Simple signature.
- Cons: Caller cannot distinguish failure modes or display a safe message.
- Rejected: Ambiguous contract.

## Consequences

- Consumers branch on `ok` before reading data.
- Tests assert `errorCode` instead of exception message text.
- Internal exception details stay on the server.

## Sources

- [Handle Errors from Apex](https://developer.salesforce.com/docs/platform/lwc/guide/apex-error-handling.html) — a wrapper class can define a custom error structure returned to the client.
