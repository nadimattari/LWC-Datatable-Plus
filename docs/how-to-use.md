# Datatable Plus

Status: V1 usage guide

Displays Apex-backed records in tabular format with sorting, search, pagination,
page-scoped selection, and a public refresh method.

- One object per component instance, queried through Apex with user-mode access
- Platform column definitions supplied by a wrapper component
- Debounced search over supported text fields
- Sortable columns and paged Apex queries
- Page-scoped selection with an event payload of rows and keys
- Structured errors plus accessible loading, empty, and error states

## Contents

- [Usage](#usage)
- [Examples](#examples)
    - [Basic](#basic)
    - [Search](#search)
    - [Sorting](#sorting)
    - [Pagination](#pagination)
    - [Selection](#selection)
    - [Refresh](#refresh)
- [API](#api)
    - [Properties](#properties)
    - [Events](#events)
    - [Methods](#methods)
- [Accessibility](#accessibility)
    - [Screen reader](#screen-reader)
    - [Keyboard support](#keyboard-support)
- [Error codes](#error-codes)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

## Usage

`<c-datatable-plus>` owns query state and data loading. To place it on a Lightning page,
create a wrapper that supplies the `columns` and `searchFields` arrays; App Builder
configures only the scalar properties `objectApiName`, `keyField`, `pageSize`, and
`title`. The running user needs access to the object, fields, and records returned by
sharing.

## Examples

### Basic

A wrapper supplies an Account column set, a search field list, and event handlers. The
component loads page one when the wrapper is inserted.

```js
// accountExplorer.js
import {LightningElement} from 'lwc'

const COLUMNS = [
	{label: 'Account Name', fieldName: 'Name', type: 'text', sortable: true},
	{label: 'Industry', fieldName: 'Industry', type: 'text', sortable: true},
	{label: 'Billing City', fieldName: 'BillingCity', type: 'text', sortable: true}
]

const SEARCH_FIELDS = ['Name', 'BillingCity']

export default class AccountExplorer extends LightningElement {
	columns = COLUMNS
	searchFields = SEARCH_FIELDS
	pageSize = 20
	selectedRowKeys = []
	statusMessage = ''
	errorMessage = ''

	get selectedCount() {
		return this.selectedRowKeys.length
	}

	handleDataChange(event) {
		const {pageNumber, pageSize, totalItemCount} = event.detail

		this.errorMessage = ''
		this.statusMessage = `Page ${pageNumber} shows ${pageSize} of ${totalItemCount} records.`
	}

	handleSelectionChange(event) {
		this.selectedRowKeys = event.detail.selectedRowKeys
	}

	handleQueryError(event) {
		this.errorMessage = event.detail.message
		this.statusMessage = ''
	}

	handleRefresh() {
		const table = this.refs.accountsTable

		if (table) {
			table.refresh()
		}
	}
}
```

```lwc
<!-- accountExplorer.html -->
<template>
	<lightning-card title="Account explorer">
		<div class="slds-p-around_medium">
			<lightning-button label="Refresh" onclick={handleRefresh}></lightning-button>

			<p lwc:if={statusMessage} class="slds-m-top_small">{statusMessage}</p>
			<p lwc:if={selectedCount} class="slds-m-top_small">Selected rows: {selectedCount}</p>
			<p lwc:if={errorMessage} class="slds-m-top_small slds-text-color_error">
				{errorMessage}
			</p>

			<c-datatable-plus
				lwc:ref="accountsTable"
				object-api-name="Account"
				columns={columns}
				key-field="Id"
				page-size={pageSize}
				search-fields={searchFields}
				title="Accounts"
				ondatachange={handleDataChange}
				onselectionchange={handleSelectionChange}
				onerror={handleQueryError}
			></c-datatable-plus>
		</div>
	</lightning-card>
</template>
```

```xml
<!-- accountExplorer.js-meta.xml -->
<?xml version="1.0" encoding="UTF-8" ?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
	<apiVersion>68.0</apiVersion>
	<isExposed>true</isExposed>
	<masterLabel>Account Explorer</masterLabel>
	<description>Account example wrapper for datatable-plus.</description>
	<targets>
		<target>lightning__AppPage</target>
		<target>lightning__HomePage</target>
		<target>lightning__RecordPage</target>
	</targets>
</LightningComponentBundle>
```

Deploy the wrapper with `force-app`, then add **Account Explorer** to an app, home, or
record page.

### Search

Search is enabled when `searchFields` contains at least one supported text field:
`STRING`, `TEXTAREA`, `EMAIL`, `URL`, or `PHONE`. With no fields, the input is disabled.

```js
const SEARCH_FIELDS = ['Name', 'BillingCity']
```

Search waits for 300 ms of inactivity or an explicit commit such as Enter. Text is
trimmed, blank text clears a previous search, and every committed search returns to
page one.

### Sorting

Set `sortable: true` on each column that may be sorted. The field must also be
sortable in the object describe and included in the requested fields.

```js
const COLUMNS = [
	{label: 'Account Name', fieldName: 'Name', type: 'text', sortable: true},
	{label: 'Industry', fieldName: 'Industry', type: 'text', sortable: true}
]
```

A sort event with `ASC` or `DESC` applies that direction and resets the page to one. A
sort event without either direction clears both `sortBy` and `sortDirection` and also
resets the page.

### Pagination

`pageSize` is clamped to `1..200`. First, previous, next, and last controls are disabled
at page boundaries. Pagination preserves the current sort and search state.

```js
export default class AccountExplorer extends LightningElement {
	pageSize = 20
}
```

### Selection

Selection is scoped to the current page. `selectedRowKeys` is derived from each
selected row using `keyField`.

```js
handleSelectionChange(event) {
	this.selectedRowKeys = event.detail.selectedRowKeys
}
```

Every query result clears selection and emits `selectionchange` with empty arrays. This
happens after `datachange` for a success and after `error` for a failure.

### Refresh

Use `lwc:ref` on `<c-datatable-plus>` so the wrapper can call the public method without
querying the DOM.

```lwc
<c-datatable-plus lwc:ref="accountsTable" object-api-name="Account" columns={columns}>
</c-datatable-plus>
```

```js
handleRefresh() {
	const table = this.refs.accountsTable

	if (table) {
		table.refresh()
	}
}
```

Call this after the wrapper has rendered, such as from a button click. `refresh()`
re-runs the current query with unchanged sort, page, and search state and returns
`undefined`.

## API

### Properties

| Name            | Type   | Required | Default | Description                                                        |
| --------------- | ------ | -------- | ------- | ------------------------------------------------------------------ |
| `objectApiName` | String | yes      | —       | API name of the queried object.                                    |
| `columns`       | Array  | yes      | —       | Platform column definitions supplied by a wrapper.                 |
| `keyField`      | String | no       | `Id`    | Row key and an automatically requested field.                      |
| `pageSize`      | Number | no       | `20`    | Clamped to `1..200`.                                               |
| `searchFields`  | Array  | no       | `[]`    | Text field API names. Empty disables search.                       |
| `title`         | String | no       | `''`    | Heading and accessible table label. Falls back to the object name. |

### Events

| Event             | Detail                                         | Fires when                                  |
| ----------------- | ---------------------------------------------- | ------------------------------------------- |
| `datachange`      | `{rows, totalItemCount, pageNumber, pageSize}` | A query succeeds.                           |
| `selectionchange` | `{selectedRows, selectedRowKeys}`              | Selection changes or a query clears it.     |
| `error`           | `{errorCode, message}`                         | A query fails, rejects, or has no response. |

All events bubble and are composed. `errorCode` is part of the contract; `message` is
diagnostic text.

### Methods

| Name        | Returns     | Description                                                      |
| ----------- | ----------- | ---------------------------------------------------------------- |
| `refresh()` | `undefined` | Re-runs the current query with unchanged sort, page, and search. |

## Accessibility

### Screen reader

The table label comes from `title`, then `objectApiName`, then `Records`. A polite
status region announces loading, loaded, and empty results; failures use an alert so
messages are not repeated. Search and pagination controls use labelled platform
buttons, and boundary buttons are disabled when they cannot change the page.

### Keyboard support

| Key     | Function                                                       |
| ------- | -------------------------------------------------------------- |
| `Tab`   | Moves through the search input, pagination buttons, and table. |
| `Enter` | Commits the search term or activates the focused button.       |
| `Space` | Activates the focused pagination button.                       |

Keyboard behavior inside the rendered table is supplied by the platform table
renderer. V1 does not add a custom keyboard model.

## Error codes

| Code                   | Meaning                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `INVALID_INPUT`        | Required request values are missing, malformed, or out of range.            |
| `INVALID_OBJECT`       | Object API name does not exist or is not accessible.                        |
| `INVALID_FIELD`        | A requested field does not exist, is malformed, or is not accessible.       |
| `INVALID_SEARCH_FIELD` | A search field is malformed, unknown, inaccessible, or not text-searchable. |
| `QUERY_FAILED`         | SOQL execution failed unexpectedly.                                         |

## Troubleshooting

| Symptom                         | Check                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| No columns appear               | The wrapper must pass a non-empty `columns` array with valid `fieldName` and `label`.        |
| Column headers do not sort      | Add `sortable: true` to the column and confirm the field is sortable in the object describe. |
| Search input is disabled        | Supply at least one text field in `searchFields`.                                            |
| `INVALID_FIELD`                 | A `columns[].fieldName` or `keyField` does not exist, is inaccessible, or is a relationship. |
| `INVALID_SEARCH_FIELD`          | A `searchFields` entry is unknown, inaccessible, or not a supported text field.              |
| `INVALID_OBJECT`                | The object API name does not exist or is not accessible to the running user.                 |
| `INVALID_INPUT` near deep pages | V1 cannot offset beyond 2,000 rows. Narrow the search or change the sort.                    |
| Selection disappears            | Expected after sort, search, pagination, refresh, or any other query result.                 |
| `refresh()` does nothing        | Confirm `lwc:ref` is set on `<c-datatable-plus>` and call it after the wrapper has rendered. |

## Resources

- [API contract](api.md) — shipped field-level contract and request/response shapes
- [V1 spec](spec.md) — scope and acceptance criteria
- [Decision records](decisions/) — query, error, and selection rationale
