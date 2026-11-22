# datatable-plus API — V1

Status: implemented — V1 contract

This document is the shipped contract. Consumers may rely on every field documented here.

## Apex service boundary

`DatatablePlusQueryService.query` accepts `DatatablePlusQueryRequest` and returns `DatatablePlusQueryResponse`. Validation failures are carried in `DatatablePlusQueryError`. All three are top-level Apex classes because LWC-callable Apex methods cannot use inner-class parameters or return values. Their serialized properties are `@AuraEnabled`, and `rows` is a `List<SObject>`. The method is read-only and uses `@AuraEnabled(cacheable=true)`.

## Component: `<c-datatable-plus>`

### Public properties

| Name            | Type     | Required | Default | Contract                                                                                                                        |
| --------------- | -------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `objectApiName` | `String` | yes      | —       | API name of the queried object. Must exist and be accessible to the user.                                                       |
| `columns`       | `Array`  | yes      | —       | Platform-compatible column definitions. Each item must include `fieldName` and `label`; requested fields come from `fieldName`. |
| `keyField`      | `String` | no       | `Id`    | Passed to the base datatable as its row key and included in requested fields.                                                   |
| `pageSize`      | `Number` | no       | `20`    | Clamped to `1..200`. Invalid values use the default.                                                                            |
| `searchFields`  | `Array`  | no       | `[]`    | Field API names searched by `searchTerm`. Empty disables search.                                                                |
| `title`         | `String` | no       | `''`    | Optional heading rendered above the controls.                                                                                   |

Properties are additive. Later versions may add optional properties but will not change these types or remove them.

### Public methods

| Name        | Contract                                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `refresh()` | Re-runs the current query with unchanged sort, page, and search state. Returns `undefined` and does not mutate those states. |

### Events

All events use a single `detail` object, bubble, and are composed.

| Name              | `detail` shape                                                                | When it fires                               |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------------------------- |
| `selectionchange` | `{selectedRows: Array, selectedRowKeys: Array}`                               | Selection changes or a query clears it.     |
| `datachange`      | `{rows: Array, totalItemCount: Number, pageNumber: Number, pageSize: Number}` | A query succeeds.                           |
| `error`           | `{errorCode: String, message: String}`                                        | A query fails, rejects, or has no response. |

Event names and detail fields are stable. Consumers should ignore unknown detail fields added later.

Selection is scoped to the current page. `selectedRowKeys` is derived from each selected row using `keyField`. A new query clears selection and emits `selectionchange` with empty arrays after `datachange` for a success or `error` for a failure. Sorting and search reset `pageNumber` to one; pagination preserves the current sort and search state. Each query has a request identity so a response from a superseded request cannot overwrite newer state.

### Rendering and states

On insertion, the shell requests page one with no sort or search term. Internal search and pagination controls render above the table; their events, platform datatable sort and selection events, and `refresh()` all feed the same query pipeline. The shell sets the platform datatable's loading state while the promise is pending, then passes the returned rows, columns, and key field to the renderer. Events are dispatched only after the loading flag is cleared. A successful response clears any prior error and emits `datachange`; an error response, a rejected Apex promise, or a missing response clears the rows, shows an inline `role="alert"` message, and emits `error` with the structured code and message. A persistent polite status region announces loading, loaded, and empty results; failures are announced only by the alert so messages are not duplicated.

The table's accessible label is `title` when supplied, otherwise `objectApiName`, otherwise `Records`. Array properties are supplied by a wrapping component; App Builder configuration exposes only the scalar properties `objectApiName`, `keyField`, `pageSize`, and `title`.

## Internal query-controls contract

`<c-query-controls>` is not exposed for external use. The shell owns all query state and sends these properties down:

| Property         | Type    | Default | Contract                                                       |
| ---------------- | ------- | ------- | -------------------------------------------------------------- |
| `pageNumber`     | Number  | `1`     | Current 1-based page, clamped to at least one.                 |
| `pageSize`       | Number  | `20`    | Rows per page, clamped to `1..200` for page calculations.      |
| `totalItemCount` | Number  | `0`     | Total rows reported by the last successful query.              |
| `searchTerm`     | String  | `''`    | Committed search text; also seeds the editable input value.    |
| `searchEnabled`  | Boolean | `false` | The input is disabled until the caller supplies search fields. |

The controls emit two internal events. They use one `detail` object and bubble to the immediate parent, but they do not cross the shadow boundary.

| Name            | `detail` shape         | When it fires                                                |
| --------------- | ---------------------- | ------------------------------------------------------------ |
| `searchrequest` | `{searchTerm: String}` | After a 300 ms debounce or an explicit commit such as Enter. |
| `pagerequest`   | `{pageNumber: Number}` | A first, previous, next, or last button is activated.        |

Search text is trimmed before it is emitted. A commit event's string value takes precedence; if it has none, the latest change value is used. Blank text is emitted as `''` so the shell can clear a previous search. Boundary buttons are disabled and ignore activations that cannot change the page.

## Service boundary

The Apex boundary is the static method `DatatablePlusQueryService.query(DatatablePlusQueryRequest request)`. It is annotated `@AuraEnabled(cacheable=true)` and is called imperatively from the component.

The request, response, and error types are top-level Apex classes: `DatatablePlusQueryRequest`, `DatatablePlusQueryResponse`, and `DatatablePlusQueryError`. Apex inner classes cannot be used as parameters or return values for methods called from an LWC, so V1 does not use them at this boundary. The response `rows` value is a list of sObject records whose field names match the requested fields; it is not a map.

Sources: [Expose Apex Methods to Components](https://developer.salesforce.com/docs/platform/lwc/guide/apex-expose-method.html) and [Call Apex Methods Imperatively](https://developer.salesforce.com/docs/platform/lwc/guide/apex-call-imperative.html), verified in [tooling.md](tooling.md).

## Query request

The component sends this shape to the Apex service:

```js
{
	objectApiName: 'Account',
	fields: ['Id', 'Name', 'Industry'],
	searchFields: ['Name'],
	searchTerm: 'acme',
	sortBy: 'Name',
	sortDirection: 'ASC',
	pageNumber: 1,
	pageSize: 20
}
```

`sortDirection` is `ASC`, `DESC`, or `null`. `pageNumber` is 1-based. The `fields` value is the ordered, de-duplicated union of `keyField` and the string `fieldName` of each valid column. The component builds this request with shared helpers that copy field arrays, normalize lower-case sort directions to upper-case, reject unknown directions as `null`, clamp `pageNumber` to at least 1, and clamp `pageSize` to `1..200`. Non-finite page values use the defaults from the public property table.

The Apex request DTO defaults are `''` for `objectApiName` and `searchTerm`, empty lists for `fields` and `searchFields`, `null` for `sortBy` and `sortDirection`, `1` for `pageNumber`, and `20` for `pageSize`.

## Query response

The Apex service always returns one envelope shape. `pageNumber` and `pageSize` echo sanitized request values, or the documented defaults when the request supplies invalid page values:

```js
{
	ok: true,
	rows: [{Id: '001...', Name: 'Acme'}],
	totalItemCount: 42,
	pageNumber: 1,
	pageSize: 20
}
```

On an expected failure:

```js
{
	ok: false,
	rows: [],
	totalItemCount: 0,
	pageNumber: 1,
	pageSize: 20,
	error: {
		errorCode: 'INVALID_SEARCH_FIELD',
		message: 'Name is not a searchable field for Account'
	}
}
```

### Error codes

| Code                   | Meaning                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `INVALID_INPUT`        | Required request values are missing, malformed, or out of range.            |
| `INVALID_OBJECT`       | Object API name does not exist or is not accessible.                        |
| `INVALID_FIELD`        | A requested field does not exist, is malformed, or is not accessible.       |
| `INVALID_SEARCH_FIELD` | A search field is malformed, unknown, inaccessible, or not text-searchable. |
| `QUERY_FAILED`         | SOQL execution failed unexpectedly.                                         |

Clients branch on `errorCode`; message text is diagnostic and is not part of the contract. Expected failures are returned in the envelope, not thrown as `AuraHandledException`. Unexpected Apex exceptions are caught by the service, logged, and converted to `QUERY_FAILED` with a generic message. Internal exception details never reach the client.

## Validation rules

- `objectApiName`, `fields`, `pageNumber`, and `pageSize` are required and checked again at the service boundary.
- `pageSize` is clamped to `1..200` at the component boundary and rejected outside that range at the service boundary.
- `pageNumber` is clamped to `>= 1` at the component boundary and rejected below one at the service boundary.
- The computed `OFFSET` cannot exceed 2,000 rows; requests beyond that bound receive `INVALID_INPUT`.
- Field API names in `fields` and `searchFields` are matched against the object describe before being placed in SOQL; relationship paths are rejected.
- Requested fields and the queried object must be accessible to the running user.
- Only `STRING`, `TEXTAREA`, `EMAIL`, `URL`, and `PHONE` fields may appear in `searchFields`.
- Non-blank `searchTerm` requires at least one `searchFields` entry; a null search list is valid when search text is blank.
- Search text is bound as a parameter. It is never concatenated into SOQL text, and the search filter applies to both rows and `totalItemCount`.
- `sortBy` and `sortDirection` are supplied together; the direction is `ASC` or `DESC`, sorting is applied only to a field present in `fields`, and the field must be sortable.

## Compatibility notes

- V1 queries one object. Relationship paths in `fieldName` are not supported.
- Selection is page-scoped. The component clears `selectedRows` and `selectedRowKeys` after each query result.
- The base datatable controls cell rendering; this component does not supply a custom cell renderer in V1.
